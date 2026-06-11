'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker, type DateRange, type Matcher } from 'react-day-picker'
import { useLanguage } from '@/lib/i18n/context'
import { getDateLocale } from '@/lib/i18n/date-locale'

interface MobileDateRangeOverlayProps {
  open: boolean
  initialRange: DateRange | undefined
  disabledMatchers: Matcher[]
  onClose: () => void
  onContinue: (range: { from: Date; to: Date }) => void
}

export function MobileDateRangeOverlay({
  open,
  initialRange,
  disabledMatchers,
  onClose,
  onContinue,
}: MobileDateRangeOverlayProps) {
  const { language } = useLanguage()
  const dateLocale = getDateLocale(language)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(initialRange)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Seed local state when opening, so closing without Continue discards changes.
  useEffect(() => {
    if (open) setRange(initialRange)
  }, [open, initialRange])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Escape key closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Mobile only: auto-scroll to the month containing `from` (or today) when opening.
  useEffect(() => {
    if (!open || isDesktop) return
    const t = setTimeout(() => {
      const body = bodyRef.current
      if (!body) return
      const target = range?.from ?? new Date()
      const monthLabel = target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const captions = body.querySelectorAll<HTMLElement>('.rdp-caption_label, [class*="caption_label"]')
      for (const el of captions) {
        if (el.textContent?.includes(monthLabel.split(' ')[0])) {
          el.scrollIntoView({ block: 'start' })
          break
        }
      }
    }, 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDesktop])

  if (!mounted) return null

  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const canContinue = !!range?.from && !!range?.to
  const hasAnySelection = !!range?.from || !!range?.to

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trip dates"
      className={`fixed inset-0 z-[110] ${open ? '' : 'pointer-events-none'}`}
    >
      {/* Desktop backdrop — click to close */}
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 hidden sm:block bg-black/60 transition-opacity duration-150 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet — full-screen on mobile (slide up), centered modal on desktop (fade) */}
      <div className="absolute inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none">
        <div
          className={`bg-white flex flex-col
            h-[100dvh] w-full
            sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-[860px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-zinc-200
            transition-transform duration-200
            sm:transition-[opacity,transform] sm:duration-150 sm:will-change-[opacity,transform]
            ${open ? 'pointer-events-auto' : 'pointer-events-none'}
            ${
              open
                ? 'translate-y-0 sm:opacity-100 sm:scale-100'
                : 'translate-y-full sm:translate-y-0 sm:opacity-0 sm:scale-[0.98]'
            }`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 z-10 sm:rounded-t-2xl">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex items-center justify-center w-11 h-11 -ml-2 text-zinc-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-display text-base font-semibold text-zinc-900 text-center">Trip dates</h2>
            <button
              type="button"
              onClick={() => setRange(undefined)}
              disabled={!hasAnySelection}
              className="text-sm font-medium text-zinc-700 px-2 h-11 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>

          {/* Body */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={disabledMatchers}
              excludeDisabled
              startMonth={currentMonthStart}
              numberOfMonths={isDesktop ? 2 : 6}
              pagedNavigation={isDesktop}
              locale={dateLocale}
              classNames={{
                root: 'text-zinc-900 select-none',
                months: isDesktop ? 'flex flex-row gap-8 justify-center' : 'flex flex-col gap-6',
                month: 'space-y-3 w-full sm:w-auto sm:min-w-[280px]',
                month_caption: 'flex items-center justify-center pb-2',
                caption_label: 'font-display text-xl font-bold text-zinc-900',
                nav: isDesktop ? 'flex items-center justify-between absolute inset-x-0 top-1 px-2' : 'hidden',
                button_previous: 'w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-700',
                button_next: 'w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-700',
                chevron: 'w-5 h-5 fill-current',
                month_grid: 'w-full border-collapse',
                weekdays: 'grid grid-cols-7',
                weekday: 'h-8 text-xs uppercase text-zinc-500 text-center flex items-center justify-center font-semibold',
                weeks: 'mt-1',
                week: 'grid grid-cols-7',
                day: 'h-11 flex items-center justify-center sm:h-10',
                day_button:
                  'w-11 h-11 sm:w-10 sm:h-10 text-sm font-bold rounded-full transition-colors text-zinc-900 active:bg-zinc-200 hover:bg-zinc-100',
                selected: 'bg-zinc-900 text-white',
                range_start: '!bg-zinc-900 text-white [&_button]:!bg-zinc-900 [&_button]:!text-white rounded-l-full',
                range_middle: '!bg-zinc-100 [&_button]:!bg-zinc-100 [&_button]:!text-zinc-900 [&_button]:!rounded-none',
                range_end: '!bg-zinc-900 text-white [&_button]:!bg-zinc-900 [&_button]:!text-white rounded-r-full',
                disabled: 'text-zinc-300 cursor-not-allowed',
                today: '[&_button]:!text-red-600 [&_button]:!font-bold',
                outside: 'text-zinc-300',
                hidden: 'invisible',
              }}
            />
          </div>

          {/* Footer */}
          <div
            className="border-t border-zinc-200 px-4 pt-3 bg-white sm:px-6 sm:py-4 sm:rounded-b-2xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <button
              type="button"
              onClick={() => {
                if (range?.from && range?.to) onContinue({ from: range.from, to: range.to })
              }}
              disabled={!canContinue}
              className="w-full py-3.5 rounded-[var(--radius-card)] bg-brand-cyan text-black text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
