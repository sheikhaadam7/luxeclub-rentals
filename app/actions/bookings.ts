'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  calculateBookingTotal,
  type BookingPricingInput,
} from '@/lib/pricing/calculator'
import { NO_DEPOSIT_OPTION_ENABLED, minimumRentalDays } from '@/lib/pricing/constants'
import { differenceInDays } from 'date-fns'
import { isDateKey, pickupInstant, hoursUntilPickup, type DateKey } from '@/lib/dates'
import type { BookingFormValues } from '@/lib/validations/booking'
// createSetupIntent is deliberately not imported any more: pay-on-delivery
// now charges the reservation fee through createRentalPaymentIntent, which
// also stores the card. The action itself is kept in payments.ts for any
// booking created before this change.
import { createRentalPaymentIntent } from '@/app/actions/payments'
import { DELIVERY_ZONE_LABELS } from '@/lib/pricing/calculator'
import { settleCancellation } from '@/lib/booking/cancellation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateBookingResult {
  bookingId: string
  /** Client secret for the reservation fee PaymentIntent (null for cash/crypto) */
  rentalClientSecret: string | null
  /** Client secret for the SetupIntent (card-on-file for cash bookings) */
  setupClientSecret: string | null
  /** Full customer obligation (amount charged now + pickup balance) */
  totalDue: number
  /**
   * The non-refundable slice a late cancellation forfeits. NOT the amount
   * charged -- see amountDueNow.
   */
  reservationFee: number
  /** What is actually charged online now. Drives the Stripe amount. */
  amountDueNow: number
  /** Amount owed in person at handover */
  balanceDueOnPickup: number
  depositAmount: number
}

export interface UserBooking {
  id: string
  start_date: string
  end_date: string
  duration_type: string
  status: string
  payment_status: string
  payment_method: string
  total_due: number
  vehicles: {
    name: string
    slug: string
    primary_image_url: string | null
  } | null
}

export interface BookingDetail {
  id: string
  start_date: string
  end_date: string
  duration_type: string
  start_time: string | null
  end_time: string | null
  pickup_method: string
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  return_method: string
  collection_address: string | null
  collection_lat: number | null
  collection_lng: number | null
  deposit_choice: string
  rental_subtotal: number
  delivery_fee: number
  return_fee: number
  no_deposit_surcharge: number
  protection_package: string | null
  addons: Record<string, boolean> | null
  delivery_location: string | null
  protection_surcharge: number | null
  addons_total: number | null
  card_surcharge: number | null
  deposit_amount: number
  total_due: number
  reservation_fee: number
  reservation_fee_status: string
  /** What we asked for online. Null on bookings taken before this existed. */
  amount_due_now: number | null
  /** What actually arrived. Null until a payment webhook lands. */
  amount_paid: number | null
  balance_due_on_pickup: number
  forfeit_reason: string | null
  payment_method: string
  payment_status: string
  status: string
  vehicle_id: string
  stripe_rental_pi_id: string | null
  stripe_deposit_pi_id: string | null
  cancelled_at: string | null
  cancellation_fee: number | null
  cancellation_refund_amount: number | null
  stripe_refund_id: string | null
  nowpayments_invoice_id: string | null
  modification_requested_at: string | null
  modification_requested_start: string | null
  modification_requested_end: string | null
  modification_status: string | null
  vehicles: {
    name: string
    slug: string
    primary_image_url: string | null
    daily_rate: number | null
  } | null
}

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

/**
 * Server Action — creates a booking with server-side price revalidation.
 *
 * Security: vehicle rates are fetched fresh from the DB — client-side prices
 * are NEVER trusted. calculateBookingTotal is called server-side to produce
 * the authoritative price before any Stripe PaymentIntent is created.
 *
 * For cash payments: booking is created with status 'pending_cash'.
 * For card/wallet: rental and (optionally) deposit PaymentIntents are created.
 *
 * Email: confirmation email sent via Resend after booking insert. Wrapped in
 * try/catch so email failure never fails the booking.
 */
