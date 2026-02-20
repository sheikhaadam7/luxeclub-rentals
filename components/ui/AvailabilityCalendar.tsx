'use client'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

interface AvailabilityCalendarProps {
  bookedRanges: Array<{ from: Date; to: Date }>
}

export function AvailabilityCalendar({ bookedRanges }: AvailabilityCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Combine past dates with booked ranges as disabled matchers
  const disabledMatchers = [
    { before: today },
    ...bookedRanges,
  ]

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-4 inline-block">
      <DayPicker
        mode="single"
        disabled={disabledMatchers}
        numberOfMonths={2}
        classNames={{
          root: 'text-white',
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
          day_button: 'w-9 h-9 text-sm text-white/70 hover:bg-white/10 rounded transition-colors duration-150',
          selected: 'bg-brand-cyan text-white rounded',
          disabled: 'text-white/20 cursor-not-allowed hover:bg-transparent',
          today: 'border border-brand-cyan/50 rounded',
          outside: 'text-white/15',
          hidden: 'invisible',
          focused: 'ring-1 ring-brand-cyan/50',
          range_start: 'bg-brand-cyan text-white rounded',
          range_end: 'bg-brand-cyan text-white rounded',
          range_middle: 'bg-brand-cyan/20 text-white',
          chevron: 'fill-brand-cyan w-4 h-4',
        }}
      />
    </div>
  )
}
