import { differenceInDays } from 'date-fns'
import { RESERVATION_FEE_AED } from './constants'

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

/** Per-day prices for opt-in add-ons (AED). */
export const ADDON_PRICES = {
  additionalDriver: 31.95,
  personalDriver: 450,
  babySeat: 24.95,
  childSeat: 24.95,
} as const

/**
 * Delivery-zone fees (AED). Charged once and covers BOTH the delivery to the
 * customer AND collection at the end of the rental. Self-pickup from our office
 * (Business Bay / Downtown Dubai) is free.
 */
export const DELIVERY_ZONE_FEES: Record<string, number> = {
  within_dubai: 220,
  al_maktoum_airport: 200,
  sharjah_airport: 200,
  sharjah_city: 200,
  ajman: 500,
  abu_dhabi: 1000,
  al_ain: 1000,
  fujairah: 1000,
  ras_al_khaimah: 1000,
}

/**
 * Customer-facing name for each delivery zone.
 *
 * Lives here, beside the fees, because the SERVER needs it: for any zone
 * other than Dubai there is no free-text address field, so the zone name is
 * what gets stored as the delivery address. It previously existed only
 * inside two 'use client' components, where server code cannot reach it.
 *
 * One copy. Two drifting copies of a delivery constant is exactly how the
 * picker came to show AED 100 while the calculator charged something else.
 */
export const DELIVERY_ZONE_LABELS: Record<string, string> = {
  within_dubai: 'Dubai Delivery & Collection Fee',
  al_maktoum_airport: 'Al Maktoum Airport',
  sharjah_airport: 'Sharjah Airport',
  sharjah_city: 'Sharjah City',
  ajman: 'Ajman',
  abu_dhabi: 'Abu Dhabi',
  al_ain: 'Al Ain',
  fujairah: 'Fujairah',
  ras_al_khaimah: 'Ras Al Khaimah',
}

/** Daily surcharge for the All Inclusive Protection package (AED). */
export const ALL_INCLUSIVE_PROTECTION_PER_DAY = 72.8

/**
 * Processing surcharge rate, applied to every booking.
 *
 * It is NOT waived on pay-on-delivery, only deferred: the 450 is taken by
 * card either way, and the balance settled at handover carries the rest of
 * the 3%. Zeroing it for `cash` made that option genuinely 3% cheaper,
 * which rewarded the path we least want a customer to take.
 *
 * Shown to customers as "Booking & processing fee" -- calling it a card
 * surcharge while charging it to someone paying on delivery is the kind of
 * thing a UAE consumer complaint is made of.
 */
export const CREDIT_CARD_SURCHARGE_PCT = 3

/**
 * One-time No Deposit Option surcharge, tiered by rental length (AED).
 * 1–7 days = 200, 8–14 = 350, 15–21 = 500, 22–30 = 650.
 * 31+ extends pattern: +150 per extra 7-day block beyond 30.
 */
export function noDepositTierFee(days: number): number {
  if (days <= 7) return 200
  if (days <= 14) return 350
  if (days <= 21) return 500
  if (days <= 30) return 650
  return 650 + Math.ceil((days - 30) / 7) * 150
}

export interface BookingAddons {
  additionalDriver: boolean
  personalDriver: boolean
  babySeat: boolean
  childSeat: boolean
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
  /** Zone key from DELIVERY_ZONE_FEES (only used when pickupMethod === 'delivery') */
  deliveryLocation?: string
  depositChoice: 'deposit' | 'no_deposit'
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay' | 'cash' | 'crypto'
  protectionPackage?: 'basic' | 'inclusive'
  addons?: BookingAddons
}

/**
 * Complete pricing breakdown for a booking. All monetary values are in AED.
 */
