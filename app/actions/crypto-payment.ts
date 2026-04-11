'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nowpayments } from '@/lib/nowpayments/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://luxeclubrentals.com'

/**
 * Server Action — creates a NOWPayments invoice for a crypto booking.
 *
 * Security:
 *  - Verifies the booking exists and has payment_status 'pending_crypto'
 *  - Verifies ownership via authenticated user or guest_email match
 *  - Saves nowpayments_invoice_id to the booking row
 *
 * Returns the NOWPayments hosted invoice URL for client-side redirect.
 */
export async function createCryptoInvoice(
  bookingId: string,
  guestEmail?: string
): Promise<{ invoiceUrl: string } | { error: string }> {
  if (!nowpayments) {
    return { error: 'Crypto payments are not configured' }
  }

  if (!bookingId) {
    return { error: 'Booking ID is required' }
  }

  const admin = createAdminClient()

  // Fetch the booking
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('id, reservation_fee, payment_status, payment_method, user_id, guest_email, nowpayments_invoice_id, vehicles (name)')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: 'Booking not found' }
  }

  // Verify ownership
  if (guestEmail) {
    // Guest path — verify email matches
    const normalizedEmail = guestEmail.trim().toLowerCase()
    const bookingGuestEmail = (booking.guest_email as string | null)?.toLowerCase()
    if (bookingGuestEmail !== normalizedEmail) {
      // Also check if linked to a registered user
      if (booking.user_id) {
        const { data: { user } } = await admin.auth.admin.getUserById(booking.user_id)
        if (user?.email?.toLowerCase() !== normalizedEmail) {
          return { error: 'Booking not found' }
        }
      } else {
        return { error: 'Booking not found' }
      }
    }
  } else {
    // Authenticated path — verify user owns the booking
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const claims = claimsData?.claims

    if (!claims?.sub) {
      return { error: 'You must be logged in to pay for this booking' }
    }

    if (booking.user_id !== claims.sub) {
      return { error: 'Booking not found' }
    }
  }

  // Verify booking is eligible for crypto payment
  if (booking.payment_method !== 'crypto') {
    return { error: 'This booking is not set up for crypto payment' }
  }

  if (booking.payment_status !== 'pending_crypto') {
    return { error: 'This booking is not awaiting crypto payment' }
  }

  // If an invoice was already created, re-create the URL from the stored ID
  if (booking.nowpayments_invoice_id) {
    const invoiceHost = process.env.NOWPAYMENTS_SANDBOX === 'true'
      ? 'https://sandbox.nowpayments.io'
      : 'https://nowpayments.io'
    return {
      invoiceUrl: `${invoiceHost}/payment/?iid=${booking.nowpayments_invoice_id}`,
    }
  }

  // Determine success/cancel URLs
  const isGuest = !booking.user_id || !!guestEmail
  const successUrl = isGuest
    ? `${SITE_URL}/booking-lookup`
    : `${SITE_URL}/bookings/${bookingId}`
  const cancelUrl = successUrl

  // Create NOWPayments invoice
  const vehicleName = (booking.vehicles as unknown as { name: string } | null)?.name ?? 'Vehicle'

  try {
    // Only the reservation fee is collected via crypto at booking time.
    // The rest of the booking total is settled in person on pickup day.
    const reservationFeeAed = Number(booking.reservation_fee ?? 0)
    const invoice = await nowpayments.createInvoice({
      // Sandbox doesn't support AED — convert to USD (1 AED ≈ 0.2723 USD)
      price_amount: process.env.NOWPAYMENTS_SANDBOX === 'true'
        ? Math.round(reservationFeeAed * 0.2723 * 100) / 100
        : reservationFeeAed,
      price_currency: process.env.NOWPAYMENTS_SANDBOX === 'true' ? 'usd' : 'aed',
      ipn_callback_url: `${SITE_URL}/api/webhooks/nowpayments`,
      order_id: bookingId,
      order_description: `LuxeClub Rental — ${vehicleName}`,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    // Save invoice ID to booking
    await admin
      .from('bookings')
      .update({ nowpayments_invoice_id: String(invoice.id) })
      .eq('id', bookingId)

    return { invoiceUrl: invoice.invoice_url }
  } catch (err) {
    console.error('createCryptoInvoice: NOWPayments error', err)
    return { error: 'Failed to create crypto invoice. Please try again.' }
  }
}
