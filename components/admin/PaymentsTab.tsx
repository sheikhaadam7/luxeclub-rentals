'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  getPaymentBookings,
  confirmManualPayment,
  type PaymentBooking,
} from '@/app/actions/admin'

type ConfirmState = {
  bookingId: string
  selectedMethod: 'cash' | 'bank_transfer'
} | null

function paymentStatusBadge(status: string) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
        Paid
      </span>
    )
  }
  if (status === 'pending_cash') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
        Pending cash
      </span>
    )
  }
  if (status === 'unpaid') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/20">
        Unpaid
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-brand-surface text-brand-muted text-xs font-medium border border-brand-border">
      {status}
    </span>
  )
}

export function PaymentsTab() {
  const [bookings, setBookings] = useState<PaymentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const fetchPaymentBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getPaymentBookings()
    if ('error' in result) {
      setError(result.error)
    } else {
      setBookings(result)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPaymentBookings()
  }, [fetchPaymentBookings])

  function openConfirm(bookingId: string) {
    setConfirmState({ bookingId, selectedMethod: 'cash' })
    setActionErrors((prev) => {
      const next = { ...prev }
      delete next[bookingId]
      return next
    })
  }

  function closeConfirm() {
    setConfirmState(null)
  }

  function handleConfirmPayment() {
    if (!confirmState) return
    const { bookingId, selectedMethod } = confirmState
    startTransition(async () => {
      const result = await confirmManualPayment(bookingId, selectedMethod)
      if (result.error) {
        setActionErrors((prev) => ({
          ...prev,
          [bookingId]: result.error ?? 'Unknown error',
        }))
        setConfirmState(null)
      } else {
        setConfirmState(null)
        await fetchPaymentBookings()
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-brand-surface border border-brand-border rounded-[var(--radius-card)] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load payment bookings: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl font-semibold text-white">
          Payment Management
        </h2>
        {bookings.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-brand-surface text-brand-muted text-xs font-medium border border-brand-border">
            {bookings.length} entries
          </span>
        )}
      </div>

      {/* Empty state */}
      {bookings.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-brand-muted text-sm">
            No cash or bank transfer bookings found.
          </p>
        </div>
      )}

      {/* Bookings list */}
      <div className="space-y-3">
        {bookings.map((booking) => {
          const isConfirming = confirmState?.bookingId === booking.id
          const actionError = actionErrors[booking.id]
          const createdDate = new Date(booking.created_at).toLocaleDateString(
            'en-AE',
            { day: 'numeric', month: 'short', year: 'numeric' }
          )
          const bookingRef = booking.id.substring(0, 8).toUpperCase()

          return (
            <div
              key={booking.id}
              className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Booking info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium font-mono">
                      #{bookingRef}
                    </span>
                    {paymentStatusBadge(booking.payment_status)}
                  </div>
                  <p className="text-brand-muted text-xs">
                    {booking.vehicle_name ?? 'Unknown vehicle'} &middot; {createdDate}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-brand-muted">
                    <span>
                      AED{' '}
                      <span className="text-white font-medium">
                        {booking.total_due != null
                          ? booking.total_due.toLocaleString('en-AE', {
                              minimumFractionDigits: 0,
                            })
                          : '—'}
                      </span>
                    </span>
                    {booking.payment_method && (
                      <span className="capitalize">
                        {booking.payment_method.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Confirm button or paid badge */}
                {booking.payment_status === 'pending_cash' ? (
                  <div className="shrink-0">
                    {!isConfirming ? (
                      <button
                        onClick={() => openConfirm(booking.id)}
                        disabled={isPending}
                        className="px-4 py-1.5 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm Payment
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={confirmState.selectedMethod}
                          onChange={(e) =>
                            setConfirmState((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    selectedMethod: e.target.value as
                                      | 'cash'
                                      | 'bank_transfer',
                                  }
                                : null
                            )
                          }
                          className="bg-brand-surface border border-brand-border text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                        <button
                          onClick={handleConfirmPayment}
                          disabled={isPending}
                          className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={closeConfirm}
                          disabled={isPending}
                          className="px-3 py-1 rounded-lg border border-brand-border text-brand-muted hover:text-white text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ) : booking.payment_status === 'paid' ? (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-green-400 text-sm">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Paid
                  </span>
                ) : null}
              </div>

              {/* Action error */}
              {actionError && (
                <p className="mt-2 text-red-400 text-xs">{actionError}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
