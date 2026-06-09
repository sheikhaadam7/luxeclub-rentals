'use client'

import { useEffect, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { DayPicker, type DateRange } from 'react-day-picker'
import { differenceInDays, format } from 'date-fns'
import 'react-day-picker/style.css'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import { useTranslation, useLanguage } from '@/lib/i18n/context'
import { getDateLocale } from '@/lib/i18n/date-locale'
import { useSearchParams } from 'next/navigation'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
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

type OpenPopover = 'date' | 'pickupTime' | 'returnTime' | null

export function StepDuration({ form, vehicle: _vehicle, bookedRanges, navButtons, onAdvance }: StepDurationProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const dateLocale = getDateLocale(language)
  const isMobile = useIsMobile()
  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')
  const startTime = form.watch('startTime') || '10:00'
  const endTime = form.watch('endTime') || '10:00'

  const [openPopover, setOpenPopover] = useState<OpenPopover>(null)
  const [mobileOverlay, setMobileOverlay] = useState<'date' | 'time' | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Single Android Back-button sentinel for the entire mobile overlay flow.
  // Lifted here (not per-overlay) so calendar→time transitions don't pop+push
  // history mid-switch and accidentally close the new overlay.
  useOverlayBackButton(mobileOverlay !== null, () => setMobileOverlay(null))

  // ?layout=stacked switches the time picker to the no-toggle preview variant.
  const searchParams = useSearchParams()
  const TimePicker =
    searchParams?.get('layout') === 'stacked'
      ? MobileTimePickerStackedOverlay
      : MobileTimePickerOverlay
  // Number of day-clicks within the current open of the calendar popover.
  // The popover should only close after the SECOND selection (pickup + return).
  const calendarSelectionCount = useRef(0)

  // Responsive month count for the calendar popover
  const [calMonths, setCalMonths] = useState(1)
  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setCalMonths(3)
      else if (window.matchMedia('(min-width: 640px)').matches) setCalMonths(2)
      else setCalMonths(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Reset the calendar click counter every time the calendar popover opens fresh
  useEffect(() => {
    if (openPopover === 'date') {
      calendarSelectionCount.current = 0
    }
  }, [openPopover])

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!openPopover) return
    function handleDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenPopover(null)
    }
    // Defer one frame so the click that opened the popover doesn't immediately close it
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handleDown)
      document.addEventListener('keydown', handleKey)
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openPopover])

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
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const disabledMatchers = [
    { from: new Date(2020, 0, 1), to: yesterday },
    ...bookedRanges,
  ]

  function handleRangeSelect(range: DateRange | undefined) {
    form.setValue('startDate', range?.from as Date, { shouldValidate: true })
    form.setValue('endDate', range?.to as Date, { shouldValidate: true })
    calendarSelectionCount.current += 1
    // First click sets pickup (calendar stays open). Second click sets return
    // and we close once both endpoints are defined.
    if (calendarSelectionCount.current >= 2 && range?.from && range?.to) {
      setOpenPopover(null)
    }
  }

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
    'px-4 py-4 flex items-center gap-2 text-left bg-white border border-zinc-300 rounded-[var(--radius-card)] hover:bg-zinc-50 transition-colors focus:outline-none'
  const boxActive = 'ring-2 ring-brand-cyan ring-inset'

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
      <div ref={popoverRef} className="relative">
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
                onClick={() => isMobile ? setMobileOverlay('date') : setOpenPopover((p) => (p === 'date' ? null : 'date'))}
                className={[boxBase, openPopover === 'date' ? boxActive : ''].join(' ')}
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
                onClick={() => isMobile ? setMobileOverlay('time') : setOpenPopover((p) => (p === 'pickupTime' ? null : 'pickupTime'))}
                className={[boxBase, openPopover === 'pickupTime' ? boxActive : ''].join(' ')}
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
                onClick={() => isMobile ? setMobileOverlay('date') : setOpenPopover((p) => (p === 'date' ? null : 'date'))}
                className={[boxBase, openPopover === 'date' ? boxActive : ''].join(' ')}
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
                onClick={() => isMobile ? setMobileOverlay('time') : setOpenPopover((p) => (p === 'returnTime' ? null : 'returnTime'))}
                className={[boxBase, openPopover === 'returnTime' ? boxActive : ''].join(' ')}
              >
                <span className="text-base font-semibold text-zinc-900">{endTime}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar popover */}
        {openPopover === 'date' && (
          <div className="absolute left-0 right-0 sm:right-auto mt-3 bg-white rounded-[var(--radius-card)] shadow-2xl border-2 border-brand-cyan p-4 sm:p-6 z-20 overflow-x-auto">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={handleRangeSelect}
              disabled={disabledMatchers}
              excludeDisabled
              startMonth={currentMonthStart}
              numberOfMonths={calMonths}
              locale={dateLocale}
              classNames={{
                root: 'text-zinc-900 select-none',
                months: 'relative flex flex-wrap gap-4 sm:gap-5 justify-center',
                month: 'space-y-3 w-full sm:w-fit',
                month_caption: 'flex items-center justify-center pb-2',
                caption_label: 'font-display text-2xl font-bold text-zinc-900',
                nav: 'absolute top-1 inset-x-0 flex items-center justify-between z-10',
                button_previous: 'p-1 text-zinc-600 hover:text-zinc-900 transition-colors rounded',
                button_next: 'p-1 text-zinc-600 hover:text-zinc-900 transition-colors rounded',
                month_grid: 'w-full border-collapse',
                weekdays: 'flex',
                weekday:
                  'w-9 sm:w-10 h-8 text-xs uppercase text-zinc-500 text-center flex items-center justify-center font-semibold',
                weeks: 'mt-1',
                week: 'flex',
                day: 'w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center',
                day_button:
                  'w-9 sm:w-10 h-9 sm:h-10 text-sm sm:text-base font-bold rounded-full transition-colors text-zinc-900 hover:bg-zinc-100',
                selected: 'bg-zinc-900 text-white',
                range_start: 'bg-zinc-900 text-white rounded-full',
                range_middle: 'bg-zinc-100 text-zinc-900 rounded-none',
                range_end: 'bg-zinc-900 text-white rounded-full',
                disabled: 'text-zinc-300 cursor-not-allowed',
                today: '[&_button]:!text-red-600 [&_button]:!font-bold',
                outside: 'text-zinc-300',
                hidden: 'invisible',
                chevron: 'fill-current w-5 h-5',
              }}
            />
          </div>
        )}

        {/* Time popover */}
        {(openPopover === 'pickupTime' || openPopover === 'returnTime') && (
          <div className="absolute left-0 right-0 sm:left-auto sm:right-auto mt-3 bg-white rounded-[var(--radius-card)] shadow-2xl border-2 border-brand-cyan p-5 z-20 sm:w-96">
            <p className="text-base font-semibold text-zinc-900 text-center mb-2">
              {openPopover === 'pickupTime' ? t('booking.selectPickupTime') : t('booking.selectReturnTime')}
            </p>
            <p className="text-xs text-zinc-500 flex items-center gap-1 mb-4">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 3" />
              </svg>
              24-hour {openPopover === 'pickupTime' ? t('booking.pickup') : t('booking.return')}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {TIME_SLOTS.map((slot) => {
                const field = openPopover === 'pickupTime' ? 'startTime' : 'endTime'
                const isSelected = (form.watch(field) || '10:00') === slot.value
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => {
                      form.setValue(field, slot.value, { shouldValidate: true })
                      setOpenPopover(null)
                    }}
                    className={[
                      'px-4 py-3 rounded-[var(--radius-card)] text-sm font-semibold transition-colors',
                      isSelected
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100',
                    ].join(' ')}
                  >
                    {slot.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
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

      {/* Mobile full-screen overlays */}
      <MobileDateRangeOverlay
        open={mobileOverlay === 'date'}
        initialRange={selectedRange}
        disabledMatchers={disabledMatchers}
        onClose={() => setMobileOverlay(null)}
        onContinue={(range) => {
          form.setValue('startDate', range.from, { shouldValidate: true })
          form.setValue('endDate', range.to, { shouldValidate: true })
          setMobileOverlay('time')
        }}
      />
      <TimePicker
        open={mobileOverlay === 'time'}
        startDate={startDate}
        endDate={endDate}
        initialStartTime={startTime}
        initialEndTime={endTime}
        onBack={() => setMobileOverlay(null)}
        onContinue={({ startTime: s, endTime: e }) => {
          form.setValue('startTime', s, { shouldValidate: true })
          form.setValue('endTime', e, { shouldValidate: true })
          setMobileOverlay(null)
          onAdvance?.()
        }}
      />
    </div>
  )
}