/**
 * The dates arrive as calendar-day keys, NOT Date objects.
 *
 * A Date crossing the server-action boundary is only an instant, and this
 * runs on Vercel in UTC -- so a day the customer picked as the 16th in
 * Dubai arrives as 2026-10-15T20:00:00Z and reads back as the 15th. That
 * was the bug. The browser knows the customer's calendar day and is the
 * only place that can say what it was, so it sends the string.
 *
 * Deliberately REPLACING startDate/endDate rather than sitting beside
 * them: two representations of the same fact means the server can price
 * from one and store the other. This action is reachable by direct POST,
 * so that gap would let a caller be charged for one day and reserve
 * thirty.
 */
export type CreateBookingInput = Omit<BookingFormValues, 'startDate' | 'endDate'> & {
  startDate: DateKey
  endDate: DateKey
}

export async function createBooking(
  formData: CreateBookingInput,
  vehicleId: string,
  guestInfo?: { name: string; email: string; phone: string }
): Promise<CreateBookingResult | { error: string }> {
  // 1. Authenticate (or accept guest info)
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  let userId = claims?.sub ?? null

  if (!userId && !guestInfo) {
    return { error: 'You must be logged in or provide contact details to book a vehicle' }
  }

  const admin = createAdminClient()

  // If guest booking, check if the email belongs to a registered user.
  // If so, link the booking to their account so it appears on their bookings page.
  if (!userId && guestInfo?.email) {
    try {
      const normalizedEmail = guestInfo.email.trim().toLowerCase()
      let page = 1
      let found = false
      while (!found) {
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 50, page })
        if (!users || users.length === 0) break
        const match = users.find(u => u.email?.toLowerCase() === normalizedEmail)
        if (match) {
          userId = match.id
          found = true
        }
        if (users.length < 50) break
        page++
      }
    } catch {
      // Non-fatal — if lookup fails, booking proceeds as guest
    }
  }

  // Validate the day keys before anything derives from them. Everything
  // below -- the price, the minimum-rental check, the stored row -- comes
  // from these two strings, so a malformed one must stop here rather than
  // turn into an Invalid Date further down.
  if (!isDateKey(formData.startDate) || !isDateKey(formData.endDate)) {
    return { error: 'Invalid booking dates' }
  }
  // One derivation, used for every calculation. Anchored to UTC so the
  // day count is the same arithmetic wherever this runs.
  const startDate = new Date(`${formData.startDate}T00:00:00Z`)
  const endDate = new Date(`${formData.endDate}T00:00:00Z`)
  if (endDate < startDate) {
    return { error: 'The return date must be on or after the pickup date' }
  }

  // 2. Fetch vehicle from DB (authoritative rates — never trust client)
  const { data: vehicle, error: vehicleError } = await admin
    .from('vehicles')
    .select('id, name, slug, primary_image_url, daily_rate, weekly_rate, monthly_rate, deposit_amount, is_available')
    .eq('id', vehicleId)
    .single()

  if (vehicleError || !vehicle) {
    return { error: vehicleError?.message ?? 'Vehicle not found' }
  }

  if (!vehicle.is_available) {
    return { error: 'This vehicle is not currently available for booking' }
  }

  // Minimum rental length, from the DB rate. The wizard checks the same
  // rule for a timely message, but this is the enforcement: the client
  // guard cannot be reached by a stale tab or a direct call.
  const minDays = minimumRentalDays(vehicle.daily_rate)
  const requestedDays = Math.max(differenceInDays(endDate, startDate), 1)
  if (requestedDays < minDays) {
    return {
      error: `${vehicle.name} has a ${minDays}-day minimum rental. Please choose at least ${minDays} days.`,
    }
  }

  // 3. Server-side price recalculation
  const pricingInput: BookingPricingInput = {
    startDate,
    endDate,
    durationType: formData.durationType,
    pickupMethod: formData.pickupMethod,
    returnMethod: formData.returnMethod,
    // Clamped server-side: a tab opened before the option was withdrawn
    // still runs the old bundle with a live toggle, and the client guard
    // cannot reach it. This is the enforcement point.
    depositChoice: NO_DEPOSIT_OPTION_ENABLED ? formData.depositChoice : 'deposit',
    paymentMethod: formData.paymentMethod,
    // These three were missing, so every booking was priced without the
    // protection package, the add-ons and the delivery zone -- short by up
    // to AED 450/day. The client always passed them; the server did not.
    // Safe: the client chooses WHAT, the server prices it from its own
    // constants, and an unknown zone key falls back to 0.
    deliveryLocation: formData.deliveryLocation,
    protectionPackage: formData.protectionPackage,
    addons: formData.addons,
  }

  const pricing = calculateBookingTotal(vehicle, pricingInput)

  // The customer's typed address lands in deliveryNotes and was never
  // persisted, so the confirmation email fell back to the office address --
  // telling a delivery customer to come and collect.
  //
  // Keyed off the ZONE, never off emptiness: nothing clears deliveryNotes
  // when the zone changes, so a Dubai address left in state after switching
  // to Abu Dhabi would otherwise be stored and send a driver to the wrong
  // emirate.
  //
  // Blank Dubai notes stay null on purpose. A tourist may not have an
  // address yet and must not be blocked from booking; the email says "to be
  // confirmed" and admin flags it, rather than asserting the wrong address.
  const isDelivery = formData.pickupMethod === 'delivery'
  const zoneKey = formData.deliveryLocation ?? ''
  const resolvedAddress = !isDelivery
    ? null
    : zoneKey === 'within_dubai'
      ? (formData.deliveryNotes?.trim() || null)
      : (DELIVERY_ZONE_LABELS[zoneKey] ?? null)

  // 4. Insert booking row
  const { data: booking, error: insertError } = await admin
    .from('bookings')
    .insert({
      vehicle_id: vehicleId,
      user_id: userId,
      // Stored for signed-in customers as well. The columns are named
      // guest_* for historical reasons; they hold the contact details for
      // this booking whoever made it.
      guest_name: guestInfo?.name || null,
      guest_email: guestInfo?.email || null,
      guest_phone: guestInfo?.phone || null,
      // Stored exactly as the customer's browser reported them.
      start_date: formData.startDate,
      end_date: formData.endDate,
      duration_type: formData.durationType,
      start_time: formData.startTime || null,
      end_time: formData.endTime || null,
      pickup_method: formData.pickupMethod,
      delivery_address: resolvedAddress,
      delivery_lat: formData.deliveryLat ?? null,
      delivery_lng: formData.deliveryLng ?? null,
      return_method: formData.returnMethod,
      // Same spot for collection -- the form's own copy says so.
      collection_address:
        formData.returnMethod === 'collection'
          ? resolvedAddress
          : (formData.collectionAddress ?? null),
      collection_lat: formData.collectionLat ?? null,
      collection_lng: formData.collectionLng ?? null,
      deposit_choice: NO_DEPOSIT_OPTION_ENABLED ? formData.depositChoice : 'deposit',
      // What the customer chose, so the business can actually see it.
      // protection_package is coerced with the same test the calculator
      // uses, so the row can never disagree with the price it was charged.
      protection_package:
        formData.protectionPackage === 'inclusive' ? 'inclusive' : 'basic',
      // Narrowed to the four booleans rather than storing the raw client
      // object, and never null -- null would defeat the column default.
      addons: {
        additionalDriver: !!formData.addons?.additionalDriver,
        personalDriver: !!formData.addons?.personalDriver,
        babySeat: !!formData.addons?.babySeat,
        childSeat: !!formData.addons?.childSeat,
      },
      delivery_location: isDelivery ? (formData.deliveryLocation ?? null) : null,
      // Amounts, so the breakdown pages reconcile instead of showing
      // hundreds of dirhams unaccounted for.
      protection_surcharge: pricing.protectionSurcharge,
      addons_total: pricing.addonBreakdown.total,
      card_surcharge: pricing.creditCardSurcharge,
      deposit_amount: pricing.depositAmount,
      rental_subtotal: pricing.rentalSubtotal,
      delivery_fee: pricing.deliveryFee,
      return_fee: pricing.returnFee,
      no_deposit_surcharge: pricing.noDepositSurcharge,
      total_due: pricing.totalDue,
      reservation_fee: pricing.reservationFeeWithSurcharge,
      // What we are about to ask Stripe for. Stored so the webhook can
      // check the money that arrives against the money we asked for.
      amount_due_now: pricing.amountDueNow,
      balance_due_on_pickup: pricing.balanceDueOnPickup,
      reservation_fee_status: 'pending',
      payment_method: formData.paymentMethod,
      status: 'draft',
      payment_status:
        formData.paymentMethod === 'cash' ? 'pending_cash'
        : formData.paymentMethod === 'crypto' ? 'pending_crypto'
        : 'unpaid',
    })
    .select('id')
    .single()

  if (insertError || !booking) {
    console.error('createBooking: insert error', insertError)
    return { error: insertError?.message ?? 'Failed to create booking' }
  }

  const bookingId = booking.id

  // 5. Confirmation email is sent after payment succeeds (via webhook),
  //    not at draft creation — no email sent here.

  const commonResult = {
    bookingId,
    totalDue: pricing.totalDue,
    reservationFee: pricing.reservationFeeWithSurcharge,
    amountDueNow: pricing.amountDueNow,
    balanceDueOnPickup: pricing.balanceDueOnPickup,
    depositAmount: pricing.depositAmount,
  }

  // 6. Crypto — the NOWPayments invoice is created separately on the
  //    client, for amount_due_now, which is the full total.
  if (formData.paymentMethod === 'crypto') {
    return { ...commonResult, rentalClientSecret: null, setupClientSecret: null }
  }

  // 7. Everything else goes through one PaymentIntent for amountDueNow.
  //
  //    Card, Apple Pay and Google Pay charge the whole rental; pay-on-
  //    delivery charges the holding fee and settles the balance at
  //    handover. That difference is decided in the calculator, so the two
  //    paths used to be byte-identical code and are now genuinely one --
  //    two copies of a Stripe call is how the amounts drift apart.
  //
  //    The intent also stores the card (setup_future_usage), which is what
  //    preserves the card-on-file guarantee pay-on-delivery relies on for
  //    cancellation and no-show charges.
  if (!process.env.STRIPE_SECRET_KEY) {
    // Test mode — no Stripe key configured
    return { ...commonResult, rentalClientSecret: null, setupClientSecret: null }
  }

  const rentalResult = await createRentalPaymentIntent(
    bookingId,
    pricing.amountDueNow,
    userId ?? 'guest'
  )
  if ('error' in rentalResult) {
    return { error: rentalResult.error }
  }

  return {
    ...commonResult,
    rentalClientSecret: rentalResult.clientSecret,
    setupClientSecret: null,
  }
}

