'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { type DateRange } from 'react-day-picker'
import { differenceInDays, format } from 'date-fns'
import 'react-day-picker/style.css'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import { useTranslation } from '@/lib/i18n/context'
import { useSearchParams } from 'next/navigation'
import { useOverlayBackButton } from '@/lib/hooks/use-overlay-back-button'
import { MobileDateRangeOverlay } from '@/components/booking/MobileDateRangeOverlay'
import { MobileTimePickerOverlay } from '@/components/booking/MobileTimePickerOverlay'
import { MobileTimePickerStackedOverlay } from '@/components/booking/MobileTimePickerStackedOverlay'

interface StepDurationProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
  bookedRanges: Array<{ from: Date; to: Date }>
  /** Navigation buttons (Back / Continue) rendered inside the white card */
  navButtons?: React.ReactNode
  /** Called by the mobile flow's final Continue to advance the wizard to step 2 */
  onAdvance?: () => void
}

function getDurationType(days: number): 'daily' | 'weekly' | 'monthly' {
  if (days >= 30) return 'monthly'
  if (days >= 7) return 'weekly'
  return 'daily'
}

// 24-hour time slots, half-hour granularity, 06:00–23:30 (36 slots)
export const TIME_SLOTS = Array.from({ length: 36 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return { value, label: value }
})

