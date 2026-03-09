import { differenceInDays } from 'date-fns'

/**
 * Represents a vehicle record with only the fields needed for pricing.
 * Matches the vehicles table columns used by the calculator.
 */
export interface VehicleForPricing {
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
  deposit_amount: number | null
}

/**
 * Input parameters for the booking form values required by the calculator.
 */
export interface BookingPricingInput {
  startDate: Date
  endDate: Date
  durationType: 'daily' | 'weekly' | 'monthly'
  pickupMethod: 'delivery' | 'self_pickup'
  returnMethod: 'collection' | 'self_dropoff'
  depositChoice: 'deposit' | 'no_deposit'
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay' | 'cash' | 'crypto'
}

/**
 * Complete pricing breakdown for a booking.
 * All monetary values are in AED.
 */
export interface BookingPriceBreakdown {
  /** The per-day rate after any discount */
  baseRate: number
  /** Number of days in the rental */
  rentalDays: number
  /** Discount percentage applied (0, 10, or 20) */
  discountPercent: number
  /** baseRate * rentalDays */
  rentalSubtotal: number
  /** 50 AED if delivery chosen, 0 if self-pickup */
  deliveryFee: number
  /** 50 AED if collection chosen, 0 if self-dropoff */
  returnFee: number
  /** Per-vehicle deposit amount (from vehicles.deposit_amount, fallback 5000 AED) */
  depositAmount: number
  /** 30% of daily_rate * rentalDays if no-deposit chosen, 0 otherwise */
  noDepositSurcharge: number
  /** Payment processing surcharge percentage (0, 3, 5, or 7) */
  paymentSurchargePercent: number
  /** Payment processing surcharge amount */
  paymentSurcharge: number
  /** rentalSubtotal + deliveryFee + returnFee + noDepositSurcharge + paymentSurcharge
   *  Note: deposit is authorized separately and NOT included in totalDue */
  totalDue: number
}

/**
 * Pure pricing function — no side effects, no network calls.
 * Calculates the complete price breakdown for a booking.
 *
 * Discount tiers (based on rental days):
 * - 1–6 days: daily rate (no discount)
 * - 7–29 days: 10% off daily rate
 * - 30+ days: 20% off daily rate
 *
 * @param vehicle  - Vehicle with rate columns and deposit_amount
 * @param formValues - Booking wizard form values
 * @returns Complete pricing breakdown
 */
export function calculateBookingTotal(
  vehicle: VehicleForPricing,
  formValues: BookingPricingInput
): BookingPriceBreakdown {
  const {
    startDate,
    endDate,
    pickupMethod,
    returnMethod,
    depositChoice,
    paymentMethod,
  } = formValues

  // Number of rental days (minimum 1)
  const rentalDays = Math.max(differenceInDays(endDate, startDate), 1)

  const dailyRate = vehicle.daily_rate ?? 0

  // Discount tier based on rental length
  let discountPercent: number
  if (rentalDays >= 30) {
    discountPercent = 20
  } else if (rentalDays >= 7) {
    discountPercent = 10
  } else {
    discountPercent = 0
  }

  const baseRate = Math.round(dailyRate * (1 - discountPercent / 100) * 100) / 100
  const rentalSubtotal = Math.round(baseRate * rentalDays * 100) / 100

  // Delivery and return fees (50 AED flat)
  const deliveryFee = pickupMethod === 'delivery' ? 50 : 0
  const returnFee = returnMethod === 'collection' ? 50 : 0

  // Deposit: 1 day's rental at the full daily rate
  const depositAmount =
    depositChoice === 'deposit' ? dailyRate : 0

  const noDepositSurcharge = depositChoice === 'no_deposit' ? 200 : 0

  // Payment method surcharge
  let paymentSurchargePercent = 0
  if (paymentMethod === 'card') paymentSurchargePercent = 3
  else if (paymentMethod === 'apple_pay' || paymentMethod === 'google_pay') paymentSurchargePercent = 5

  const subtotalBeforeSurcharge = rentalSubtotal + deliveryFee + returnFee + noDepositSurcharge
  const paymentSurcharge =
    Math.round(subtotalBeforeSurcharge * (paymentSurchargePercent / 100) * 100) / 100

  // Total due (deposit is authorized separately, NOT included)
  const totalDue =
    Math.round(
      (subtotalBeforeSurcharge + paymentSurcharge) * 100
    ) / 100

  return {
    baseRate,
    rentalDays,
    discountPercent,
    rentalSubtotal,
    deliveryFee,
    returnFee,
    depositAmount,
    noDepositSurcharge,
    paymentSurchargePercent,
    paymentSurcharge,
    totalDue,
  }
}
