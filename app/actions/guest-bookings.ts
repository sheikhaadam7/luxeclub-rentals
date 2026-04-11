'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { BookingDetail } from '@/app/actions/bookings'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const BOOKING_DETAIL_SELECT = `
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
  deposit_amount,
  total_due,
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
` as const

/**
 * Verifies that the given email owns the given booking.
 * Checks both guest_email (for guest bookings) and user_id (for registered user bookings).
 * Returns true if the email matches.
 */
async function verifyBookingOwnership(
  admin: ReturnType<typeof createAdminClient>,
  bookingUserId: string | null,
  bookingGuestEmail: string | null,
  email: string
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase()

  // Check guest_email match
  if (bookingGuestEmail && bookingGuestEmail.toLowerCase() === normalizedEmail) {
    return true
  }

  // Check registered user match via user_id
  if (bookingUserId) {
    const { data: { user } } = await admin.auth.admin.getUserById(bookingUserId)
    if (user?.email?.toLowerCase() === normalizedEmail) {
      return true
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// lookupGuestBooking
// ---------------------------------------------------------------------------

/**
 * Server Action — looks up a booking by email + 8-char reference.
 *
 * Works for both guest bookings (matched via guest_email) and registered
 * user bookings (matched via user_id → auth.users email).
 *
 * The reference is the first 8 hex chars of the booking UUID (dashes removed,
 * uppercased). We expand it back and match with `id LIKE <prefix>%`.
 */
export async function lookupGuestBooking(
  email: string,
  reference: string
): Promise<BookingDetail | { error: string }> {
  if (!email || !reference) {
    return { error: 'Email and booking reference are required' }
  }

  const trimmedRef = reference.trim().replace(/\s/g, '')
  if (trimmedRef.length !== 8 || !/^[0-9A-Fa-f]{8}$/.test(trimmedRef)) {
    return { error: 'Invalid booking reference. Please enter the 8-character code from your confirmation email.' }
  }

  const prefix = trimmedRef.toLowerCase()
  const admin = createAdminClient()

  // Find booking by reference prefix (first 8 hex chars of UUID)
  // UUID LIKE doesn't work in PostgREST, so use range comparison instead:
  // e.g. e24bee52-0000-0000-0000-000000000000 <= id <= e24bee52-ffff-ffff-ffff-ffffffffffff
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select(`
      ${BOOKING_DETAIL_SELECT},
      user_id,
      guest_email
    `)
    .gte('id', `${prefix}-0000-0000-0000-000000000000`)
    .lte('id', `${prefix}-ffff-ffff-ffff-ffffffffffff`)
    .maybeSingle()

  if (fetchError) {
    console.error('lookupGuestBooking: query error', fetchError)
    return { error: 'No booking found. Please check your email and reference code.' }
  }

  if (!booking) {
    return { error: 'No booking found. Please check your email and reference code.' }
  }

  // Verify email ownership (guest_email or registered user email)
  const raw = booking as Record<string, unknown>
  const isOwner = await verifyBookingOwnership(
    admin,
    raw.user_id as string | null,
    raw.guest_email as string | null,
    email
  )

  if (!isOwner) {
    return { error: 'No booking found. Please check your email and reference code.' }
  }

  return booking as unknown as BookingDetail
}

// ---------------------------------------------------------------------------
// cancelGuestBooking
// ---------------------------------------------------------------------------

/**
 * Server Action — cancels a guest booking verified via email match.
 *
 * Reservation fee policy:
 * - Cancelled >24 hours before start: full reservation fee refunded.
 * - Cancelled <=24 hours before start: reservation fee forfeited (no refund),
 *   forfeit_reason='late_cancel'.
 * - Cannot cancel once the rental period has started.
 */
export async function cancelGuestBooking(
  bookingId: string,
  guestEmail: string
): Promise<{ success: true; refundAmount: number; forfeited: boolean } | { error: string }> {
  if (!bookingId || !guestEmail) {
    return { error: 'Booking ID and email are required' }
  }

  const admin = createAdminClient()

  // Fetch booking
  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('id, status, payment_method, start_date, start_time, reservation_fee, reservation_fee_status, stripe_rental_pi_id, guest_email, user_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: 'Booking not found' }
  }

  // Verify email ownership (guest_email or registered user email)
  const isOwner = await verifyBookingOwnership(admin, booking.user_id, booking.guest_email, guestEmail)
  if (!isOwner) {
    return { error: 'Booking not found' }
  }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return { error: 'This booking cannot be cancelled in its current state' }
  }

  // Cannot cancel once the booking period has started
  const bookingStart = new Date(booking.start_date + 'T00:00:00Z')
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  if (now >= bookingStart) {
    return { error: 'Bookings cannot be cancelled once the rental period has started' }
  }

  // Calculate hours until pickup start (using booked start time)
  const startDateStr = booking.start_date
  const startTimeStr = booking.start_time || '10:00'
  const [hours, minutes] = startTimeStr.split(':').map(Number)
  const pickupDate = new Date(startDateStr + 'T00:00:00Z')
  pickupDate.setUTCHours(hours, minutes, 0, 0)
  const hoursUntilStart = (pickupDate.getTime() - Date.now()) / (1000 * 60 * 60)

  const reservationFee = Number(booking.reservation_fee ?? 0)
  const lateCancel = hoursUntilStart <= 24

  // Determine outcome
  const refundAmount = lateCancel ? 0 : reservationFee
  const newReservationFeeStatus = lateCancel ? 'forfeited' : 'refunded'
  const forfeitReason = lateCancel ? 'late_cancel' : null

  // Issue Stripe refund on the rental PI (only for non-late cancels and
  // only if the fee was actually paid via Stripe). Cash/crypto paths are
  // handled manually by admin.
  let stripeRefundId: string | null = null
  if (
    !lateCancel &&
    refundAmount > 0 &&
    booking.reservation_fee_status === 'paid' &&
    booking.stripe_rental_pi_id
  ) {
    const { stripe } = await import('@/lib/stripe/server')
    if (stripe) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_rental_pi_id,
          amount: Math.round(refundAmount * 100), // AED -> fils
        })
        stripeRefundId = refund.id
      } catch (err) {
        console.error('cancelGuestBooking: stripe refund error', err)
        return { error: 'Failed to process refund. Please try again or contact support.' }
      }
    }
  }

  // Update booking record
  const { error: updateError } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      payment_status: lateCancel ? 'forfeited' : 'refunded',
      reservation_fee_status: newReservationFeeStatus,
      forfeit_reason: forfeitReason,
      cancelled_at: new Date().toISOString(),
      cancellation_fee: lateCancel ? reservationFee : 0,
      cancellation_refund_amount: refundAmount,
      stripe_refund_id: stripeRefundId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('cancelGuestBooking: update error', updateError)
    return { error: 'Failed to update booking after cancellation' }
  }

  return { success: true, refundAmount, forfeited: lateCancel }
}

// ---------------------------------------------------------------------------
// requestGuestDateModification
// ---------------------------------------------------------------------------

/**
 * Server Action — guest requests a date change, verified via email match.
 * Same constraints as requestDateModification.
 */
export async function requestGuestDateModification(
  bookingId: string,
  guestEmail: string,
  newStartDate: string,
  newEndDate: string
): Promise<{ success: true } | { error: string }> {
  if (!bookingId || !guestEmail) {
    return { error: 'Booking ID and email are required' }
  }

  const admin = createAdminClient()

  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('id, status, start_date, start_time, modification_status, guest_email, user_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: 'Booking not found' }
  }

  // Verify email ownership (guest_email or registered user email)
  const isOwner = await verifyBookingOwnership(admin, booking.user_id, booking.guest_email, guestEmail)
  if (!isOwner) {
    return { error: 'Booking not found' }
  }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return { error: 'Date changes can only be requested for pending or confirmed bookings' }
  }

  // Cannot modify once the booking period has started
  const modBookingStart = new Date(booking.start_date + 'T00:00:00Z')
  const modNow = new Date()
  modNow.setUTCHours(0, 0, 0, 0)
  if (modNow >= modBookingStart) {
    return { error: 'Date changes cannot be requested once the rental period has started' }
  }

  if (booking.modification_status === 'pending') {
    return { error: 'A date change request is already pending for this booking' }
  }

  // Must be >24hrs before current start
  const startTimeStr = booking.start_time || '10:00'
  const [hours, minutes] = startTimeStr.split(':').map(Number)
  const pickupDate = new Date(booking.start_date + 'T00:00:00Z')
  pickupDate.setUTCHours(hours, minutes, 0, 0)
  const hoursUntilStart = (pickupDate.getTime() - Date.now()) / (1000 * 60 * 60)

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
    console.error('requestGuestDateModification: update error', updateError)
    return { error: 'Failed to submit date change request' }
  }

  return { success: true }
}
