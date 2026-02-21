'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthenticatedUser(): Promise<
  { error: 'Unauthorized' } | { userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) return { error: 'Unauthorized' as const }
  return { userId: claims.sub as string, supabase }
}

async function verifyAdmin(): Promise<{ error: string } | { userId: string }> {
  const auth = await getAuthenticatedUser()
  if ('error' in auth) return { error: auth.error }

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .single()

  if (profile?.role !== 'admin') return { error: 'Unauthorized' }
  return { userId: auth.userId }
}

// ---------------------------------------------------------------------------
// createRentalPaymentIntent
// ---------------------------------------------------------------------------

/**
 * Create a Stripe PaymentIntent for the rental charge (automatic capture).
 * Updates the booking row with the PaymentIntent ID.
 */
export async function createRentalPaymentIntent(
  bookingId: string,
  amountAed: number,
  guestUserId?: string | null
): Promise<{ clientSecret: string } | { error: string }> {
  let userId = guestUserId ?? null

  if (!userId) {
    const auth = await getAuthenticatedUser()
    if ('error' in auth) return { error: auth.error }
    userId = auth.userId
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountAed * 100), // AED → fils
      currency: 'aed',
      capture_method: 'automatic',
      metadata: {
        booking_id: bookingId,
        user_id: userId ?? 'guest',
        type: 'rental',
      },
    })

    // Persist the PaymentIntent ID on the booking
    const admin = createAdminClient()
    const updateQuery = admin
      .from('bookings')
      .update({ stripe_rental_pi_id: paymentIntent.id })
      .eq('id', bookingId)

    // For authenticated users, add ownership check
    if (userId && userId !== 'guest') {
      updateQuery.eq('user_id', userId)
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
      console.error('createRentalPaymentIntent: booking update error', updateError)
      return { error: updateError.message }
    }

    return { clientSecret: paymentIntent.client_secret! }
  } catch (err) {
    console.error('createRentalPaymentIntent: stripe error', err)
    return { error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// createDepositPaymentIntent
// ---------------------------------------------------------------------------

/**
 * Create a Stripe PaymentIntent for the deposit hold (manual capture).
 * Uses `capture_method: 'manual'` and extended auth for >7 day holds.
 * Updates the booking row with the deposit PaymentIntent ID.
 */
export async function createDepositPaymentIntent(
  bookingId: string,
  depositAmountAed: number,
  guestUserId?: string | null
): Promise<{ clientSecret: string } | { error: string }> {
  let userId = guestUserId ?? null

  if (!userId) {
    const auth = await getAuthenticatedUser()
    if ('error' in auth) return { error: auth.error }
    userId = auth.userId
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(depositAmountAed * 100), // AED → fils
      currency: 'aed',
      capture_method: 'manual',
      payment_method_options: {
        card: {
          request_extended_authorization: 'if_available',
        },
      },
      metadata: {
        booking_id: bookingId,
        user_id: userId ?? 'guest',
        type: 'deposit',
      },
    })

    const admin = createAdminClient()
    const updateQuery = admin
      .from('bookings')
      .update({ stripe_deposit_pi_id: paymentIntent.id })
      .eq('id', bookingId)

    if (userId && userId !== 'guest') {
      updateQuery.eq('user_id', userId)
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
      console.error('createDepositPaymentIntent: booking update error', updateError)
      return { error: updateError.message }
    }

    return { clientSecret: paymentIntent.client_secret! }
  } catch (err) {
    console.error('createDepositPaymentIntent: stripe error', err)
    return { error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// captureDeposit (admin only)
// ---------------------------------------------------------------------------

/**
 * Capture a previously authorized deposit hold.
 * Admin-only — used when vehicle is returned and deposit deduction is confirmed.
 */
export async function captureDeposit(
  bookingId: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('stripe_deposit_pi_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking?.stripe_deposit_pi_id) {
    return { error: fetchError?.message ?? 'No deposit PaymentIntent found for this booking' }
  }

  try {
    await stripe.paymentIntents.capture(booking.stripe_deposit_pi_id)

    const { error: updateError } = await admin
      .from('bookings')
      .update({ deposit_status: 'captured' })
      .eq('id', bookingId)

    if (updateError) {
      console.error('captureDeposit: booking update error', updateError)
      return { error: updateError.message }
    }

    return { error: null }
  } catch (err) {
    console.error('captureDeposit: stripe error', err)
    return { error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// voidDeposit (admin only)
// ---------------------------------------------------------------------------

/**
 * Cancel (void) an authorized deposit hold.
 * Admin-only — used when the rental completes with no deductions.
 */
export async function voidDeposit(
  bookingId: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('stripe_deposit_pi_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking?.stripe_deposit_pi_id) {
    return { error: fetchError?.message ?? 'No deposit PaymentIntent found for this booking' }
  }

  try {
    await stripe.paymentIntents.cancel(booking.stripe_deposit_pi_id)

    const { error: updateError } = await admin
      .from('bookings')
      .update({ deposit_status: 'voided' })
      .eq('id', bookingId)

    if (updateError) {
      console.error('voidDeposit: booking update error', updateError)
      return { error: updateError.message }
    }

    return { error: null }
  } catch (err) {
    console.error('voidDeposit: stripe error', err)
    return { error: (err as Error).message }
  }
}