export interface BookingPriceBreakdown {
  baseRate: number
  rentalDays: number
  discountPercent: number
  rentalSubtotal: number
  /** Daily protection surcharge (AED 72.80/day × days) when package = 'inclusive'. */
  protectionSurcharge: number
  /** Per-add-on totals (price × days) when toggled on. */
  addonBreakdown: {
    additionalDriver: number
    personalDriver: number
    babySeat: number
    childSeat: number
    total: number
  }
  /** Tiered one-time No Deposit Option fee. */
  noDepositSurcharge: number
  deliveryFee: number
  returnFee: number
  depositAmount: number
  /** Sum of all line items BEFORE the credit-card surcharge. */
  preCardTotal: number
  /** 3% of preCardTotal when paymentMethod !== 'cash'. Otherwise 0. */
  creditCardSurcharge: number
  /** Final amount the customer pays for the booking (excludes the depositAmount hold). */
  totalDue: number
  /**
   * The non-refundable slice forfeited by a late cancellation, capped at
   * totalDue. A bookkeeping marker, NOT the amount charged — see
   * amountDueNow.
   */
  reservationFee: number
  /**
   * What is actually taken online at checkout. Full totalDue for card,
   * wallet and crypto; the capped holding fee for pay-on-delivery.
   */
  amountDueNow: number
  /** What's owed in person at handover (totalDue - amountDueNow). */
  balanceDueOnPickup: number
  /** Same field kept for backwards compat with older code paths. Always 0 now. */
  paymentSurchargePercent: number
  paymentSurcharge: number
  reservationFeeWithSurcharge: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Pure pricing function — no side effects, no network calls.
 * Calculates the complete price breakdown for a booking.
 *
 * Discount tiers (based on rental days):
 * - 1–6 days: daily rate (no discount)
 * - 7–29 days: 10% off daily rate
 * - 30+ days: 20% off daily rate
 */
export function calculateBookingTotal(
  vehicle: VehicleForPricing,
  formValues: BookingPricingInput
): BookingPriceBreakdown {
  const {
    startDate,
    endDate,
    pickupMethod,
    depositChoice,
    paymentMethod,
    protectionPackage,
    addons,
  } = formValues

  // Number of rental days (minimum 1)
  const rentalDays = Math.max(differenceInDays(endDate, startDate), 1)

  const dailyRate = vehicle.daily_rate ?? 0

  // Discount tier based on rental length
  let discountPercent: number
  if (rentalDays >= 30) discountPercent = 20
  else if (rentalDays >= 7) discountPercent = 10
  else discountPercent = 0

  const baseRate = round2(dailyRate * (1 - discountPercent / 100))
  const rentalSubtotal = round2(baseRate * rentalDays)

  // Protection package surcharge (only All Inclusive adds a fee)
  const protectionSurcharge =
    protectionPackage === 'inclusive' ? round2(ALL_INCLUSIVE_PROTECTION_PER_DAY * rentalDays) : 0

  // Add-on surcharges — each price × days
  const a = addons ?? {
    additionalDriver: false,
    personalDriver: false,
    babySeat: false,
    childSeat: false,
  }
  const additionalDriver = a.additionalDriver ? round2(ADDON_PRICES.additionalDriver * rentalDays) : 0
  const personalDriver = a.personalDriver ? round2(ADDON_PRICES.personalDriver * rentalDays) : 0
  const babySeat = a.babySeat ? round2(ADDON_PRICES.babySeat * rentalDays) : 0
  const childSeat = a.childSeat ? round2(ADDON_PRICES.childSeat * rentalDays) : 0
  const addonTotal = round2(additionalDriver + personalDriver + babySeat + childSeat)

  const addonBreakdown = {
    additionalDriver,
    personalDriver,
    babySeat,
    childSeat,
    total: addonTotal,
  }

  // Delivery / return fees — single zone-based fee covering both legs.
  // Self-pickup from the office is free; delivery fee comes from the selected zone.
  const zoneFee =
    pickupMethod === 'delivery' && formValues.deliveryLocation
      ? DELIVERY_ZONE_FEES[formValues.deliveryLocation] ?? 0
      : 0
  const deliveryFee = zoneFee
  const returnFee = 0

  // No Deposit Option (tiered one-time)
  const noDepositSurcharge = depositChoice === 'no_deposit' ? noDepositTierFee(rentalDays) : 0

  // Deposit hold (NOT part of totalDue — it's a pre-auth hold released on return)
  const depositAmount = depositChoice === 'deposit' ? (vehicle.deposit_amount ?? 2500) : 0

  // Pre-card total: everything the customer is actually paying for (excludes the deposit hold)
  const preCardTotal = round2(
    rentalSubtotal +
      protectionSurcharge +
      addonTotal +
      noDepositSurcharge +
      deliveryFee +
      returnFee
  )

  // 3% processing surcharge, on every method. Pay-on-delivery defers it
  // into the balance rather than escaping it.
  const creditCardSurcharge = round2(preCardTotal * (CREDIT_CARD_SURCHARGE_PCT / 100))

  const totalDue = round2(preCardTotal + creditCardSurcharge)

  // The non-refundable slice a late cancellation forfeits. Capped at the
  // total, so a short cheap rental can never forfeit more than it cost.
  // This is NOT the amount charged -- see amountDueNow.
  const reservationFee = Math.min(RESERVATION_FEE_AED, totalDue)

  // What we actually take online at checkout.
  //
  // Card, wallet and crypto pay the whole rental now; pay-on-delivery pays
  // the holding fee and settles the rest at handover. Capped at totalDue
  // via reservationFee, because charging a flat 450 on a cheaper booking
  // would overcharge and push the balance negative.
  //
  // The 450 is a SLICE of the total, never an addition to it:
  // amountDueNow + balanceDueOnPickup === totalDue on every path.
  const amountDueNow = paymentMethod === 'cash' ? reservationFee : totalDue
  const balanceDueOnPickup = round2(totalDue - amountDueNow)

  return {
    baseRate,
    rentalDays,
    discountPercent,
    rentalSubtotal,
    protectionSurcharge,
    addonBreakdown,
    noDepositSurcharge,
    deliveryFee,
    returnFee,
    depositAmount,
    preCardTotal,
    creditCardSurcharge,
    totalDue,
    reservationFee,
    amountDueNow,
    balanceDueOnPickup,
    // Legacy fields — kept for backwards compatibility with older callers.
    paymentSurchargePercent: 0,
    paymentSurcharge: 0,
    reservationFeeWithSurcharge: reservationFee,
  }
}
