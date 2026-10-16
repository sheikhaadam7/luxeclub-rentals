'use client'

import { fromDateKey, toDateKey, businessTodayKey } from '@/lib/dates'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { useLanguage, useTranslation } from '@/lib/i18n/context'
import { getDateLocale } from '@/lib/i18n/date-locale'

interface AvailabilityCalendarProps {
  /** Calendar days as stored. Converted to local Dates here, in the
      viewer's own timezone -- a Date built on the server would be UTC
      midnight and grey out the wrong day west of us. */
  bookedRanges: Array<{ from: string; to: string }>
}

export function AvailabilityCalendar({ bookedRanges }: AvailabilityCalendarProps) {
  const { language } = useLanguage()
  const { t } = useTranslation()
  const dateLocale = getDateLocale(language)
  // Compared as calendar-day strings against Dubai's today. The old
  // version built a bespoke y*10000 + month*100 + day number from the
  // VIEWER's clock -- and with a 0-based month, so it was not even a
  // sortable YYYYMMDD. This is display-only, so it greys past days but
  // not today's gone slots: the car is still available today even once
  // it can no longer be collected today.
  const todayKey = businessTodayKey()
  const isPastDay = (date: Date) => toDateKey(date) < todayKey

  const disabledMatchers = [
    isPastDay,
    ...bookedRanges.map((r) => ({ from: fromDateKey(r.from), to: fromDateKey(r.to) })),
  ]

  // inline-block sizes the card to its content, so it must also be capped at
  // the available width — otherwise a narrow phone gets a card wider than the
  // screen and the whole page scrolls sideways. overflow-x-auto keeps the grid
  // scrollable inside the card on very small screens.
  return (
    <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4 inline-block max-w-full overflow-x-auto">
      <DayPicker
        disabled={disabledMatchers}
        numberOfMonths={2}
        locale={dateLocale}
        classNames={{
          root: 'text-white select-none',
          months: 'relative flex flex-wrap gap-6 justify-center',
          month: 'space-y-3 w-[calc(7*2.25rem)] max-w-full',
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
          chevron: 'fill-brand-cyan w-4 h-4',
        }}
      />
      <div className="mt-3 flex items-center gap-4 text-xs text-brand-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-brand-cyan/20 border border-brand-cyan/40" />
          {t('calendar.available')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          {t('calendar.unavailable')}
        </span>
      </div>
    </div>
  )
}