// ---------------------------------------------------------------------------
// updateBookingPaymentMethod
// ---------------------------------------------------------------------------

/**
 * Server Action — change the payment method on an existing booking, and
 * move the money with it.
 *
 * Called when the customer goes Back from the payment step and picks a
 * different method. It used to write two columns and stop there, which
 * was harmless only while every method charged the same flat fee. Now
 * that card charges the whole rental and pay-on-delivery charges the
 * holding fee, leaving the original PaymentIntent in place would charge
 * a card customer the holding fee, or a pay-on-delivery customer the
 * entire rental.
 *
 * Deliberately does NOT re-run the pricing calculator. Since the 3%
 * applies to every method, `total_due` no longer depends on the payment
 * method at all -- so re-pricing could not change the total, but WOULD
 * re-read the vehicle's current daily rate. A mastersheet push between
 * booking and switch would then silently move the price the customer
 * already agreed to. The stored total is the agreed total; only the split
 * between "now" and "at handover" is recalculated here.
 */
export async function updateBookingPaymentMethod(
  bookingId: string,
  paymentMethod: 'card' | 'apple_pay' | 'google_pay' | 'cash' | 'crypto'
): Promise<
  | { success: true; totalDue: number; amountDueNow: number; balanceDueOnPickup: number; rentalClientSecret: string | null }
  | { error: string }
> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  const admin = createAdminClient()

  // Fetch booking — verify it exists and is still pending
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select(
      'id, status, payment_method, user_id, guest_email, total_due, reservation_fee, amount_due_now, reservation_fee_status, stripe_rental_pi_id, nowpayments_invoice_id'
    )
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: 'Booking not found' }
  }

  if (booking.status !== 'draft' && booking.status !== 'pending') {
    return { error: 'Cannot change payment method on this booking' }
  }

  // Verify ownership
  if (claims?.sub) {
    if (booking.user_id && booking.user_id !== claims.sub) {
      return { error: 'Booking not found' }
    }
  }

  // Never re-price something already paid for.
  if (booking.reservation_fee_status === 'paid') {
    return { error: 'This booking has already been paid for' }
  }

  const totalDue = Number(booking.total_due ?? 0)
  const nonRefundable = Number(booking.reservation_fee ?? 0)
  // Same split rule as the calculator, applied to the agreed total.
  const amountDueNow = paymentMethod === 'cash' ? nonRefundable : totalDue
  const balanceDueOnPickup = Math.round((totalDue - amountDueNow) * 100) / 100

  // Already on this method AND the stored split already matches — nothing
  // to do. Checked on the split too, not just the method, so a booking
  // left inconsistent by an earlier failure gets repaired rather than
  // skipped.
  if (
    booking.payment_method === paymentMethod &&
    Number(booking.amount_due_now ?? -1) === amountDueNow
  ) {
    return {
      success: true,
      totalDue,
      amountDueNow,
      balanceDueOnPickup,
      rentalClientSecret: null,
    }
  }

  const paymentStatus =
    paymentMethod === 'cash' ? 'pending_cash'
    : paymentMethod === 'crypto' ? 'pending_crypto'
    : 'unpaid'

  // ---- Stripe first, database second ---------------------------------
  //
  // If the row were written first and Stripe then failed, the booking
  // would claim the full rental while the intent still held the holding
  // fee -- and the customer would be charged the smaller figure against a
  // receipt showing the larger one. Any Stripe failure below returns
  // without touching the row, leaving the booking consistent and
  // retryable.
  let newClientSecret: string | null = null
  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY

  if (stripeEnabled && booking.stripe_rental_pi_id) {
    const { stripe } = await import('@/lib/stripe/server')
    if (stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(booking.stripe_rental_pi_id)

        if (paymentMethod === 'crypto') {
          // Crypto settles through NOWPayments, so the Stripe intent is
          // dead weight. Cancel it rather than leave a live intent for an
          // amount nobody will collect.
          if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
            await stripe.paymentIntents.cancel(booking.stripe_rental_pi_id)
          }
        } else if (Math.round(amountDueNow * 100) !== pi.amount) {
          // Stripe only allows an amount change while the intent is still
          // waiting to be paid. An abandoned 3-D Secure leaves it in
          // requires_action and a slow bank leaves it processing -- in
          // those states the update is rejected, so replace the intent
          // and hand the browser a fresh client secret.
          if (
            pi.status === 'requires_payment_method' ||
            pi.status === 'requires_confirmation'
          ) {
            await stripe.paymentIntents.update(booking.stripe_rental_pi_id, {
              amount: Math.round(amountDueNow * 100),
            })
          } else if (pi.status === 'succeeded' || pi.status === 'processing') {
            // Money is already moving. Re-pricing now would mean charging
            // twice; the status guard above should have caught this, but
            // the webhook may simply not have landed yet.
            return { error: 'This booking is already being paid for' }
          } else {
            await stripe.paymentIntents.cancel(booking.stripe_rental_pi_id)
            const fresh = await createRentalPaymentIntent(
              bookingId,
              amountDueNow,
              booking.user_id ?? 'guest'
            )
            if ('error' in fresh) return { error: fresh.error }
            newClientSecret = fresh.clientSecret
          }
        }
      } catch (err) {
        console.error('updateBookingPaymentMethod: stripe error', err)
        return { error: 'Could not update the payment. Please try again.' }
      }
    }
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      amount_due_now: amountDueNow,
      balance_due_on_pickup: balanceDueOnPickup,
      // A stored invoice short-circuits createCryptoInvoice, which would
      // otherwise re-serve the old URL at the pre-switch amount.
      ...(paymentMethod === 'crypto' ? { nowpayments_invoice_id: null } : {}),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('updateBookingPaymentMethod: update error', updateError)
    return { error: 'Failed to update payment method' }
  }

  return {
    success: true,
    totalDue,
    amountDueNow,
    balanceDueOnPickup,
    rentalClientSecret: newClientSecret,
  }
}

