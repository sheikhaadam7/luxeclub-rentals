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

  // 2. Fetch vehicle from DB (authoritative rates — never trust client)
  const admin = createAdminClient()
  const { data: vehicle, error: vehicleError } = await admin
    .from('vehicles')
    .select('id, daily_rate, weekly_rate, monthly_rate, deposit_amount, is_available')
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

  // 5. Cash path — no Stripe involvement
  if (formData.paymentMethod === 'cash') {
    return {
      bookingId,
      rentalClientSecret: null,
      depositClientSecret: null,
      totalDue: pricing.totalDue,
      depositAmount: pricing.depositAmount,
    }
  }

  // 6. Card / wallet path — create PaymentIntents
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