export function StepDuration({ form, vehicle: _vehicle, bookedRanges, navButtons, onAdvance }: StepDurationProps) {
  const { t } = useTranslation()
  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')
  const startTime = form.watch('startTime') || '09:30'
  const endTime = form.watch('endTime') || '09:30'

  // Picker overlay state — full-screen sheet on mobile, centered modal on desktop.
  const [pickerOverlay, setPickerOverlay] = useState<'date' | 'time' | null>(null)

  // Single Android Back-button sentinel for the entire mobile overlay flow.
  // Lifted here (not per-overlay) so calendar→time transitions don't pop+push
  // history mid-switch and accidentally close the new overlay.
  useOverlayBackButton(pickerOverlay !== null, () => setPickerOverlay(null))

  // ?layout=stacked switches the time picker to the no-toggle preview variant.
  const searchParams = useSearchParams()
  const TimePicker =
    searchParams?.get('layout') === 'stacked'
      ? MobileTimePickerStackedOverlay
      : MobileTimePickerOverlay

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
    startDate || endDate ? { from: startDate, to: endDate } : undefined

  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const disabledMatchers = [
    { from: new Date(2020, 0, 1), to: yesterday },
    ...bookedRanges,
  ]

  function applyQuickDuration(days: number) {
    const from = startDate instanceof Date ? startDate : new Date()
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
    form.setValue('startDate', start, { shouldValidate: true })
    form.setValue('endDate', end, { shouldValidate: true })
  }

  const QUICK_DURATIONS = [
    { label: '1 day', days: 1 },
    { label: '3 days', days: 3 },
    { label: '1 week', days: 7 },
    { label: '1 month', days: 30 },
  ]

  const startDateError = form.formState.errors.startDate
  const endDateError = form.formState.errors.endDate

  const fmtDate = (d?: Date) => (d ? format(d, 'd MMM') : t('booking.selectDate'))

  // Visual styles for the date/time boxes
  const boxBase =
    'px-4 py-4 flex items-center gap-2 text-left bg-white border border-zinc-300 rounded-[var(--radius-card)] cursor-pointer hover:bg-zinc-50 hover:border-zinc-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-inset'

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-zinc-900 mb-1">
          {t('booking.rentalDuration')}
        </h2>
        <p className="text-sm text-zinc-500">{t('booking.rentalDurationDesc')}</p>
      </div>

      {/* Quick-select duration chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_DURATIONS.map((d) => {
          const active = rentalDays === d.days
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => applyQuickDuration(d.days)}
              className={[
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors min-h-[44px]',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
              ].join(' ')}
            >
              {d.label}
            </button>
          )
        })}
      </div>

      {/* Compact pickup / return inputs */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-3 items-end">
          {/* Driver age — to the left of pickup */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
              {t('booking.driverAge')}
            </label>
            <div className="relative flex items-center gap-2 px-3 py-3 border border-zinc-300 rounded-[var(--radius-card)] bg-white hover:bg-zinc-50 cursor-pointer focus-within:ring-2 focus-within:ring-brand-cyan transition-colors">
              <svg
                className="w-4 h-4 text-zinc-700 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <circle cx="12" cy="8" r="4" />
                <path strokeLinecap="round" d="M4 21c0-4 4-7 8-7s8 3 8 7" />
              </svg>
              <span className="text-sm font-medium text-zinc-700 whitespace-nowrap">
                {t('booking.driverAge')}
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {form.watch('driverAge') ?? '30+'}
              </span>
              <svg
                className="w-4 h-4 text-zinc-700 shrink-0 ml-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {/* Invisible native select covering the whole pill — tapping anywhere opens the picker */}
              <select
                {...form.register('driverAge')}
                aria-label={t('booking.driverAge')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                suppressHydrationWarning
              >
                {['21', '22', '23', '24', '25', '26', '27', '28', '29', '30+'].map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pickup group: separate date + time boxes */}
          <div>
            <label className="text-sm font-semibold text-zinc-900 mb-2 block">
              {t('booking.pickupDate')}
            </label>
            <div className="grid grid-cols-[3fr_2fr] gap-2">
              <button
                type="button"
                aria-label={t('booking.pickupDate')}
                onClick={() => setPickerOverlay('date')}
                className={boxBase}
              >
                <svg className="w-5 h-5 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
                </svg>
                <span className="text-base font-semibold text-zinc-900 whitespace-nowrap">
                  {fmtDate(startDate)}
                </span>
              </button>
              <button
                type="button"
                aria-label={t('booking.pickupTime')}
                onClick={() => setPickerOverlay('time')}
                className={boxBase}
              >
                <span className="text-base font-semibold text-zinc-900">{startTime}</span>
              </button>
            </div>
          </div>

          {/* Return group: separate date + time boxes */}
          <div>
            <label className="text-sm font-semibold text-zinc-900 mb-2 block">
              {t('booking.returnDate')}
            </label>
            <div className="grid grid-cols-[3fr_2fr] gap-2">
              <button
                type="button"
                aria-label={t('booking.returnDate')}
                onClick={() => setPickerOverlay('date')}
                className={boxBase}
              >
                <svg className="w-5 h-5 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
                </svg>
                <span className="text-base font-semibold text-zinc-900 whitespace-nowrap">
                  {fmtDate(endDate)}
                </span>
              </button>
              <button
                type="button"
                aria-label={t('booking.dropoffTime')}
                onClick={() => setPickerOverlay('time')}
                className={boxBase}
              >
                <span className="text-base font-semibold text-zinc-900">{endTime}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rental length summary + tier-discount badge */}
      {rentalDays > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-zinc-700">
            {rentalDays} {rentalDays !== 1 ? t('booking.days') : t('booking.day')}
          </p>
          {activeTier === 'weekly' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Weekly rate applied — 10% off
            </span>
          )}
          {activeTier === 'monthly' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Monthly rate applied — 20% off
            </span>
          )}
        </div>
      )}

      {/* Validation errors */}
      {(startDateError || endDateError) && (
        <p className="text-xs text-red-500">
          {startDateError?.message ?? endDateError?.message}
        </p>
      )}

      {/* Hidden inputs so react-hook-form's register picks up start/end times */}
      <input type="hidden" {...form.register('startTime')} />
      <input type="hidden" {...form.register('endTime')} />

      {/* Navigation buttons inside the white card */}
      {navButtons && <div className="pt-4 border-t border-zinc-200">{navButtons}</div>}

      {/* Picker overlays — full-screen sheet on mobile, centered modal on desktop */}
      <MobileDateRangeOverlay
        open={pickerOverlay === 'date'}
        initialRange={selectedRange}
        disabledMatchers={disabledMatchers}
        onClose={() => setPickerOverlay(null)}
        onContinue={(range) => {
          form.setValue('startDate', range.from, { shouldValidate: true })
          form.setValue('endDate', range.to, { shouldValidate: true })
          setPickerOverlay('time')
        }}
      />
      <TimePicker
        open={pickerOverlay === 'time'}
        startDate={startDate}
        endDate={endDate}
        initialStartTime={startTime}
        initialEndTime={endTime}
        onBack={() => setPickerOverlay(null)}
        onContinue={({ startTime: s, endTime: e }) => {
          form.setValue('startTime', s, { shouldValidate: true })
          form.setValue('endTime', e, { shouldValidate: true })
          setPickerOverlay(null)
          onAdvance?.()
        }}
      />
    </div>
  )
}
