'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  getAllBookings,
  updateBookingStatus,
  confirmManualPayment,
  approveModificationRequest,
  rejectModificationRequest,
  markReservationFeeReceived,
  refundReservationFee,
  markNoShow,
  type AdminBooking,
  type BookingStatus,
} from '@/app/actions/admin'
import { captureDeposit, voidDeposit } from '@/app/actions/payments'

// ─── Status config ───────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-white/5 text-white/30' },
  pending: { label: 'Pending', className: 'bg-white/10 text-white/60' },
  confirmed: { label: 'Confirmed', className: 'bg-brand-cyan/20 text-brand-cyan' },
  car_on_the_way: { label: 'Car On The Way', className: 'bg-amber-400/20 text-amber-400' },
  car_delivered: { label: 'Car Delivered', className: 'bg-green-400/20 text-green-400' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
}

const ALL_STATUSES: BookingStatus[] = [
  'draft',
  'pending',
  'confirmed',
  'car_on_the_way',
  'car_delivered',
  'completed',
  'cancelled',
]

const PAYMENT_STATUS_CLASSES: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-400',
  pending_cash: 'bg-amber-400/20 text-amber-400',
  unpaid: 'bg-yellow-500/20 text-yellow-400',
  failed: 'bg-red-500/20 text-red-400',
}

const QUICK_ACTIONS: Partial<Record<BookingStatus, { label: string; next: BookingStatus }>> = {
  pending: { label: 'Confirm', next: 'confirmed' },
  confirmed: { label: 'Dispatch', next: 'car_on_the_way' },
  car_on_the_way: { label: 'Mark Delivered', next: 'car_delivered' },
  car_delivered: { label: 'Complete', next: 'completed' },
}

// ─── Helpers ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatBookingRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  d.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return d < now
}

function customerName(b: AdminBooking): string {
  return b.guest_name || b.guest_email || b.user_email || 'Walk-in'
}

// ─── Booking Card ─────────────────────────────────────────────

