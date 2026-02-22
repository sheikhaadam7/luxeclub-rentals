'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { DayPicker, type DateRange } from 'react-day-picker'
import { differenceInDays } from 'date-fns'
import 'react-day-picker/style.css'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import { useCurrency } from '@/lib/currency/context'

interface StepDurationProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
  bookedRanges: Array<{ from: Date; to: Date }>
}

function getDurationType(days: number): 'daily' | 'weekly' | 'monthly' {
  if (days >= 30) return 'monthly'
  if (days >= 7) return 'weekly'
  return 'daily'
}

const DURATION_TIERS = [
  { value: 'daily' as const, label: 'Daily', range: '1–6 days', discount: 0 },
  { value: 'weekly' as const, label: 'Weekly', range: '7–29 days', discount: 10 },
  { value: 'monthly' as const, label: 'Monthly', range: '30+ days', discount: 20 },
]

const TIME_SLOTS = [
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
]

export function StepDuration({ form, vehicle, bookedRanges }: StepDurationProps) {
  const { formatPrice } = useCurrency()
  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')

  // Responsive: show 1 month on mobile, 2 on wider screens
  const [calMonths, setCalMonths] = useState(1)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    setCalMonths(mq.matches ? 2 : 1)
    const handler = (e: MediaQueryListEvent) => setCalMonths(e.matches ? 2 : 1)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Calculate rental days and auto-set durationType
  const rentalDays =
    startDate instanceof Date && endDate instanceof Date
      ? Math.max(differenceInDays(endDate, startDate), 1)
      : 0

  const activeTier = getDurationType(rentalDays)

  useEffect(() => {
    if (rentalDays > 0) {
      form.setValue('durationType', activeTier, { shouldValidate: true })
    }
  }, [activeTier, rentalDays, form])

  const selectedRange: DateRange | undefined =
    startDate || endDate
      ? { from: startDate, to: endDate }
      : undefined

  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)

  const disabledMatchers = [
    { from: new Date(2020, 0, 1), to: yesterday },
    ...bookedRanges,
  ]

  const dailyRate = vehicle.daily_rate ?? 0

  function handleRangeSelect(range: DateRange | undefined) {
    form.setValue('startDate', range?.from as Date, { shouldValidate: true })
    form.setValue('endDate', range?.to as Date, { shouldValidate: true })
  }

  const startDateError = form.formState.errors.startDate
  const endDateError = form.formState.errors.endDate

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-medium text-white mb-1">Rental Duration</h2>
        <p className="text-sm text-brand-muted">Select your dates — longer rentals unlock bigger discounts.</p>
      </div>

      {/* Duration tier cards (display-only) */}
      <div>
        <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">Pricing Tiers</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DURATION_TIERS.map(({ value, label, range, discount }) => {
            const isActive = rentalDays > 0 && activeTier === value
            const discountedRate = dailyRate * (1 - discount / 100)
            return (
              <div
                key={value}
                className={[
                  'p-4 rounded-[--radius-card] border text-left transition-all',
                  isActive
                    ? 'border-brand-cyan bg-brand-cyan/10'
                    : 'border-brand-border',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <p className={['text-sm font-semibold', isActive ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                    {label}
                  </p>
                  {discount > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                      {discount}% off
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-muted mt-1">{range}</p>
                <p className={['text-sm font-medium mt-2', isActive ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  {dailyRate > 0 ? (
                    <>
                      {formatPrice(discountedRate)} / day
                      {discount > 0 && (
                        <span className="text-xs text-brand-muted line-through ml-2">
                          {formatPrice(dailyRate)}
                        </span>
                      )}
                    </>
                  ) : (
                    'Contact for rate'
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Date range picker */}
      <div>
        <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">Select Dates</p>
        <div className="bg-black/20 rounded-[--radius-card] p-4 overflow-x-auto">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelect}
            disabled={disabledMatchers}
            excludeDisabled
            numberOfMonths={calMonths}
            classNames={{
              root: 'text-white select-none',
              months: 'relative flex flex-wrap gap-6 justify-center',
              month: 'space-y-3 w-full sm:w-[calc(9*2.25rem)]',
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
              day_button:
                'w-9 h-9 text-sm font-medium rounded transition-colors',
              selected: 'bg-brand-cyan text-black',
              range_start: 'bg-brand-cyan text-black rounded-full',
              range_middle: 'bg-brand-cyan/20 text-white rounded-none',
              range_end: 'bg-brand-cyan text-black rounded-full',
              disabled: 'text-white/15 line-through cursor-not-allowed',
              today: 'ring-1 ring-brand-cyan rounded',
              outside: 'text-white/10',
              hidden: 'invisible',
              chevron: 'fill-brand-cyan w-4 h-4',
            }}
          />
        </div>

        {/* Date range display */}
        {(startDate || endDate) && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-brand-muted">
              {startDate ? startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </span>
            <span className="text-brand-muted">→</span>
            <span className="text-brand-muted">
              {endDate ? endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select end date'}
            </span>
            {rentalDays > 0 && (
              <span className="text-brand-cyan text-xs font-medium ml-1">
                ({rentalDays} day{rentalDays !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        )}

        {/* Validation errors */}
        {(startDateError || endDateError) && (
          <p className="mt-2 text-xs text-red-400">
            {startDateError?.message ?? endDateError?.message}
          </p>
        )}
      </div>

      {/* Pickup & Dropoff time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-brand-muted uppercase tracking-wider mb-2">
            Pickup Time
          </label>
          <select
            {...form.register('startTime')}
            defaultValue="10:00"
            className="w-full bg-black/30 border border-brand-border rounded-[--radius-card] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan input-focus-glow appearance-none cursor-pointer"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={`pickup-${slot.value}`} value={slot.value}>{slot.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-brand-muted uppercase tracking-wider mb-2">
            Dropoff Time
          </label>
          <select
            {...form.register('endTime')}
            defaultValue="10:00"
            className="w-full bg-black/30 border border-brand-border rounded-[--radius-card] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan input-focus-glow appearance-none cursor-pointer"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={`dropoff-${slot.value}`} value={slot.value}>{slot.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
