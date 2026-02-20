'use client'

import { useEffect, useState } from 'react'
import { getAnalyticsSummary, type AnalyticsSummary } from '@/app/actions/admin'

function formatAED(amount: number): string {
  return amount.toLocaleString('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

interface SummaryCardProps {
  label: string
  value: string
  sub?: string
}

function SummaryCard({ label, value, sub }: SummaryCardProps) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6">
      <p className="text-brand-muted text-xs uppercase tracking-widest mb-3">
        {label}
      </p>
      <p className="text-white text-3xl font-display font-semibold">{value}</p>
      {sub && (
        <p className="text-brand-muted text-sm mt-1.5">{sub}</p>
      )}
    </div>
  )
}

export function AnalyticsTab() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true)
      setError(null)
      const result = await getAnalyticsSummary()
      if ('error' in result) {
        setError(result.error)
      } else {
        setSummary(result)
      }
      setLoading(false)
    }
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-36 bg-brand-surface border border-brand-border rounded-[--radius-card] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load analytics: {error}
      </div>
    )
  }

  if (!summary) return null

  const currentMonth = new Date().toLocaleString('en-AE', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold text-white">
          Analytics Overview
        </h2>
        <p className="text-brand-muted text-xs mt-1">
          Summary for {currentMonth} and all-time totals
        </p>
      </div>

      {/* 2x2 Summary cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          label="Bookings This Month"
          value={summary.thisMonth.bookings.toString()}
          sub={`${summary.allTime.bookings} total all-time`}
        />
        <SummaryCard
          label="Revenue This Month"
          value={`AED ${formatAED(summary.thisMonth.revenue)}`}
          sub={`AED ${formatAED(summary.allTime.revenue)} all-time`}
        />
        <SummaryCard
          label="Fleet Utilization"
          value={`${summary.fleet.utilizationRate}%`}
          sub={`${summary.fleet.utilized} of ${summary.fleet.total} vehicles`}
        />
        <SummaryCard
          label="All-Time Revenue"
          value={`AED ${formatAED(summary.allTime.revenue)}`}
          sub={`${summary.allTime.bookings} bookings completed`}
        />
      </div>
    </div>
  )
}
