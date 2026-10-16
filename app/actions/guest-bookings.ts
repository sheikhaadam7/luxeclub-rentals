'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { BookingDetail } from '@/app/actions/bookings'
import { settleCancellation } from '@/lib/booking/cancellation'
import { pickupInstant, hoursUntilPickup, isDateKey, businessTodayKey } from '@/lib/dates'

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
  protection_package,
  addons,
  delivery_location,
  protection_surcharge,
  addons_total,
  card_surcharge,
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
    .select('id, status, payment_method, start_date, start_time, reservation_fee, amount_paid, amount_due_now, reservation_fee_status, stripe_rental_pi_id, guest_email, user_id')
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

  // Cannot cancel once the rental has actually begun. Measured from the
  // agreed pickup moment in Dubai, not from UTC midnight -- the old
  // version left cancellation open until 4am Dubai on the pickup day.
  if (pickupInstant(booking.start_date, booking.start_time) <= new Date()) {
    return { error: 'Bookings cannot be cancelled once the rental period has started' }
  }

  const settlement = await settleCancellation(booking)
  if ('error' in settlement) return { error: settlement.error }
  const { lateCancel, refundAmount } = settlement

  // Update booking record
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
  if (!isDateKey(newStartDate) || !isDateKey(newEndDate)) {
    return { error: 'Invalid dates provided' }
  }

  // Measured against Dubai's day, and against the booking's EXISTING
  // pickup time -- this action receives dates only, so there is no new
  // time to validate.
  if (newStartDate < businessTodayKey()) {
    return { error: 'That pickup date has already passed. Please choose a later date.' }
  }
  if (pickupInstant(newStartDate, booking.start_time) <= new Date()) {
    return { error: 'That pickup time has already passed. Please choose a later date.' }
  }

  // Compared as day strings -- 'YYYY-MM-DD' sorts correctly as text.
  // Overnight minimum, same as a new booking.
  if (newEndDate <= newStartDate) {
    return { error: 'A rental runs overnight — please choose a return date after your pickup date.' }
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
