'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { format, isSameDay } from 'date-fns'
import { TIME_SLOTS } from '@/components/booking/StepDuration'

interface MobileTimePickerOverlayProps {
  open: boolean
  startDate: Date | undefined
  endDate: Date | undefined
  initialStartTime: string
  initialEndTime: string
  onBack: () => void
  onContinue: (values: { startTime: string; endTime: string }) => void
}

function formatDate(d: Date | undefined): string {
  return d ? format(d, 'd MMM yyyy') : '—'
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Next 30-min slot after the given value, or null if none in TIME_SLOTS. */
function nextSlotAfter(value: string): string | null {
  const target = toMinutes(value)
  const next = TIME_SLOTS.find((s) => toMinutes(s.value) > target)
  return next?.value ?? null
}

export function MobileTimePickerOverlay({
  open,
  startDate,
  endDate,
  initialStartTime,
  initialEndTime,
  onBack,
  onContinue,
}: MobileTimePickerOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [activeMode, setActiveMode] = useState<'pickup' | 'return'>('pickup')
  const [startTime, setStartTime] = useState(initialStartTime || '10:00')
  const [endTime, setEndTime] = useState(initialEndTime || '10:00')
  const [returnTouched, setReturnTouched] = useState(false)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  // Seed local state when opening; reset touched flag.
  useEffect(() => {
    if (open) {
      setStartTime(initialStartTime || '10:00')
      setEndTime(initialEndTime || '10:00')
      setReturnTouched(false)
      setActiveMode('pickup')
    }
  }, [open, initialStartTime, initialEndTime])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Escape closes (treats as back)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onBack])

  // Auto-scroll to the currently active chip on open and on mode change
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      selectedRef.current?.scrollIntoView({ block: 'center' })
    }, 50)
    return () => clearTimeout(t)
  }, [open, activeMode])

  if (!mounted) return null

  const sameDay = startDate instanceof Date && endDate instanceof Date && isSameDay(startDate, endDate)

  // For Return mode on same-day rentals, disable chips ≤ startTime
  const returnMinMinutes = sameDay ? toMinutes(startTime) : -1
  const isDisabledForActive = (value: string) =>
    activeMode === 'return' && toMinutes(value) <= returnMinMinutes

  // Split slots into morning–afternoon (< 17:30) and evening–night (>= 17:30)
  const eveningCutoff = toMinutes('17:30')
  const morning = TIME_SLOTS.filter((s) => toMinutes(s.value) < eveningCutoff)
  const evening = TIME_SLOTS.filter((s) => toMinutes(s.value) >= eveningCutoff)

  const activeValue = activeMode === 'pickup' ? startTime : endTime
  const title = activeMode === 'pickup' ? 'Select pickup time' : 'Select return time'

  function handlePickChip(value: string) {
    if (activeMode === 'pickup') {
      setStartTime(value)
      if (!returnTouched) {
        // Auto-sync return; bump on same-day to keep return > pickup
        if (sameDay) {
          const bumped = nextSlotAfter(value)
          setEndTime(bumped ?? value)
        } else {
          setEndTime(value)
        }
      }
    } else {
      setEndTime(value)
      setReturnTouched(true)
    }
  }

  const continueDisabled = sameDay && toMinutes(endTime) <= toMinutes(startTime)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-[110] bg-white flex flex-col transition-transform duration-200 ${
        open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 z-10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex items-center justify-center w-11 h-11 -ml-2 text-zinc-900"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-display text-xl font-semibold text-zinc-900 text-center">{title}</h2>
        <span className="w-11" />
      </div>

      {/* Summary cards — both clickable to toggle activeMode */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3 border-b border-zinc-200">
        {(['pickup', 'return'] as const).map((cardMode) => {
          const active = activeMode === cardMode
          const label = cardMode === 'pickup' ? 'Pickup' : 'Return'
          const dateValue = cardMode === 'pickup' ? startDate : endDate
          const timeValue = cardMode === 'pickup' ? startTime : endTime
          const iconClass = active ? 'text-black' : 'text-zinc-700'
          const textClass = active ? 'text-black' : 'text-zinc-900'
          return (
            <button
              key={cardMode}
              type="button"
              onClick={() => setActiveMode(cardMode)}
              aria-pressed={active}
              className={`text-left rounded-[var(--radius-card)] p-3 transition-all ${
                active
                  ? 'bg-brand-cyan shadow-sm active:scale-[0.98]'
                  : 'bg-white border border-zinc-300 active:bg-zinc-50'
              }`}
            >
              <div className={`text-base font-bold mb-2 ${textClass}`}>{label}</div>
              <div className={`flex items-center gap-2 text-sm ${textClass}`}>
                <svg className={`w-4 h-4 ${iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
                </svg>
                <span className="font-semibold">{formatDate(dateValue)}</span>
              </div>
              <div className={`flex items-center gap-2 text-sm mt-1.5 ${textClass}`}>
                <svg className={`w-4 h-4 ${iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 7v5l3 3" />
                </svg>
                <span className="font-semibold">{timeValue}</span>
              </div>
              {/* Inactive-card affordance: "Tap to edit" + optional "Same as pickup" for return */}
              {!active && (
                <div className="mt-1.5 space-y-0.5">
                  {cardMode === 'return' && !returnTouched && (
                    <div className="text-[11px] text-zinc-500">Same as pickup</div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Tap to edit</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <h3 className="text-base font-bold text-zinc-900 mb-3">Morning – afternoon</h3>
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {morning.map((slot) => {
            const disabled = isDisabledForActive(slot.value)
            const isSelected = activeValue === slot.value
            return (
              <button
                key={`am-${slot.value}`}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                disabled={disabled}
                onClick={() => handlePickChip(slot.value)}
                className={`min-h-11 px-4 py-3 rounded-[var(--radius-card)] text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-50 text-zinc-900 active:bg-zinc-100'
                } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {slot.label}
              </button>
            )
          })}
        </div>

        <h3 className="text-base font-bold text-zinc-900 mb-3">Evening – night</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {evening.map((slot) => {
            const disabled = isDisabledForActive(slot.value)
            const isSelected = activeValue === slot.value
            return (
              <button
                key={`pm-${slot.value}`}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                disabled={disabled}
                onClick={() => handlePickChip(slot.value)}
                className={`min-h-11 px-4 py-3 rounded-[var(--radius-card)] text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-50 text-zinc-900 active:bg-zinc-100'
                } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {slot.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className="border-t border-zinc-200 px-4 pt-3 bg-white"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <button
          type="button"
          onClick={() => onContinue({ startTime, endTime })}
          disabled={continueDisabled}
          className="w-full py-3.5 rounded-[var(--radius-card)] bg-brand-cyan text-black text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>,
    document.body,
  )
}
