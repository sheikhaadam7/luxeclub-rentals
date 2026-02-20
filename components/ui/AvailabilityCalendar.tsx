'use client'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

interface AvailabilityCalendarProps {
  bookedRanges: Array<{ from: Date; to: Date }>
}

export function AvailabilityCalendar({ bookedRanges }: AvailabilityCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const disabledMatchers = [
    { before: today },
    ...bookedRanges,
  ]

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-4 inline-block">
      <DayPicker
        disabled={disabledMatchers}
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
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          Unavailable
        </span>
      </div>
    </div>
  )
}
