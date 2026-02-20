'use client'
import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  getAllBookings,
  updateBookingStatus,
  type AdminBooking,
  type BookingStatus,
} from '@/app/actions/admin'

// ─── Status config ───────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-white/10 text-white/60' },
  confirmed: { label: 'Confirmed', className: 'bg-brand-cyan/20 text-brand-cyan' },
  car_on_the_way: { label: 'Car On The Way', className: 'bg-amber-400/20 text-amber-400' },
  car_delivered: { label: 'Car Delivered', className: 'bg-green-400/20 text-green-400' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
}

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'car_on_the_way',
  'car_delivered',
  'completed',
  'cancelled',
]

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

// ─── Booking Row ─────────────────────────────────────────────

function BookingRow({
  booking,
  onStatusChanged,
}: {
  booking: AdminBooking
  onStatusChanged: (id: string, status: BookingStatus) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<BookingStatus>(booking.status)
  const [rowError, setRowError] = useState<string | null>(null)

  function handleStatusChange(newStatus: BookingStatus) {
    if (newStatus === localStatus) return
    setRowError(null)
    const previousStatus = localStatus
    setLocalStatus(newStatus) // Optimistic update
    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, newStatus)
      if (result.error) {
        setLocalStatus(previousStatus) // Revert on error
        setRowError(result.error)
      } else {
        onStatusChanged(booking.id, newStatus)
      }
    })
  }

  const statusCfg = STATUS_CONFIG[localStatus] ?? {
    label: localStatus,
    className: 'bg-white/10 text-white/60',
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-4">
      {/* Top row: ref + vehicle + email */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-brand-muted">
              #{formatBookingRef(booking.id)}
            </span>
            <span className="text-white text-sm font-medium truncate">
              {booking.vehicle_name ?? 'Unknown Vehicle'}
            </span>
          </div>
          <p className="text-xs text-brand-muted">
            {booking.user_email ?? 'Unknown User'} ·{' '}
            {formatDate(booking.start_date)} – {formatDate(booking.end_date)} ·{' '}
            <span className="capitalize">{booking.duration_type}</span>
          </p>
          <p className="text-xs text-brand-muted">
            {booking.total_due != null ? `AED ${booking.total_due.toLocaleString()}` : '—'} ·{' '}
            <span className="capitalize">{booking.payment_status}</span>
            {booking.payment_method && (
              <span className="capitalize"> ({booking.payment_method})</span>
            )}
          </p>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Current status badge */}
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>

          {/* Status dropdown */}
          <select
            value={localStatus}
            onChange={(e) => handleStatusChange(e.target.value as BookingStatus)}
            disabled={isPending}
            className="text-xs bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white focus:outline-none focus:border-brand-cyan/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {rowError && <p className="mt-2 text-xs text-red-400">{rowError}</p>}
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

  function handleStatusChanged(id: string, status: BookingStatus) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    )
  }

  // Filtered bookings
  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const ref = formatBookingRef(b.id).toLowerCase()
      const vehicleName = (b.vehicle_name ?? '').toLowerCase()
      const email = (b.user_email ?? '').toLowerCase()
      if (!ref.includes(q) && !vehicleName.includes(q) && !email.includes(q)) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ref, vehicle, or email..."
            className="w-full text-sm bg-brand-surface border border-brand-border rounded-[--radius-card] px-3 py-2 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
          className="text-sm bg-brand-surface border border-brand-border rounded-[--radius-card] px-3 py-2 text-white focus:outline-none focus:border-brand-cyan/50"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-xs text-brand-muted">
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' || searchQuery ? ' (filtered)' : ''}
          {' '}·{' '}
          {bookings.length} total
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-brand-surface border border-brand-border rounded-[--radius-card] h-20 animate-pulse"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-[--radius-card] p-4">
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
        <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6 text-center">
          <p className="text-brand-muted text-sm">
            {bookings.length === 0
              ? 'No bookings yet.'
              : 'No bookings match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              onStatusChanged={handleStatusChanged}
            />
          ))}
        </div>
      )}
    </div>
  )
}