// ---------------------------------------------------------------------------
// getUserBookings
// ---------------------------------------------------------------------------

/**
 * Server Action — returns all bookings for the authenticated user,
 * joined with vehicle name, slug, and primary_image_url.
 * Ordered by start_date descending (most recent first).
 */
export async function getUserBookings(): Promise<UserBooking[] | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims?.sub) {
    return { error: 'You must be logged in to view bookings' }
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_date,
      end_date,
      duration_type,
      status,
      payment_status,
      payment_method,
      total_due,
      vehicles (
        name,
        slug,
        primary_image_url
      )
    `)
    .eq('user_id', claims.sub)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('getUserBookings error', error)
    return { error: error.message }
  }

  return (data ?? []) as unknown as UserBooking[]
}

// ---------------------------------------------------------------------------
// getLatestBookingForUser — used by the Step 4 sign-in modal to auto-fill
// the Driver Information form with the customer's saved contact details.
// ---------------------------------------------------------------------------

export interface LatestBookingGuestInfo {
  guestName: string | null
  guestEmail: string | null
  guestPhone: string | null
}

export async function getLatestBookingForUser(): Promise<LatestBookingGuestInfo | null> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return null

  const { data, error } = await supabase
    .from('bookings')
    .select('guest_name, guest_email, guest_phone')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  return {
    guestName: data.guest_name ?? null,
    guestEmail: data.guest_email ?? null,
    guestPhone: data.guest_phone ?? null,
  }
}

// ---------------------------------------------------------------------------
// getBookingDetail
// ---------------------------------------------------------------------------

/**
 * Server Action — returns full detail for a single booking by ID,
 * joined with vehicle name, slug, primary_image_url, and daily_rate.
 * Returns null if not found or not owned by the authenticated user.
 */
export async function getBookingDetail(
  bookingId: string
): Promise<BookingDetail | null | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims?.sub) {
    return { error: 'You must be logged in to view booking details' }
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_date,
      end_date,
      duration_type,
      start_time,
      end_time,
      pickup_method,
      delivery_address,
      delivery_lat,
      delivery_lng,
      return_method,
      collection_address,
      collection_lat,
      collection_lng,
      deposit_choice,
      rental_subtotal,
      delivery_fee,
      return_fee,
      no_deposit_surcharge,
      protection_package,
      addons,
      delivery_location,
      protection_surcharge,
      addons_total,
      card_surcharge,
      deposit_amount,
      total_due,
      reservation_fee,
      reservation_fee_status,
      amount_due_now,
      amount_paid,
      balance_due_on_pickup,
      forfeit_reason,
      payment_method,
      payment_status,
      status,
      vehicle_id,
      stripe_rental_pi_id,
      stripe_deposit_pi_id,
      cancelled_at,
      cancellation_fee,
      cancellation_refund_amount,
      stripe_refund_id,
      nowpayments_invoice_id,
      modification_requested_at,
      modification_requested_start,
      modification_requested_end,
      modification_status,
      vehicles (
        name,
        slug,
        primary_image_url,
        daily_rate
      )
    `)
    .eq('id', bookingId)
    .eq('user_id', claims.sub)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // "not found" from PostgREST
      return null
    }
    console.error('getBookingDetail error', error)
    return { error: error.message }
  }

  return data as unknown as BookingDetail
}

