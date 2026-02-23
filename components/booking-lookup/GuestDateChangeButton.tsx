'use client'

import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { requestGuestDateModification } from '@/app/actions/guest-bookings'

interface GuestDateChangeButtonProps {
  bookingId: string
  guestEmail: string
  currentStartDate: string
  currentEndDate: string
  modificationStatus: string | null
  modificationRequestedStart: string | null
  modificationRequestedEnd: string | null
  onDateChangeRequested: () => void
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00Z')
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function GuestDateChangeButton({
  bookingId,
  guestEmail,
  currentStartDate,
  currentEndDate,
  modificationStatus,
  modificationRequestedStart,
  modificationRequestedEnd,
  onDateChangeRequested,
}: GuestDateChangeButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // If there's a pending modification, show info panel
  if (modificationStatus === 'pending' && modificationRequestedStart && modificationRequestedEnd) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
        <p className="text-sm font-medium text-amber-300">Date Change Requested</p>
        <p className="text-sm text-brand-muted">
          You have requested to change your dates to{' '}
          <span className="text-white">{formatDate(modificationRequestedStart)}</span>
          {' '}&mdash;{' '}
          <span className="text-white">{formatDate(modificationRequestedEnd)}</span>.
          This is pending admin review.
        </p>
      </div>
    )
  }

  if (modificationStatus === 'approved' && modificationRequestedStart && modificationRequestedEnd) {
    return (
      <div className="rounded-lg border border-green-800 bg-green-950/40 p-4 space-y-2">
        <p className="text-sm font-medium text-green-300">Date Change Approved</p>
        <p className="text-sm text-brand-muted">
          Your date change request was approved. Your booking dates have been updated.
        </p>
      </div>
    )
  }

  if (modificationStatus === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 space-y-2">
          <p className="text-sm font-medium text-red-300">Date Change Rejected</p>
          <p className="text-sm text-brand-muted">
            Your previous date change request was rejected. You can submit a new request below.
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="w-full rounded-lg border border-brand-border px-6 py-3 text-sm font-semibold text-white hover:border-brand-cyan/30 transition-colors"
        >
          Request New Date Change
        </button>
        {showPicker && renderPicker()}
      </div>
    )
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-800 bg-green-950/40 p-4 space-y-2">
        <p className="text-sm font-medium text-green-300">Date change request submitted</p>
        <p className="text-sm text-green-300/80">
          We&apos;ll review your request and get back to you shortly.
        </p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!range?.from || !range?.to) {
      setError('Please select both start and end dates')
      return
    }

    setLoading(true)
    setError(null)

    const newStart = range.from.toISOString().split('T')[0]
    const newEnd = range.to.toISOString().split('T')[0]

    const result = await requestGuestDateModification(bookingId, guestEmail, newStart, newEnd)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => onDateChangeRequested(), 2000)
  }

  function renderPicker() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
      <div className="space-y-4 mt-4">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <p className="text-sm text-brand-muted">
          Current dates: <span className="text-white">{formatDate(currentStartDate)}</span>
          {' '}&mdash;{' '}
          <span className="text-white">{formatDate(currentEndDate)}</span>
        </p>

        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4 inline-block">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            disabled={{ before: today }}
            numberOfMonths={2}
            classNames={{
              root: 'text-white select-none',
              months: 'relative flex flex-wrap gap-6 justify-center',
              month: 'space-y-3 w-[calc(9*2.25rem)]',
              month_caption: 'flex items-center pl-16',
              caption_label: 'font-display text-base font-medium text-white',
              nav: 'absolute top-0 left-0 flex items-center gap-1 z-10',
              button_previous: 'p-1 text-brand-cyan hover:text-brand-cyan-hover transition-colors rounded',
              button_next: 'p-1 text-brand-cyan hover:text-brand-cyan-hover transition-colors rounded',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'w-9 h-8 text-xs text-brand-muted text-center flex items-center justify-center',
              weeks: 'mt-1',
              week: 'flex',
              day: 'w-9 h-9 flex items-center justify-center',
              day_button: 'w-9 h-9 text-sm text-brand-cyan font-medium rounded cursor-default',
              disabled: 'text-white/15 line-through cursor-not-allowed',
              today: 'ring-1 ring-brand-cyan rounded',
              outside: 'text-white/10',
              hidden: 'invisible',
              range_start: 'bg-brand-cyan/30 rounded-l-full',
              range_end: 'bg-brand-cyan/30 rounded-r-full',
              range_middle: 'bg-brand-cyan/10',
              selected: 'bg-brand-cyan/20 text-brand-cyan',
              chevron: 'fill-brand-cyan w-4 h-4',
            }}
          />
        </div>

        {range?.from && range?.to && (
          <p className="text-sm text-brand-muted">
            New dates: <span className="text-white">{formatDate(range.from.toISOString().split('T')[0])}</span>
            {' '}&mdash;{' '}
            <span className="text-white">{formatDate(range.to.toISOString().split('T')[0])}</span>
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !range?.from || !range?.to}
            className="flex-1 rounded-lg bg-brand-cyan px-4 py-3 text-sm font-semibold text-black hover:bg-brand-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Date Change Request'}
          </button>
          <button
            onClick={() => { setShowPicker(false); setRange(undefined); setError(null) }}
            disabled={loading}
            className="rounded-lg border border-brand-border px-4 py-3 text-sm font-medium text-brand-muted hover:text-white hover:border-brand-border-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full rounded-lg border border-brand-border px-6 py-3 text-sm font-semibold text-white hover:border-brand-cyan/30 transition-colors"
        >
          Request Date Change
        </button>
      ) : (
        renderPicker()
      )}
    </div>
  )
}
