'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking } from '@/app/actions/bookings'
import { useCurrency } from '@/lib/currency/context'

interface CancelBookingButtonProps {
  bookingId: string
  reservationFee: number
  hoursUntilStart: number
}

export default function CancelBookingButton({
  bookingId,
  reservationFee,
  hoursUntilStart,
}: CancelBookingButtonProps) {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const [phase, setPhase] = useState<'initial' | 'confirm' | 'success'>('initial')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultData, setResultData] = useState<{ refundAmount: number; forfeited: boolean } | null>(null)

  const isFreeRefund = hoursUntilStart > 24

  async function handleConfirmCancel() {
    setLoading(true)
    setError(null)

    const result = await cancelBooking(bookingId)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setResultData({ refundAmount: result.refundAmount, forfeited: result.forfeited })
    setPhase('success')
    setLoading(false)

    setTimeout(() => router.refresh(), 2500)
  }

  if (phase === 'success' && resultData) {
    return (
      <div className="rounded-lg border border-green-800 bg-green-950/40 p-4 space-y-2">
        <p className="text-sm font-medium text-green-300">Booking cancelled</p>
        {resultData.forfeited ? (
          <p className="text-sm text-yellow-300/80">
            Because this cancellation is within 24 hours of the booking start, the {formatPrice(reservationFee)} reservation fee has been forfeited as per our policy.
          </p>
        ) : (
          <p className="text-sm text-green-300/80">
            Your {formatPrice(resultData.refundAmount)} reservation fee will be refunded to your original payment method within 5–10 business days.
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

          {isFreeRefund ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Reservation fee refund</span>
                <span className="text-green-400">{formatPrice(reservationFee)}</span>
              </div>
              <p className="text-xs text-brand-muted/70">
                You are cancelling more than 24 hours before the booking start, so your full reservation fee will be refunded.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Reservation fee</span>
                <span className="text-red-400">Forfeited ({formatPrice(reservationFee)})</span>
              </div>
              <p className="text-xs text-red-300/80 leading-relaxed">
                You are cancelling within 24 hours of the booking start. As per our policy, your {formatPrice(reservationFee)} reservation fee is non-refundable and will NOT be returned. Proceed only if you are sure.
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
