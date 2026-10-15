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
