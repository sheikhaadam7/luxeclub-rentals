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
}

/**
 * Complete pricing breakdown for a booking.
 * All monetary values are in AED.
 */
export interface BookingPriceBreakdown {
  /** The per-unit rate (daily, weekly, or monthly) */
  baseRate: number
  /** Number of days in the rental (inclusive) */
  rentalDays: number
  /** baseRate * number of rental units (days/weeks/months) */
  rentalSubtotal: number
  /** 50 AED if delivery chosen, 0 if self-pickup */
  deliveryFee: number
  /** 50 AED if collection chosen, 0 if self-dropoff */
  returnFee: number
  /** Per-vehicle deposit amount (from vehicles.deposit_amount, fallback 5000 AED) */
  depositAmount: number
  /** 30% of daily_rate * rentalDays if no-deposit chosen, 0 otherwise */
  noDepositSurcharge: number
  /** rentalSubtotal + deliveryFee + returnFee + noDepositSurcharge
   *  Note: deposit is authorized separately and NOT included in totalDue */
  totalDue: number
}

/**
 * Pure pricing function — no side effects, no network calls.
 * Calculates the complete price breakdown for a booking.
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
    durationType,
    pickupMethod,
    returnMethod,
    depositChoice,
  } = formValues

  // Number of days in the rental (inclusive: same-day rental = 1)
  const rentalDays = differenceInDays(endDate, startDate) + 1

  // Per-unit base rate and rental subtotal
  let baseRate: number
  let rentalSubtotal: number

  const dailyRate = vehicle.daily_rate ?? 0

  switch (durationType) {
    case 'daily':
      baseRate = dailyRate
      rentalSubtotal = Math.round(baseRate * rentalDays * 100) / 100
      break

    case 'weekly': {
      baseRate = vehicle.weekly_rate ?? dailyRate * 7
      const weeks = Math.ceil(rentalDays / 7)
      rentalSubtotal = Math.round(baseRate * weeks * 100) / 100
      break
    }

    case 'monthly': {
      baseRate = vehicle.monthly_rate ?? dailyRate * 30
      const months = Math.ceil(rentalDays / 30)
      rentalSubtotal = Math.round(baseRate * months * 100) / 100
      break
    }
  }

  // Delivery and return fees (50 AED flat)
  const deliveryFee = pickupMethod === 'delivery' ? 50 : 0
  const returnFee = returnMethod === 'collection' ? 50 : 0

  // Deposit: either hold per-vehicle amount or charge a 30% daily surcharge
  const depositAmount =
    depositChoice === 'deposit' ? (vehicle.deposit_amount ?? 5000) : 0

  const noDepositSurcharge =
    depositChoice === 'no_deposit'
      ? Math.round(dailyRate * 0.3 * rentalDays * 100) / 100
      : 0

  // Total due (deposit is authorized separately, NOT included)
  const totalDue =
    Math.round(
      (rentalSubtotal + deliveryFee + returnFee + noDepositSurcharge) * 100
    ) / 100

  return {
    baseRate,
    rentalDays,
    rentalSubtotal,
    deliveryFee,
    returnFee,
    depositAmount,
    noDepositSurcharge,
    totalDue,
  }
}
