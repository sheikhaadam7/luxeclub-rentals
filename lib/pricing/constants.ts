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
export const RESERVATION_FEE_AED = 495