// ---------------------------------------------------------------------------
// acceptDelivery
// ---------------------------------------------------------------------------

/**
 * Server Action — customer accepts delivery of the vehicle.
 * Validates ownership and that the booking is in 'car_delivered' status,
 * then updates status to 'completed'.
 */
export async function acceptDelivery(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims?.sub) {
    return { error: 'You must be logged in to accept delivery' }
  }

  const admin = createAdminClient()

  // Fetch the booking — verify ownership and current status
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('user_id', claims.sub)
    .single()

  if (fetchError || !booking) {
    return { error: 'Booking not found' }
  }

  if (booking.status !== 'car_delivered') {
    return { error: 'This booking is not awaiting delivery acceptance' }
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)

  if (updateError) {
    console.error('acceptDelivery: update error', updateError)
    return { error: 'Failed to accept delivery' }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// cancelBooking
// ---------------------------------------------------------------------------

/**
 * Server Action — customer cancels their own booking.
 *
 * Reservation fee policy:
 * - Cancelled >24 hours before start: full reservation fee refunded (Stripe
 *   refund on the rental PI for card/wallet paths; admin handles cash/crypto).
 * - Cancelled <=24 hours before start: reservation fee forfeited, no refund,
 *   forfeit_reason='late_cancel'.
 * - Cannot cancel once the rental period has started.
 */
export async function cancelBooking(
  bookingId: string
): Promise<{ success: true; refundAmount: number; forfeited: boolean } | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims?.sub) {
    return { error: 'You must be logged in to cancel a booking' }
  }

  const admin = createAdminClient()

  // Fetch booking with ownership check
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('id, status, payment_method, start_date, start_time, reservation_fee, amount_paid, amount_due_now, reservation_fee_status, stripe_rental_pi_id')
    .eq('id', bookingId)
    .eq('user_id', claims.sub)
    .single()

  if (fetchError || !booking) {
    return { error: 'Booking not found' }
  }

  if (!['draft', 'pending', 'confirmed'].includes(booking.status)) {
    return { error: 'This booking cannot be cancelled in its current state' }
  }

  // Cannot cancel once the rental has actually begun. Measured from the
  // agreed pickup moment in Dubai, not from UTC midnight -- the old
  // version left cancellation open until 4am Dubai on the pickup day.
  if (pickupInstant(booking.start_date, booking.start_time) <= new Date()) {
    return { error: 'Bookings cannot be cancelled once the rental period has started' }
  }

  const settlement = await settleCancellation(booking)
  if ('error' in settlement) return { error: settlement.error }
  const { lateCancel, refundAmount } = settlement

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      payment_status: settlement.paymentStatus,
      reservation_fee_status: settlement.reservationFeeStatus,
      forfeit_reason: settlement.forfeitReason,
      cancelled_at: new Date().toISOString(),
      cancellation_fee: settlement.cancellationFee,
      cancellation_refund_amount: refundAmount,
      stripe_refund_id: settlement.stripeRefundId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('cancelBooking: update error', updateError)
    return { error: 'Failed to update booking after cancellation' }
  }

  return { success: true, refundAmount, forfeited: lateCancel }
}

