'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking } from '@/app/actions/bookings'
import { useCurrency } from '@/lib/currency/context'

interface CancelBookingButtonProps {
  bookingId: string
  dailyRate: number
  totalDue: number
  hoursUntilStart: number
}

export default function CancelBookingButton({
  bookingId,
  dailyRate,
  totalDue,
  hoursUntilStart,
}: CancelBookingButtonProps) {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [phase, setPhase] = useState<'initial' | 'confirm' | 'success'>('initial')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultData, setResultData] = useState<{ refundAmount: number; cancellationFee: number } | null>(null)

  const isFree = hoursUntilStart > 24
  const cancellationFee = isFree ? 0 : dailyRate
  const refundAmount = isFree ? totalDue : Math.max(0, totalDue - dailyRate)

  async function handleConfirmCancel() {
    setLoading(true)
    setError(null)

    const result = await cancelBooking(bookingId)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setResultData({ refundAmount: result.refundAmount, cancellationFee: result.cancellationFee })
    setPhase('success')
    setLoading(false)

    // Refresh page after a short delay so user can see the success message
    setTimeout(() => router.refresh(), 2000)
  }

  if (phase === 'success' && resultData) {
    return (
      <div className="rounded-lg border border-green-800 bg-green-950/40 p-4 space-y-2">
        <p className="text-sm font-medium text-green-300">Booking cancelled successfully</p>
        {resultData.refundAmount > 0 && (
          <p className="text-sm text-green-300/80">
            Refund of {formatPrice(resultData.refundAmount)} will be processed to your original payment method.
          </p>
        )}
        {resultData.cancellationFee > 0 && (
          <p className="text-sm text-yellow-300/80">
            A cancellation fee of {formatPrice(resultData.cancellationFee)} (one-day rental) was applied.
          </p>
        )}
      </div>
    )
  }

  if (phase === 'confirm') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-brand-border bg-brand-black/50 p-4 space-y-3">
          <p className="text-sm font-medium text-white">Cancellation Summary</p>

          {isFree ? (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Cancellation fee</span>
                <span className="text-green-400">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Refund amount</span>
                <span className="text-white">{formatPrice(totalDue)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Cancellation fee (one-day rental)</span>
                <span className="text-yellow-400">{formatPrice(cancellationFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Refund amount</span>
                <span className="text-white">{formatPrice(refundAmount)}</span>
              </div>
              <p className="text-xs text-brand-muted/70 pt-1">
                Cancellations within 24 hours of pickup incur a one-day rental fee.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirmCancel}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
          <button
            onClick={() => { setPhase('initial'); setError(null) }}
            disabled={loading}
            className="rounded-lg border border-brand-border px-4 py-3 text-sm font-medium text-brand-muted hover:text-white hover:border-brand-border-hover transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setPhase('confirm')}
      className="w-full rounded-lg border border-red-500/30 px-6 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
    >
      Cancel Booking
    </button>
  )
}