function BookingCard({
  booking,
  isExpanded,
  onToggle,
  onBookingUpdate,
}: {
  booking: AdminBooking
  isExpanded: boolean
  onToggle: () => void
  onBookingUpdate: (updated: Partial<AdminBooking> & { id: string }) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [cardError, setCardError] = useState<string | null>(null)
  const [cashMethod, setCashMethod] = useState<'cash' | 'bank_transfer'>('cash')

  const statusCfg = STATUS_CONFIG[booking.status] ?? {
    label: booking.status,
    className: 'bg-white/10 text-white/60',
  }

  const paymentCls =
    PAYMENT_STATUS_CLASSES[booking.payment_status ?? ''] ?? 'bg-white/10 text-brand-muted'

  const quickAction = QUICK_ACTIONS[booking.status]

  // Time-sensitive chips
  const chips: { label: string; className: string }[] = []
  if (
    booking.pickup_method === 'delivery' &&
    isToday(booking.start_date) &&
    booking.status === 'confirmed'
  ) {
    chips.push({ label: 'Delivering Today', className: 'bg-amber-400/20 text-amber-400' })
  }
  if (
    isPast(booking.end_date) &&
    ['confirmed', 'car_on_the_way', 'car_delivered'].includes(booking.status)
  ) {
    chips.push({ label: 'Overdue', className: 'bg-red-500/20 text-red-400' })
  }
  if (booking.payment_status === 'pending_cash') {
    chips.push({ label: 'Cash Pending', className: 'bg-amber-400/20 text-amber-400' })
  }
  if (booking.modification_status === 'pending') {
    chips.push({ label: 'Date Change Requested', className: 'bg-purple-400/20 text-purple-400' })
  }

  function handleQuickAction(e: React.MouseEvent) {
    e.stopPropagation()
    if (!quickAction) return
    setCardError(null)
    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, quickAction.next)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, status: quickAction.next })
      }
    })
  }

  function handleStatusChange(newStatus: BookingStatus) {
    if (newStatus === booking.status) return
    setCardError(null)
    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, newStatus)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, status: newStatus })
      }
    })
  }

  function handleCancel() {
    handleStatusChange('cancelled')
  }

  function handleCaptureDeposit(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    startTransition(async () => {
      const result = await captureDeposit(booking.id)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, deposit_status: 'captured' })
      }
    })
  }

  function handleVoidDeposit(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    startTransition(async () => {
      const result = await voidDeposit(booking.id)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, deposit_status: 'voided' })
      }
    })
  }

  function handleConfirmCash(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    startTransition(async () => {
      const result = await confirmManualPayment(booking.id, cashMethod)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, payment_status: 'paid', payment_method: cashMethod })
      }
    })
  }

  function handleApproveModification(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    startTransition(async () => {
      const result = await approveModificationRequest(booking.id)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({
          id: booking.id,
          modification_status: 'approved',
          start_date: booking.modification_requested_start ?? booking.start_date,
          end_date: booking.modification_requested_end ?? booking.end_date,
        })
      }
    })
  }

  function handleRejectModification(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    startTransition(async () => {
      const result = await rejectModificationRequest(booking.id)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, modification_status: 'rejected' })
      }
    })
  }

  function handleMarkFeeReceived(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    startTransition(async () => {
      const result = await markReservationFeeReceived(booking.id)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, reservation_fee_status: 'paid' })
      }
    })
  }

  function handleRefundFee(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    if (!confirm('Refund the reservation fee to the customer? This will issue a Stripe refund for card bookings.')) return
    startTransition(async () => {
      const result = await refundReservationFee(booking.id)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({ id: booking.id, reservation_fee_status: 'refunded' })
      }
    })
  }

  function handleMarkNoShow(e: React.MouseEvent) {
    e.stopPropagation()
    setCardError(null)
    if (!confirm('Mark this booking as no-show? The reservation fee will be forfeited and the booking moved to cancelled.')) return
    startTransition(async () => {
      const result = await markNoShow(booking.id)
      if (result.error) {
        setCardError(result.error)
      } else {
        onBookingUpdate({
          id: booking.id,
          status: 'cancelled',
          reservation_fee_status: 'forfeited',
          forfeit_reason: 'no_show',
        })
      }
    })
  }

  return (
    <div
      className={`bg-brand-surface border rounded-[var(--radius-card)] transition-colors ${
        isExpanded ? 'border-brand-cyan/30' : 'border-brand-border hover:border-brand-cyan/30'
      }`}
    >
      {/* ── Collapsed row ── */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          {/* Left side */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Line 1: ref + vehicle + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-brand-muted">
                #{formatBookingRef(booking.id)}
              </span>
              <span className="text-white text-sm font-medium truncate">
                {booking.vehicle_name ?? 'Unknown Vehicle'}
              </span>
              <span
                className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusCfg.className}`}
              >
                {statusCfg.label}
              </span>
            </div>

            {/* Line 2: customer, dates, duration */}
            <p className="text-xs text-brand-muted">
              {customerName(booking)} · {formatDate(booking.start_date)} –{' '}
              {formatDate(booking.end_date)} ·{' '}
              <span className="capitalize">{booking.duration_type}</span>
            </p>

            {/* Line 3: amount + payment badge + chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/80">
                {booking.total_due != null ? `AED ${booking.total_due.toLocaleString()}` : '—'}
              </span>
              <span
                className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${paymentCls}`}
              >
                {(booking.payment_status ?? 'unknown').replace(/_/g, ' ')}
              </span>
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${chip.className}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right side: quick action */}
          {quickAction && (
            <button
              type="button"
              onClick={handleQuickAction}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded bg-brand-cyan text-black font-medium hover:bg-brand-cyan/90 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              {isPending ? '...' : quickAction.label}
            </button>
          )}
        </div>

        {cardError && <p className="mt-2 text-xs text-red-400">{cardError}</p>}
      </div>

      {/* ── Expanded detail ── */}
      {isExpanded && (
        <div className="border-t border-brand-border mx-4 mb-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Section 1: Pricing */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                Pricing
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-brand-muted">Rental Subtotal</span>
                  <span className="text-white">
                    {booking.rental_subtotal != null
                      ? `AED ${booking.rental_subtotal.toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                {(booking.delivery_fee ?? 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-muted">Delivery Fee</span>
                    <span className="text-white">AED {booking.delivery_fee!.toLocaleString()}</span>
                  </div>
                )}
                {(booking.return_fee ?? 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-muted">Return Fee</span>
                    <span className="text-white">AED {booking.return_fee!.toLocaleString()}</span>
                  </div>
                )}
                {(booking.no_deposit_surcharge ?? 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-muted">No-Deposit Surcharge</span>
                    <span className="text-white">
                      AED {booking.no_deposit_surcharge!.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold pt-1 border-t border-brand-border">
                  <span className="text-white">Total Due</span>
                  <span className="text-white">
                    {booking.total_due != null
                      ? `AED ${booking.total_due.toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                {/* Reservation fee split */}
                {booking.reservation_fee != null && booking.reservation_fee > 0 && (
                  <>
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-brand-cyan">Reservation Fee</span>
                      <span className="text-brand-cyan">
                        AED {booking.reservation_fee.toLocaleString()}{' '}
                        <span className="text-brand-cyan/60 capitalize">
                          ({booking.reservation_fee_status ?? '—'})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-muted">Balance Due on Pickup</span>
                      <span className="text-white">
                        AED {(booking.balance_due_on_pickup ?? 0).toLocaleString()}
                      </span>
                    </div>
                    {booking.forfeit_reason && (
                      <div className="flex justify-between text-xs">
                        <span className="text-red-400">Forfeit Reason</span>
                        <span className="text-red-400 capitalize">
                          {booking.forfeit_reason.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Reservation fee admin actions */}
              {booking.reservation_fee != null && booking.reservation_fee > 0 && booking.status !== 'cancelled' && booking.status !== 'completed' && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {booking.reservation_fee_status === 'pending' && (
                    <button
                      type="button"
                      onClick={handleMarkFeeReceived}
                      disabled={isPending}
                      className="text-[11px] px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-40 bg-green-600 text-white hover:bg-green-500"
                    >
                      Mark Fee Received
                    </button>
                  )}
                  {booking.reservation_fee_status === 'paid' && (
                    <>
                      <button
                        type="button"
                        onClick={handleRefundFee}
                        disabled={isPending}
                        className="text-[11px] px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-40 border border-brand-cyan/40 text-brand-cyan hover:bg-brand-cyan/10"
                      >
                        Refund Fee
                      </button>
                      <button
                        type="button"
                        onClick={handleMarkNoShow}
                        disabled={isPending}
                        className="text-[11px] px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-40 border border-red-500/40 text-red-400 hover:bg-red-500/10"
                      >
                        Mark No-Show
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Delivery & Collection */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                Delivery & Collection
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-muted">Pickup</span>
                  <span className="text-white capitalize">
                    {booking.pickup_method ?? '—'}
                  </span>
                </div>
                {booking.delivery_address && (
                  <div className="flex justify-between gap-2">
                    <span className="text-brand-muted shrink-0">Delivery To</span>
                    <span className="text-white text-right">{booking.delivery_address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-brand-muted">Return</span>
                  <span className="text-white capitalize">
                    {booking.return_method ?? '—'}
                  </span>
                </div>
                {booking.collection_address && (
                  <div className="flex justify-between gap-2">
                    <span className="text-brand-muted shrink-0">Collection From</span>
                    <span className="text-white text-right">{booking.collection_address}</span>
                  </div>
                )}
                {booking.start_time && (
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Start Time</span>
                    <span className="text-white">{booking.start_time}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Deposit */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                Deposit
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-muted">Choice</span>
                  <span className="text-white capitalize">
                    {booking.deposit_choice ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-muted">Amount</span>
                  <span className="text-white">
                    {booking.deposit_amount != null
                      ? `AED ${booking.deposit_amount.toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-muted">Status</span>
                  <span className="text-white capitalize">
                    {booking.deposit_status ?? '—'}
                  </span>
                </div>
              </div>
              {booking.stripe_deposit_pi_id && booking.deposit_status === 'held' && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCaptureDeposit}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 bg-green-600 text-white hover:bg-green-500"
                  >
                    Capture Deposit
                  </button>
                  <button
                    type="button"
                    onClick={handleVoidDeposit}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 border border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Void Deposit
                  </button>
                </div>
              )}
            </div>

            {/* Section 4: Cash Payment (conditional) */}
            {booking.payment_status === 'pending_cash' && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                  Payment Management
                </h4>
                <div className="flex items-center gap-2">
                  <select
                    value={cashMethod}
                    onChange={(e) => setCashMethod(e.target.value as 'cash' | 'bank_transfer')}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white focus:outline-none focus:border-brand-cyan/50"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleConfirmCash}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 bg-green-600 text-white hover:bg-green-500"
                  >
                    Confirm Cash Payment
                  </button>
                </div>
              </div>
            )}

            {/* Section 5: Guest Contact */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                Contact
              </h4>
              <div className="space-y-1 text-xs">
                {booking.guest_name && (
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Name</span>
                    <span className="text-white">{booking.guest_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-brand-muted">Email</span>
                  <span className="text-white">
                    {booking.guest_email || booking.user_email || '—'}
                  </span>
                </div>
                {booking.guest_phone && (
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Phone</span>
                    <span className="text-white">{booking.guest_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 6: Modification Request (conditional) */}
            {booking.modification_status === 'pending' &&
              booking.modification_requested_start &&
              booking.modification_requested_end && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                  Date Change Request
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Requested Start</span>
                    <span className="text-white">{formatDate(booking.modification_requested_start)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Requested End</span>
                    <span className="text-white">{formatDate(booking.modification_requested_end)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Current Dates</span>
                    <span className="text-white">
                      {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleApproveModification}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 bg-green-600 text-white hover:bg-green-500"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectModification}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 border border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Section 7: Status Management */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                Status Management
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={booking.status}
                  onChange={(e) => handleStatusChange(e.target.value as BookingStatus)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isPending}
                  className="text-xs bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white focus:outline-none focus:border-brand-cyan/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
                {booking.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancel()
                    }}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 border border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main BookingsTab ────────────────────────────────────────

export function BookingsTab() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const result = await getAllBookings()
    if ('error' in result) {
      setLoadError(result.error)
    } else {
      setBookings(result)
      setLoadError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  function handleBookingUpdate(updated: Partial<AdminBooking> & { id: string }) {
    setBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
    )
  }

  // Compute counts for pipeline pills
  const statusCounts = bookings.reduce<Record<string, number>>(
    (acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1
      return acc
    },
    {}
  )

  // Filtered bookings
  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const ref = formatBookingRef(b.id).toLowerCase()
      const vehicleName = (b.vehicle_name ?? '').toLowerCase()
      const guestName = (b.guest_name ?? '').toLowerCase()
      const guestEmail = (b.guest_email ?? '').toLowerCase()
      const userEmail = (b.user_email ?? '').toLowerCase()
      if (
        !ref.includes(q) &&
        !vehicleName.includes(q) &&
        !guestName.includes(q) &&
        !guestEmail.includes(q) &&
        !userEmail.includes(q)
      ) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* ── Status Pipeline Bar ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* All pill */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50'
              : 'bg-brand-surface text-brand-muted border-brand-border hover:text-white hover:border-brand-cyan/30'
          }`}
        >
          All ({bookings.length})
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
              statusFilter === s
                ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50'
                : 'bg-brand-surface text-brand-muted border-brand-border hover:text-white hover:border-brand-cyan/30'
            }`}
          >
            {STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* ── Search Bar ── */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by ref, vehicle, name, or email..."
        className="w-full text-sm bg-brand-surface border border-brand-border rounded-[var(--radius-card)] px-3 py-2 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
      />

      {/* ── Results Count ── */}
      {!loading && (
        <p className="text-xs text-brand-muted">
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' || searchQuery ? ' (filtered)' : ''} ·{' '}
          {bookings.length} total
        </p>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] h-20 animate-pulse"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-[var(--radius-card)] p-4">
          <p className="text-red-400 text-sm">Failed to load bookings: {loadError}</p>
          <button
            type="button"
            onClick={fetchBookings}
            className="mt-2 text-xs text-red-400 underline hover:text-red-300"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 text-center">
          <p className="text-brand-muted text-sm">
            {bookings.length === 0
              ? 'No bookings yet.'
              : 'No bookings match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isExpanded={expandedId === booking.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === booking.id ? null : booking.id))
              }
              onBookingUpdate={handleBookingUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
