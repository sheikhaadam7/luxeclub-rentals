'use client'

import { useEffect, useState } from 'react'
import { getEnhancedAnalytics, type EnhancedAnalytics } from '@/app/actions/admin'

function formatAED(amount: number): string {
  return amount.toLocaleString('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-white/30',
  confirmed: 'bg-brand-cyan',
  car_on_the_way: 'bg-amber-400',
  car_delivered: 'bg-green-400',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

const DURATION_COLORS: Record<string, string> = {
  daily: 'bg-brand-cyan',
  weekly: 'bg-amber-400',
  monthly: 'bg-green-400',
}

function PercentChangeBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-cyan/20 text-brand-cyan">
        New
      </span>
    )
  }

  const pctChange = ((current - previous) / previous) * 100
  const rounded = Math.round(pctChange)

  if (rounded === 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-brand-muted">
        0%
      </span>
    )
  }

  if (rounded > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400">
        <span aria-hidden="true">&uarr;</span>{rounded}%
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
      <span aria-hidden="true">&darr;</span>{Math.abs(rounded)}%
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Period toggle skeleton */}
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-brand-surface rounded animate-pulse" />
        <div className="h-8 w-24 bg-brand-surface rounded animate-pulse" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-brand-surface border border-brand-border rounded-[var(--radius-card)] animate-pulse"
          />
        ))}
      </div>

      {/* Revenue chart skeleton */}
      <div className="h-72 bg-brand-surface border border-brand-border rounded-[var(--radius-card)] animate-pulse" />

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-brand-surface border border-brand-border rounded-[var(--radius-card)] animate-pulse" />
        <div className="h-64 bg-brand-surface border border-brand-border rounded-[var(--radius-card)] animate-pulse" />
      </div>

      {/* Duration skeleton */}
      <div className="h-48 bg-brand-surface border border-brand-border rounded-[var(--radius-card)] animate-pulse" />
    </div>
  )
}

