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
  createDepositPaymentIntent,
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
  /** Client secret for the deposit PaymentIntent (null for cash or no-deposit) */
  depositClientSecret: string | null
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
  vehicleId: string
): Promise<CreateBookingResult | { error: string }> {
  // 1. Authenticate
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims?.sub) {
    return { error: 'You must be logged in to book a vehicle' }
  }

  const userId = claims.sub
  const admin = createAdminClient()

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
      start_date: formData.startDate.toISOString().split('T')[0],
      end_date: formData.endDate.toISOString().split('T')[0],
      duration_type: formData.durationType,
      start_time: formData.startTime ?? null,
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
        formData.paymentMethod === 'cash' ? 'pending_cash' : 'unpaid',
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const startDateStr = formData.startDate.toISOString().split('T')[0]
      const endDateStr = formData.endDate.toISOString().split('T')[0]

      await sendEmail({
        to: user.email,
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

  // 6. Cash path — no Stripe involvement
  if (formData.paymentMethod === 'cash') {
    return {
      bookingId,
      rentalClientSecret: null,
      depositClientSecret: null,
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
      depositClientSecret: null,
      totalDue: pricing.totalDue,
      depositAmount: pricing.depositAmount,
    }
  }

  const rentalResult = await createRentalPaymentIntent(bookingId, pricing.totalDue)
  if ('error' in rentalResult) {
    return { error: rentalResult.error }
  }

  let depositClientSecret: string | null = null
  if (formData.depositChoice === 'deposit' && pricing.depositAmount > 0) {
    const depositResult = await createDepositPaymentIntent(
      bookingId,
      pricing.depositAmount
    )
    if ('error' in depositResult) {
      return { error: depositResult.error }
    }
    depositClientSecret = depositResult.clientSecret
  }

  return {
    bookingId,
    rentalClientSecret: rentalResult.clientSecret,
    depositClientSecret,
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
