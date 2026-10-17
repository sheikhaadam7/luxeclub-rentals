'use client'

import { useEffect } from 'react'
import { trackPurchase } from '@/lib/analytics'

/**
 * Reports the sale for customers who came back via 3-D Secure.
 *
 * Those customers leave for their bank mid-payment and return straight
 * to this page, so they never pass through the wizard's success handler
 * where every other booking is reported. Without this they would be
 * invisible — and they are not a rare edge case: 3DS is mandatory for
 * most European-issued cards.
 *
 * Renders nothing. It exists because the page itself is an async server
 * component and cannot touch the browser.
 *
 * Safe on a refresh: trackPurchase fires at most once per booking, which
 * matters here because this URL keeps its query string and re-renders
 * the same success screen every time it is reloaded.
 */
export function PurchaseEvent({
  bookingId,
  totalDue,
  vehicleSlug,
  vehicleName,
}: {
  bookingId: string
  totalDue: number
  vehicleSlug?: string | null
  vehicleName?: string | null
}) {
  useEffect(() => {
    trackPurchase({ bookingId, totalDue, vehicleSlug, vehicleName })
  }, [bookingId, totalDue, vehicleSlug, vehicleName])

  return null
}
