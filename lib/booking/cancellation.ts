import { RESERVATION_FEE_AED } from '@/lib/pricing/constants'

/**
 * Cancellation settlement — one implementation, two callers.
 *
 * `cancelBooking` (signed-in) and `cancelGuestBooking` (lookup page) each
 * carried their own copy of this arithmetic. That was survivable while
 * every booking held the same flat AED 450; once a card customer can have
 * thousands with us, two copies means one of them refunds the wrong
 * amount and nobody notices until a customer complains.
 *
 * Policy, per owner ruling:
 *
 *   more than 24h before the rental starts -> refund everything paid
 *   within 24h                             -> keep AED 450, refund the rest
 *
 * Pay-on-delivery behaves exactly as it did before: the customer paid 450,
 * so a late cancellation keeps all of it and refunds nothing.
 */

export interface CancellableBooking {
  start_date: string
  start_time: string | null
  reservation_fee: number | null
  amount_paid: number | null
  reservation_fee_status: string | null
  stripe_rental_pi_id: string | null
}

export interface CancellationSettlement {
  lateCancel: boolean
  /** What goes back to the customer. */
  refundAmount: number
  /** What we keep. Zero outside the 24-hour window. */
  cancellationFee: number
  stripeRefundId: string | null
  paymentStatus: 'refunded' | 'partially_refunded' | 'forfeited'
  reservationFeeStatus: 'refunded' | 'partially_refunded' | 'forfeited'
  forfeitReason: 'late_cancel' | null
}

/** Hours between now and the agreed pickup moment. */
export function hoursUntilStart(booking: CancellableBooking): number {
  const [hours, minutes] = (booking.start_time || '10:00').split(':').map(Number)
  const pickup = new Date(booking.start_date + 'T00:00:00Z')
  pickup.setUTCHours(hours, minutes, 0, 0)
  return (pickup.getTime() - Date.now()) / (1000 * 60 * 60)
}

/**
 * Work out the refund and issue it.
 *
 * The amount refunded is read from STRIPE, not from our own row. A
 * signed-in customer can currently update their own booking directly, so
 * a figure taken from the row could be made up; the charge on the
 * PaymentIntent cannot. That also means we can never refund more than was
 * actually captured, whatever the database says.
 *
 * Returns `{ error }` if the Stripe refund fails, so the caller can
 * abandon the cancellation rather than mark a booking refunded that was
 * not.
 */
export async function settleCancellation(
  booking: CancellableBooking
): Promise<CancellationSettlement | { error: string }> {
  const lateCancel = hoursUntilStart(booking) <= 24
  const wasPaid = booking.reservation_fee_status === 'paid'

  // What the customer actually handed over. Prefer Stripe's own figure;
  // fall back to the row for cash and crypto, and to reservation_fee for
  // bookings taken before amount_paid existed.
  let amountPaid = Number(booking.amount_paid ?? booking.reservation_fee ?? 0)
  let stripe: typeof import('@/lib/stripe/server')['stripe'] | null = null

  if (wasPaid && booking.stripe_rental_pi_id && process.env.STRIPE_SECRET_KEY) {
    try {
      stripe = (await import('@/lib/stripe/server')).stripe
      if (stripe) {
        const pi = await stripe.paymentIntents.retrieve(booking.stripe_rental_pi_id)
        amountPaid = (pi.amount_received ?? 0) / 100
      }
    } catch (err) {
      console.error('settleCancellation: could not read the payment', err)
      return { error: 'Could not verify the payment. Please contact support.' }
    }
  }

  // Capped at what was paid, so a rental cheaper than the fee can never
  // forfeit more than it cost.
  const nonRefundable = lateCancel
    ? Math.min(Number(booking.reservation_fee ?? RESERVATION_FEE_AED), amountPaid)
    : 0
  const refundAmount = Math.round(Math.max(0, amountPaid - nonRefundable) * 100) / 100
  const cancellationFee = Math.round((amountPaid - refundAmount) * 100) / 100

  // Issue the refund. Deliberately NOT gated on `!lateCancel`: a late
  // cancellation on a prepaid booking still owes the customer everything
  // above the 450, and the old guard would have recorded that refund
  // without ever sending it.
  let stripeRefundId: string | null = null
  if (refundAmount > 0 && wasPaid && booking.stripe_rental_pi_id && stripe) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripe_rental_pi_id,
        amount: Math.round(refundAmount * 100),
      })
      stripeRefundId = refund.id
    } catch (err) {
      console.error('settleCancellation: stripe refund error', err)
      return { error: 'Failed to process refund. Please try again or contact support.' }
    }
  }

  const status =
    refundAmount === 0 ? 'forfeited' : cancellationFee === 0 ? 'refunded' : 'partially_refunded'

  return {
    lateCancel,
    refundAmount,
    cancellationFee,
    stripeRefundId,
    paymentStatus: status,
    reservationFeeStatus: status,
    forfeitReason: lateCancel ? 'late_cancel' : null,
  }
}
