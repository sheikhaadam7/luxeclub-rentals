'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  getDashboardOverview,
  updateBookingStatus,
  type DashboardOverview,
  type DashboardNeedItem,
  type AdminBooking,
  type BookingStatus,
} from '@/app/actions/admin'

// ─── Status config ───────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-white/5 text-white/30' },
  pending: { label: 'Pending', className: 'bg-white/10 text-white/60' },
  confirmed: { label: 'Confirmed', className: 'bg-brand-cyan/20 text-brand-cyan' },
  car_on_the_way: { label: 'On The Way', className: 'bg-amber-400/20 text-amber-400' },
  car_delivered: { label: 'Delivered', className: 'bg-green-400/20 text-green-400' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

function formatBookingRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

// ─── Quick Stats Row ─────────────────────────────────────────

function QuickStats({ data }: { data: DashboardOverview }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Bookings Today */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">
          Active Bookings Today
        </p>
        <p className="text-white text-2xl font-display font-semibold">
          {data.activeBookingsToday}
        </p>
        <p className="text-brand-muted text-xs mt-1">Currently active</p>
      </div>

      {/* Pending Actions */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">
          Pending Actions
        </p>
        <p
          className={`text-2xl font-display font-semibold ${
            data.pendingActions > 0 ? 'text-amber-400' : 'text-white'
          }`}
        >
          {data.pendingActions}
        </p>
        <p className="text-brand-muted text-xs mt-1">Require attention</p>
      </div>

      {/* Revenue This Month */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">
          Revenue This Month
        </p>
        <p className="text-white text-2xl font-display font-semibold">
          AED {data.revenueThisMonth.toLocaleString()}
        </p>
        <p className="text-brand-muted text-xs mt-1">Confirmed bookings</p>
      </div>

      {/* Fleet Utilization */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">
          Fleet Utilization
        </p>
        <p className="text-white text-2xl font-display font-semibold">
          {data.fleetUtilization}%
        </p>
        <p className="text-brand-muted text-xs mt-1">
          {data.fleetUtilized} of {data.fleetTotal} vehicles
        </p>
      </div>
    </div>
  )
}

// ─── Needs Attention Item Row ────────────────────────────────

function AttentionItemRow({
  item,
  actionLabel,
  actionStatus,
  onAction,
}: {
  item: DashboardNeedItem
  actionLabel?: string
  actionStatus?: BookingStatus
  onAction?: (id: string, status: BookingStatus) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  function handleAction() {
    if (!actionStatus || !onAction) return
    setRowError(null)
    startTransition(async () => {
      const result = await updateBookingStatus(item.id, actionStatus)
      if (result.error) {
        setRowError(result.error)
      } else {
        setDone(true)
        onAction(item.id, actionStatus)
      }
    })
  }

  if (done) return null

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-brand-border/50 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">
          {item.vehicle_name ?? 'Unknown Vehicle'}
        </p>
        <p className="text-brand-muted text-xs truncate">
          {item.customer ?? 'Unknown'} · {formatDate(item.date)}
        </p>
        {rowError && (
          <p className="text-red-400 text-xs mt-0.5">{rowError}</p>
        )}
      </div>
      {actionLabel && actionStatus && (
        <button
          type="button"
          onClick={handleAction}
          disabled={isPending}
          className="text-xs px-2.5 py-1 rounded border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/10 transition-colors disabled:opacity-40 whitespace-nowrap flex-shrink-0"
        >
          {isPending ? '...' : actionLabel}
        </button>
      )}
    </div>
  )
}

// ─── Needs Attention Section ─────────────────────────────────

function AttentionSection({
  title,
  items,
  actionLabel,
  actionStatus,
  onAction,
}: {
  title: string
  items: DashboardNeedItem[]
  actionLabel?: string
  actionStatus?: BookingStatus
  onAction?: (id: string, status: BookingStatus) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-white text-sm font-medium">{title}</h4>
        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-brand-muted">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-1.5 py-2">
          <svg
            className="w-3.5 h-3.5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400 text-xs">All clear</span>
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <AttentionItemRow
              key={item.id}
              item={item}
              actionLabel={actionLabel}
              actionStatus={actionStatus}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Needs Attention Card ────────────────────────────────────

function NeedsAttentionCard({
  data,
  onAction,
}: {
  data: DashboardOverview
  onAction: (id: string, status: BookingStatus) => void
}) {
  const totalCount =
    data.needsAttention.pendingBookings.length +
    data.needsAttention.todayDeliveries.length +
    data.needsAttention.overdueReturns.length +
    data.needsAttention.pendingCash.length

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
      <div className="flex items-center gap-2 mb-5">
        <h3 className="text-white font-display font-semibold text-lg">
          Needs Attention
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-medium">
          {totalCount}
        </span>
      </div>

      <div className="space-y-5">
        <AttentionSection
          title="Pending Bookings"
          items={data.needsAttention.pendingBookings}
          actionLabel="Confirm"
          actionStatus="confirmed"
          onAction={onAction}
        />
        <AttentionSection
          title="Today's Deliveries"
          items={data.needsAttention.todayDeliveries}
          actionLabel="Dispatch"
          actionStatus="car_on_the_way"
          onAction={onAction}
        />
        <AttentionSection
          title="Overdue Returns"
          items={data.needsAttention.overdueReturns}
          actionLabel="Complete"
          actionStatus="completed"
          onAction={onAction}
        />
        <AttentionSection
          title="Pending Cash Payments"
          items={data.needsAttention.pendingCash}
        />
      </div>
    </div>
  )
}

// ─── Recent Activity ─────────────────────────────────────────

function RecentActivity({ bookings }: { bookings: AdminBooking[] }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
      <h3 className="text-white font-display font-semibold text-lg mb-4">
        Recent Activity
      </h3>

      {bookings.length === 0 ? (
        <p className="text-brand-muted text-sm">No recent bookings.</p>
      ) : (
        <div className="space-y-0">
          {bookings.map((booking) => {
            const statusCfg = STATUS_CONFIG[booking.status] ?? {
              label: booking.status,
              className: 'bg-white/10 text-white/60',
            }
            const customer =
              booking.guest_name || booking.guest_email || booking.user_email || 'Unknown'

            return (
              <div
                key={booking.id}
                className="flex items-center gap-3 py-2.5 border-b border-brand-border/50 last:border-b-0"
              >
                {/* Ref */}
                <span className="font-mono text-xs text-brand-muted w-[5.5rem] flex-shrink-0">
                  #{formatBookingRef(booking.id)}
                </span>

                {/* Vehicle + Customer */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {booking.vehicle_name ?? 'Unknown Vehicle'}
                  </p>
                  <p className="text-brand-muted text-xs truncate">
                    {customer} · {formatDate(booking.start_date)} –{' '}
                    {formatDate(booking.end_date)}
                  </p>
                </div>

                {/* Status Badge */}
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0 ${statusCfg.className}`}
                >
                  {statusCfg.label}
                </span>

                {/* Amount */}
                <span className="text-white text-sm font-medium w-24 text-right flex-shrink-0">
                  {booking.total_due != null
                    ? `AED ${booking.total_due.toLocaleString()}`
                    : '--'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5 h-28 animate-pulse"
          />
        ))}
      </div>

      {/* Needs attention skeleton */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5 h-64 animate-pulse" />

      {/* Recent activity skeleton */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5 h-80 animate-pulse" />
    </div>
  )
}

// ─── Main DashboardTab ───────────────────────────────────────

export function DashboardTab() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getDashboardOverview()
    if ('error' in result) {
      setError(result.error)
    } else {
      setData(result)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleQuickAction(id: string, status: BookingStatus) {
    if (!data) return

    // Remove the item from the appropriate needs-attention list
    setData({
      ...data,
      needsAttention: {
        pendingBookings: data.needsAttention.pendingBookings.filter((i) => i.id !== id),
        todayDeliveries: data.needsAttention.todayDeliveries.filter((i) => i.id !== id),
        overdueReturns: data.needsAttention.overdueReturns.filter((i) => i.id !== id),
        pendingCash: data.needsAttention.pendingCash.filter((i) => i.id !== id),
      },
      // Update the pending actions count
      pendingActions: Math.max(0, data.pendingActions - 1),
      // Update the matching recent booking status
      recentBookings: data.recentBookings.map((b) =>
        b.id === id ? { ...b, status } : b
      ),
    })
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-[var(--radius-card)] p-4">
        <p className="text-red-400 text-sm">
          Failed to load dashboard: {error}
        </p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-2 text-xs text-red-400 underline hover:text-red-300"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <QuickStats data={data} />
      <NeedsAttentionCard data={data} onAction={handleQuickAction} />
      <RecentActivity bookings={data.recentBookings} />
    </div>
  )
}
