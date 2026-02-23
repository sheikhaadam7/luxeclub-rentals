'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  calculateBookingTotal,
  type BookingPricingInput,
} from '@/lib/pricing/calculator'
import type { BookingFormValues } from '@/lib/validations/booking'
import {
  createRentalPaymentIntent,
  createSetupIntent,
} from '@/app/actions/payments'
import { sendEmail } from '@/lib/email/send'
import { BookingConfirmationEmail } from '@/components/email/BookingConfirmationEmail'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateBookingResult {
  bookingId: string
  /** Client secret for the rental PaymentIntent (null for cash payments) */
  rentalClientSecret: string | null
  /** Client secret for the SetupIntent (card-on-file for cash bookings) */
  setupClientSecret: string | null
  /** Server-validated price breakdown */
  totalDue: number
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
  deposit_amount: number
  total_due: number
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
export async function createBooking(
  formData: BookingFormValues,
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

  // 3. Server-side price recalculation
  const pricingInput: BookingPricingInput = {
    startDate: new Date(formData.startDate),
    endDate: new Date(formData.endDate),
    durationType: formData.durationType,
    pickupMethod: formData.pickupMethod,
    returnMethod: formData.returnMethod,
    depositChoice: formData.depositChoice,
  }

  const pricing = calculateBookingTotal(vehicle, pricingInput)

  // 4. Insert booking row
  const { data: booking, error: insertError } = await admin
    .from('bookings')
    .insert({
      vehicle_id: vehicleId,
      user_id: userId,
      guest_name: guestInfo?.name ?? null,
      guest_email: guestInfo?.email ?? null,
      guest_phone: guestInfo?.phone ?? null,
      start_date: formData.startDate.toISOString().split('T')[0],
      end_date: formData.endDate.toISOString().split('T')[0],
      duration_type: formData.durationType,
      start_time: formData.startTime ?? null,
      end_time: formData.endTime ?? null,
      pickup_method: formData.pickupMethod,
      delivery_address: formData.deliveryAddress ?? null,
      delivery_lat: formData.deliveryLat ?? null,
      delivery_lng: formData.deliveryLng ?? null,
      return_method: formData.returnMethod,
      collection_address: formData.collectionAddress ?? null,
      collection_lat: formData.collectionLat ?? null,
      collection_lng: formData.collectionLng ?? null,
      deposit_choice: formData.depositChoice,
      deposit_amount: pricing.depositAmount,
      rental_subtotal: pricing.rentalSubtotal,
      delivery_fee: pricing.deliveryFee,
      return_fee: pricing.returnFee,
      no_deposit_surcharge: pricing.noDepositSurcharge,
      total_due: pricing.totalDue,
      payment_method: formData.paymentMethod,
      status: 'pending',
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

  // 5. Send confirmation email (non-blocking — failure does not fail booking)
  try {
    let recipientEmail: string | undefined
    if (userId) {
      const { data: { user } } = await supabase.auth.getUser()
      recipientEmail = user?.email ?? undefined
    } else {
      recipientEmail = guestInfo?.email
    }

    if (recipientEmail) {
      const startDateStr = formData.startDate.toISOString().split('T')[0]
      const endDateStr = formData.endDate.toISOString().split('T')[0]

      await sendEmail({
        to: recipientEmail,
        subject: `Booking Confirmed — ${vehicle.name}`,
        react: BookingConfirmationEmail({
          booking: {
            id: bookingId,
            vehicleName: vehicle.name,
            vehicleImage: vehicle.primary_image_url ?? null,
            startDate: startDateStr,
            endDate: endDateStr,
            durationType: formData.durationType as 'daily' | 'weekly' | 'monthly',
            pickupMethod: formData.pickupMethod as 'delivery' | 'self_pickup',
            returnMethod: formData.returnMethod as 'collection' | 'self_dropoff',
            deliveryAddress: formData.deliveryAddress ?? null,
            depositChoice: formData.depositChoice,
            rentalSubtotal: pricing.rentalSubtotal,
            deliveryFee: pricing.deliveryFee,
            returnFee: pricing.returnFee,
            noDepositSurcharge: pricing.noDepositSurcharge,
            depositAmount: pricing.depositAmount,
            totalDue: pricing.totalDue,
            paymentMethod: formData.paymentMethod,
            status: formData.paymentMethod === 'cash' ? 'pending_cash' : 'pending',
          },
        }),
      })
    }
  } catch (emailError) {
    // Email failure must never fail the booking — log and continue
    console.error('createBooking: email send failed (non-fatal)', emailError)
  }

  // 6. Crypto path — no Stripe involvement
  if (formData.paymentMethod === 'crypto') {
    return {
      bookingId,
      rentalClientSecret: null,
      setupClientSecret: null,
      totalDue: pricing.totalDue,
      depositAmount: pricing.depositAmount,
    }
  }

  // 6b. Cash path — create SetupIntent for card-on-file guarantee
  if (formData.paymentMethod === 'cash') {
    if (!process.env.STRIPE_SECRET_KEY) {
      // Test mode — no Stripe key, skip card-on-file
      return {
        bookingId,
        rentalClientSecret: null,
        setupClientSecret: null,
        totalDue: pricing.totalDue,
        depositAmount: pricing.depositAmount,
      }
    }

    const setupResult = await createSetupIntent(bookingId, userId ?? 'guest')
    if ('error' in setupResult) {
      return { error: `Card-on-file setup failed: ${setupResult.error}` }
    }

    return {
      bookingId,
      rentalClientSecret: null,
      setupClientSecret: setupResult.clientSecret,
      totalDue: pricing.totalDue,
      depositAmount: pricing.depositAmount,
    }
  }

  // 7. Card / wallet path — create PaymentIntents
  // Test mode: skip Stripe when key is not configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      bookingId,
      rentalClientSecret: null,
      setupClientSecret: null,
      totalDue: pricing.totalDue,
      depositAmount: pricing.depositAmount,
    }
  }

  const rentalResult = await createRentalPaymentIntent(bookingId, pricing.totalDue, userId ?? 'guest')
  if ('error' in rentalResult) {
    return { error: rentalResult.error }
  }

  return {
    bookingId,
    rentalClientSecret: rentalResult.clientSecret,
    setupClientSecret: null,
    totalDue: pricing.totalDue,
    depositAmount: pricing.depositAmount,
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
 * Policy:
 * - >24 hours before pickup: free cancellation, full refund
 * - <=24 hours before pickup: one-day rental fee charged, partial refund
 * - Cash bookings cannot be cancelled online
 *
 * Issues a Stripe refund on the rental PI, and voids the deposit PI if exists.
 */
export async function cancelBooking(
  bookingId: string
): Promise<{ success: true; refundAmount: number; cancellationFee: number } | { error: string }> {
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
    .select('id, status, payment_method, start_date, start_time, total_due, vehicle_id, stripe_rental_pi_id, stripe_deposit_pi_id, stripe_payment_method_id')
    .eq('id', bookingId)
    .eq('user_id', claims.sub)
    .single()

  if (fetchError || !booking) {
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

  // Calculate hours until pickup start
  const startDateStr = booking.start_date
  const startTimeStr = booking.start_time || '10:00'
  const [hours, minutes] = startTimeStr.split(':').map(Number)
  const pickupDate = new Date(startDateStr + 'T00:00:00Z')
  pickupDate.setUTCHours(hours, minutes, 0, 0)
  const hoursUntilStart = (pickupDate.getTime() - Date.now()) / (1000 * 60 * 60)

  // Fetch vehicle daily rate
  const { data: vehicle } = await admin
    .from('vehicles')
    .select('daily_rate')
    .eq('id', booking.vehicle_id)
    .single()

  const dailyRate = vehicle?.daily_rate ?? 0
  const totalDue = booking.total_due ?? 0

  // Determine fee and refund
  let cancellationFee = 0
  let refundAmount = totalDue

  if (hoursUntilStart <= 24) {
    cancellationFee = dailyRate
    refundAmount = Math.max(0, totalDue - dailyRate)
  }

  const { stripe } = await import('@/lib/stripe/server')
  let stripeRefundId: string | null = null
  let paymentStatus = 'refunded'

  if (booking.payment_method === 'cash') {
    // Cash booking — charge saved card-on-file for cancellation fee
    if (cancellationFee > 0 && booking.stripe_payment_method_id && stripe) {
      try {
        await stripe.paymentIntents.create({
          amount: Math.round(cancellationFee * 100), // AED → fils
          currency: 'aed',
          payment_method: booking.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          metadata: {
            booking_id: bookingId,
            type: 'cancellation_fee',
          },
        })
      } catch (err) {
        console.error('cancelBooking: cash cancellation charge error', err)
        return { error: 'Failed to charge cancellation fee. Please contact us directly.' }
      }
    } else if (cancellationFee > 0 && !booking.stripe_payment_method_id) {
      return { error: 'Cash bookings without a card on file cannot be cancelled online. Please contact us directly.' }
    }
    // Cash bookings have no rental PI to refund
    refundAmount = 0
    paymentStatus = cancellationFee > 0 ? 'cancellation_charged' : 'cancelled'
  } else {
    // Card/wallet booking — issue Stripe refund on rental PI
    if (booking.stripe_rental_pi_id && stripe) {
      try {
        if (refundAmount > 0) {
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripe_rental_pi_id,
            amount: Math.round(refundAmount * 100), // AED -> fils
          })
          stripeRefundId = refund.id
        }
      } catch (err) {
        console.error('cancelBooking: stripe refund error', err)
        return { error: 'Failed to process refund. Please try again or contact support.' }
      }
    }

    // Void deposit PI if exists (non-fatal)
    if (booking.stripe_deposit_pi_id && stripe) {
      try {
        await stripe.paymentIntents.cancel(booking.stripe_deposit_pi_id)
      } catch {
        // Non-fatal — deposit may already be voided/captured
      }
    }
  }

  // Update booking record
  const { error: updateError } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      payment_status: paymentStatus,
      cancelled_at: new Date().toISOString(),
      cancellation_fee: cancellationFee,
      cancellation_refund_amount: refundAmount,
      stripe_refund_id: stripeRefundId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('cancelBooking: update error', updateError)
    return { error: 'Failed to update booking after cancellation' }
  }

  return { success: true, refundAmount, cancellationFee }
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
    console.error('requestDateModification: update error', updateError)
    return { error: 'Failed to submit date change request' }
  }

  return { success: true }
}