export function AnalyticsTab() {
  const [period, setPeriod] = useState<'7d' | '30d'>('30d')
  const [data, setData] = useState<EnhancedAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      const result = await getEnhancedAnalytics(period)
      if ('error' in result) {
        setError(result.error)
      } else {
        setData(result)
      }
      setLoading(false)
    }
    fetchData()
  }, [period])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-[var(--radius-card)] p-5">
        <p className="text-red-400 text-sm">Failed to load analytics: {error}</p>
        <button
          onClick={() => {
            setError(null)
            setLoading(true)
            getEnhancedAnalytics(period).then((result) => {
              if ('error' in result) {
                setError(result.error)
              } else {
                setData(result)
              }
              setLoading(false)
            })
          }}
          className="mt-3 px-3 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const maxDailyRevenue = Math.max(...data.dailyRevenue.map((d) => d.revenue), 1)
  const labelInterval = period === '7d' ? 3 : 5
  const topVehicles = data.topVehicles.slice(0, 5)
  const maxVehicleRevenue = topVehicles.length > 0 ? Math.max(...topVehicles.map((v) => v.revenue), 1) : 1

  const statusEntries = Object.entries(data.statusBreakdown)
  const totalStatusCount = statusEntries.reduce((s, [, count]) => s + count, 0)

  const durationEntries = Object.entries(data.durationBreakdown)
  const totalDurationCount = durationEntries.reduce((s, [, count]) => s + count, 0)

  return (
    <div className="space-y-6">
      {/* 1. Period Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod('7d')}
          className={
            period === '7d'
              ? 'px-3 py-1.5 rounded text-xs font-medium bg-brand-cyan text-black'
              : 'px-3 py-1.5 rounded text-xs font-medium bg-brand-surface border border-brand-border text-brand-muted hover:text-white transition-colors'
          }
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setPeriod('30d')}
          className={
            period === '30d'
              ? 'px-3 py-1.5 rounded text-xs font-medium bg-brand-cyan text-black'
              : 'px-3 py-1.5 rounded text-xs font-medium bg-brand-surface border border-brand-border text-brand-muted hover:text-white transition-colors'
          }
        >
          Last 30 Days
        </button>
      </div>

      {/* 2. Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
          <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">Revenue</p>
          <p className="text-white text-2xl font-display font-semibold">
            AED {formatAED(data.currentRevenue)}
          </p>
          <div className="mt-2">
            <PercentChangeBadge current={data.currentRevenue} previous={data.previousRevenue} />
          </div>
        </div>

        {/* Bookings */}
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
          <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">Bookings</p>
          <p className="text-white text-2xl font-display font-semibold">
            {data.currentBookings}
          </p>
          <div className="mt-2">
            <PercentChangeBadge current={data.currentBookings} previous={data.previousBookings} />
          </div>
        </div>

        {/* Avg Booking Value */}
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
          <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">Avg Booking Value</p>
          <p className="text-white text-2xl font-display font-semibold">
            AED {formatAED(data.avgBookingValue)}
          </p>
        </div>

        {/* Fleet Utilization */}
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
          <p className="text-brand-muted text-xs uppercase tracking-widest mb-2">Fleet Utilization</p>
          <p className="text-white text-2xl font-display font-semibold">
            {data.fleetUtilization}%
          </p>
        </div>
      </div>

      {/* 3. Revenue Bar Chart */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <h3 className="text-white text-sm font-semibold mb-4">Daily Revenue</h3>
        <div className="flex items-end h-48 gap-0">
          {data.dailyRevenue.map((day, idx) => {
            const pct = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0
            const dayNum = new Date(day.date + 'T00:00:00').getDate()
            const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-AE', {
              month: 'short',
              day: 'numeric',
            })

            return (
              <div key={day.date} className="flex-1 mx-0.5 min-w-[4px] flex flex-col items-center justify-end h-full">
                <div
                  className="bg-brand-cyan rounded-t w-full transition-all duration-300"
                  style={{ height: `${Math.max(pct, 1)}%`, minHeight: '2px' }}
                  title={`${formattedDate}: AED ${formatAED(day.revenue)}`}
                />
                {idx % labelInterval === 0 ? (
                  <span className="text-brand-muted text-[10px] mt-1.5 leading-none">{dayNum}</span>
                ) : (
                  <span className="text-[10px] mt-1.5 leading-none invisible">0</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Top Vehicles + 5. Status Breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 4. Top 5 Vehicles */}
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Top Vehicles by Revenue</h3>
          {topVehicles.length === 0 ? (
            <p className="text-brand-muted text-sm">No bookings in this period</p>
          ) : (
            <div className="space-y-3">
              {topVehicles.map((vehicle, idx) => {
                const widthPct = (vehicle.revenue / maxVehicleRevenue) * 100
                return (
                  <div key={vehicle.name + idx} className="relative rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-brand-cyan/10 rounded"
                      style={{ width: `${widthPct}%` }}
                    />
                    <div className="relative flex items-center gap-3 px-3 py-2">
                      <span className="text-brand-muted text-xs font-mono w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="text-white text-sm truncate flex-1">{vehicle.name}</span>
                      <span className="text-brand-muted text-xs shrink-0">
                        {vehicle.bookings} booking{vehicle.bookings !== 1 ? 's' : ''}
                      </span>
                      <span className="text-brand-cyan text-sm font-medium shrink-0">
                        AED {formatAED(vehicle.revenue)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 5. Status Breakdown */}
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Booking Status Breakdown</h3>
          {statusEntries.length === 0 ? (
            <p className="text-brand-muted text-sm">No data</p>
          ) : (
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => {
                const widthPct = totalStatusCount > 0 ? (count / totalStatusCount) * 100 : 0
                const colorClass = STATUS_COLORS[status] ?? 'bg-white/20'
                const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-brand-muted text-xs w-28 shrink-0 truncate">{label}</span>
                    <span className="text-white text-xs font-medium w-8 text-right shrink-0">{count}</span>
                    <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${colorClass}`}
                        style={{ width: `${Math.max(widthPct, 1)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. Duration Type Breakdown */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <h3 className="text-white text-sm font-semibold mb-4">Rental Duration Split</h3>
        {durationEntries.length === 0 ? (
          <p className="text-brand-muted text-sm">No data</p>
        ) : (
          <div className="space-y-3">
            {durationEntries.map(([duration, count]) => {
              const widthPct = totalDurationCount > 0 ? (count / totalDurationCount) * 100 : 0
              const colorClass = DURATION_COLORS[duration] ?? 'bg-white/20'
              const label = duration.charAt(0).toUpperCase() + duration.slice(1)
              return (
                <div key={duration} className="flex items-center gap-3">
                  <span className="text-brand-muted text-xs w-20 shrink-0">{label}</span>
                  <span className="text-white text-xs font-medium w-8 text-right shrink-0">{count}</span>
                  <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${colorClass}`}
                      style={{ width: `${Math.max(widthPct, 1)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
