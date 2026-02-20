'use client'

import { UseFormReturn } from 'react-hook-form'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'

interface StepDurationProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
  bookedRanges: Array<{ from: Date; to: Date }>
}

const DURATION_OPTIONS = [
  { value: 'daily' as const, label: 'Daily', unit: 'day' },
  { value: 'weekly' as const, label: 'Weekly', unit: 'week' },
  { value: 'monthly' as const, label: 'Monthly', unit: 'month' },
]

function formatRate(amount: number): string {
  return amount.toLocaleString('en-US')
}

export function StepDuration({ form, vehicle, bookedRanges }: StepDurationProps) {
  const durationType = form.watch('durationType')
  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')

  const selectedRange: DateRange | undefined =
    startDate || endDate
      ? { from: startDate, to: endDate }
      : undefined

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const disabledMatchers = [{ before: today }, ...bookedRanges]

  function getRateDisplay(type: 'daily' | 'weekly' | 'monthly'): string {
    const dailyRate = vehicle.daily_rate ?? 0
    switch (type) {
      case 'daily':
        return vehicle.daily_rate
          ? `AED ${formatRate(vehicle.daily_rate)} / day`
          : 'Contact for rate'
      case 'weekly':
        if (vehicle.weekly_rate) {
          return `AED ${formatRate(vehicle.weekly_rate)} / week`
        }
        return `AED ${formatRate(dailyRate * 7)} / week (calculated)`
      case 'monthly':
        if (vehicle.monthly_rate) {
          return `AED ${formatRate(vehicle.monthly_rate)} / month`
        }
        return `AED ${formatRate(dailyRate * 30)} / month (calculated)`
    }
  }

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
        <p className="text-sm text-brand-muted">Select your preferred rental period and dates.</p>
      </div>

      {/* Duration type cards */}
      <div>
        <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">Duration Type</p>
        <div className="grid grid-cols-3 gap-3">
          {DURATION_OPTIONS.map(({ value, label }) => {
            const selected = durationType === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => form.setValue('durationType', value, { shouldValidate: true })}
                className={[
                  'p-4 rounded-[--radius-card] border text-left transition-all',
                  selected
                    ? 'border-brand-cyan bg-brand-cyan/10'
                    : 'border-brand-border hover:border-white/30',
                ].join(' ')}
              >
                <p className={['text-sm font-semibold', selected ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  {label}
                </p>
                <p className="text-xs text-brand-muted mt-1">{getRateDisplay(value)}</p>
              </button>
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
            numberOfMonths={2}
            classNames={{
              root: 'text-white select-none',
              months: 'flex flex-wrap gap-6',
              month: 'space-y-3',
              month_caption: 'flex items-center justify-between',
              caption_label: 'font-display text-base font-medium text-white',
              nav: 'flex gap-1',
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
          </div>
        )}

        {/* Validation errors */}
        {(startDateError || endDateError) && (
          <p className="mt-2 text-xs text-red-400">
            {startDateError?.message ?? endDateError?.message}
          </p>
        )}
      </div>

      {/* Optional pickup time */}
      <div>
        <label className="block text-xs text-brand-muted uppercase tracking-wider mb-2">
          Pickup Time (optional)
        </label>
        <input
          type="time"
          defaultValue="10:00"
          {...form.register('startTime')}
          className="w-40 bg-black/30 border border-brand-border rounded-[--radius-card] px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan input-focus-glow"
        />
        <p className="mt-1 text-xs text-brand-muted">Default pickup time is 10:00 AM</p>
      </div>
    </div>
  )
}