// ---------------------------------------------------------------------------
// requestDateModification
// ---------------------------------------------------------------------------

/**
 * Server Action — customer requests a date change for their booking.
 * The request goes to the admin for review (approve/reject).
 *
 * Constraints:
 * - Booking must be pending or confirmed
 * - No existing pending modification request
 * - Must be >24 hours before current start date
 * - New dates must be in the future
 */
export async function requestDateModification(
  bookingId: string,
  newStartDate: string,
  newEndDate: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims?.sub) {
    return { error: 'You must be logged in to request a date change' }
  }

  const admin = createAdminClient()

  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('id, status, start_date, start_time, modification_status')
    .eq('id', bookingId)
    .eq('user_id', claims.sub)
    .single()

  if (fetchError || !booking) {
    return { error: 'Booking not found' }
  }

  if (!['draft', 'pending', 'confirmed'].includes(booking.status)) {
    return { error: 'Date changes can only be requested for pending or confirmed bookings' }
  }

  // Same reckoning as cancellation: the real pickup moment in Dubai.
  if (pickupInstant(booking.start_date, booking.start_time) <= new Date()) {
    return { error: 'Date changes cannot be requested once the rental period has started' }
  }

  if (booking.modification_status === 'pending') {
    return { error: 'A date change request is already pending for this booking' }
  }

  // Must be >24hrs before the agreed pickup, in Dubai terms.
  const hoursUntilStart = hoursUntilPickup(booking.start_date, booking.start_time)

  if (hoursUntilStart <= 24) {
    return { error: 'Date changes cannot be requested within 24 hours of pickup' }
  }

  // New dates must be valid and in the future
  const newStart = new Date(newStartDate + 'T00:00:00Z')
  const newEnd = new Date(newEndDate + 'T00:00:00Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
    return { error: 'Invalid dates provided' }
  }

  if (newStart < today) {
    return { error: 'New start date must be in the future' }
  }

  if (newEnd < newStart) {
    return { error: 'End date must be on or after start date' }
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      modification_requested_at: new Date().toISOString(),
      modification_requested_start: newStartDate,
      modification_requested_end: newEndDate,
      modification_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('requestDateModification: update error', updateError)
    return { error: 'Failed to submit date change request' }
  }

  return { success: true }
}
