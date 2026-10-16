/**
 * Flat reservation fee charged at booking time to secure the reservation.
 * The rest of the booking total is paid in person on pickup day.
 *
 * Forfeit policy:
 *   - Refunded in full if the customer cancels more than 24 hours before
 *     the booking start.
 *   - Non-refundable if the customer cancels within 24 hours of start,
 *     or fails to show up.
 *
 * If a booking total is less than this amount, the reservation fee is
 * capped at the booking total (the customer never pays more than owed).
 */
export const RESERVATION_FEE_AED = 450

/**
 * Shortest rental we will accept for a given vehicle.
 *
 * A car cheaper per day than the holding fee produces a booking where the
 * fee is effectively the whole rental -- a one-day GMC Yukon comes to
 * AED 452 against a 450 fee. Owner ruling: those cars take a two-day
 * minimum.
 *
 * Applied by daily rate rather than by computed total, so the answer is
 * the same before any dates, zones or add-ons are chosen and the customer
 * is told at the point they pick dates instead of being refused at
 * checkout.
 *
 * Lives beside the fee it depends on, and is called by BOTH the duration
 * step and createBooking -- the client decides what to show, the server
 * decides what to accept.
 */
export function minimumRentalDays(dailyRate: number | null | undefined): number {
  return (dailyRate ?? 0) > 0 && (dailyRate as number) < RESERVATION_FEE_AED ? 2 : 1
}

/**
 * Daily mileage allowance included in every rental — matches the figure
 * displayed on each vehicle's catalogue page (i18n key vehicle.mileagePerDay).
 */
export const DAILY_KM_INCLUDED = 250

/**
 * Per-km charge for any distance over the daily allowance — matches the
 * figure shown on the catalogue pages' "Additional Mileage Charge" row.
 */
export const EXTRA_KM_RATE_AED = 20

/**
 * The No Deposit Option (skip the security deposit for a tiered
 * surcharge) was withdrawn on 2026-10-16. The machinery is intact --
 * flip this to `true` to bring the add-on row, the tiered fee and the
 * under-24 gating all back.
 *
 * Read by StepAddons (hides the row), BookingWizard (ignores a restored
 * `no_deposit` from sessionStorage) and createBooking (clamps the value
 * server-side, which is the actual enforcement).
 */
export const NO_DEPOSIT_OPTION_ENABLED = false
