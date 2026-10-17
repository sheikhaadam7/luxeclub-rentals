/**
 * Telling Google that a booking completed.
 *
 * One event, fired once, carrying the real revenue. Everything in here
 * exists to stop it reporting something untrue, because a wrong number
 * is worse than no number: Google optimises against it, and the owner
 * spends real money on the consequences.
 *
 * Deliberately NOT a Google Ads tag. The site already loads gtag.js, the
 * GA4 property is already linked to the Ads account, and auto-tagging is
 * on — so Google matches the sale to the ad by itself. A second tag
 * would duplicate work and risk double counting.
 */

/** Shared between every call site. Two hand-written keys would not match. */
export function purchaseEventKey(bookingId: string): string {
  return `lc_purchase_${bookingId}`
}

/**
 * True when the site is running against Stripe test keys.
 *
 * The owner tests on the real production site with test cards, so
 * gating analytics by deploy target does not help — a production test
 * booking would report as a real sale. The key is what actually
 * distinguishes a rehearsal from a customer.
 */
function isTestPayments(): boolean {
  return (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_test')
}

interface PurchaseInput {
  bookingId: string
  /**
   * The FULL rental total, never the amount collected online.
   *
   * Pay-on-delivery collects AED 450 now and the rest at handover;
   * reporting that figure would teach Google every cash customer is
   * worth 450 and it would stop bidding for them.
   */
  totalDue: number
  vehicleSlug?: string | null
  vehicleName?: string | null
}

/**
 * Report a completed booking. Safe to call more than once — it fires at
 * most once per booking.
 *
 * Returns true only if an event was actually queued, so callers and
 * tests can tell "suppressed" from "sent".
 */
export function trackPurchase({
  bookingId,
  totalDue,
  vehicleSlug,
  vehicleName,
}: PurchaseInput): boolean {
  if (typeof window === 'undefined') return false

  // A rehearsal, not a sale.
  if (isTestPayments()) return false

  // Guards against the paths that reach a "success" handler without a
  // payment: crypto fires on invoice open, and two fallback buttons
  // confirm a booking with no money at all. Those arrive with an empty
  // id or a zero total. A purchase reported as AED 0 is worse than none
  // — it drags down the average conversion value Google bids against.
  if (!bookingId) return false
  if (!Number.isFinite(totalDue) || totalDue <= 0) return false

  const key = purchaseEventKey(bookingId)

  // Fire-once. localStorage rather than sessionStorage because the
  // confirmation URL can be reopened in a NEW tab from history, which
  // starts a fresh session and would report the sale twice.
  try {
    if (window.localStorage.getItem(key)) return false
  } catch {
    // Storage blocked. Fire anyway and let the Ads conversion's
    // "Count: One" setting absorb a duplicate — under-reporting a real
    // sale is the worse error.
  }

  // Pushed to dataLayer rather than calling gtag(). The library loads
  // with strategy="afterInteractive", so gtag may not exist yet; the
  // queue is replayed once it does, and the event is not lost.
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: bookingId,
      value: totalDue,
      currency: 'AED',
      items:
        vehicleSlug && vehicleName
          ? [
              {
                item_id: vehicleSlug,
                item_name: vehicleName,
                price: totalDue,
                quantity: 1,
              },
            ]
          : undefined,
    },
  })

  // Written AFTER dispatch, never before: marking it first would mean a
  // dropped event permanently blocks the retry when the customer
  // returns via the 3-D Secure page.
  try {
    window.localStorage.setItem(key, String(Date.now()))
  } catch {
    // Non-fatal — see above.
  }

  return true
}
