'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { format, isSameDay } from 'date-fns'
import { TIME_SLOTS } from '@/components/booking/StepDuration'

interface MobileTimePickerStackedOverlayProps {
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

function nextSlotAfter(value: string): string | null {
  const target = toMinutes(value)
  const next = TIME_SLOTS.find((s) => toMinutes(s.value) > target)
  return next?.value ?? null
}

export function MobileTimePickerStackedOverlay({
  open,
  startDate,
  endDate,
  initialStartTime,
  initialEndTime,
  onBack,
  onContinue,
}: MobileTimePickerStackedOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [startTime, setStartTime] = useState(initialStartTime || '09:30')
  const [endTime, setEndTime] = useState(initialEndTime || '09:30')
  const [returnTouched, setReturnTouched] = useState(false)
  const pickupSelectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) {
      setStartTime(initialStartTime || '09:30')
      setEndTime(initialEndTime || '09:30')
      setReturnTouched(false)
    }
  }, [open, initialStartTime, initialEndTime])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onBack])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      pickupSelectedRef.current?.scrollIntoView({ block: 'center' })
    }, 50)
    return () => clearTimeout(t)
  }, [open])

  if (!mounted) return null

  const sameDay = startDate instanceof Date && endDate instanceof Date && isSameDay(startDate, endDate)
  const returnMinMinutes = sameDay ? toMinutes(startTime) : -1

  function pickPickup(value: string) {
    setStartTime(value)
    if (!returnTouched) {
      if (sameDay) {
        const bumped = nextSlotAfter(value)
        setEndTime(bumped ?? value)
      } else {
        setEndTime(value)
      }
    }
  }

  function pickReturn(value: string) {
    setEndTime(value)
    setReturnTouched(true)
  }

  const continueDisabled = sameDay && toMinutes(endTime) <= toMinutes(startTime)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pickup and return time"
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
        <h2 className="font-display text-base font-semibold text-zinc-900 text-center">Pickup &amp; return time</h2>
        <span className="w-11" />
      </div>

      {/* Display-only summary cards */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3 border-b border-zinc-200">
        <div className="rounded-[var(--radius-card)] p-3 border border-zinc-300">
          <div className="text-xs font-semibold text-zinc-900 mb-2">Pickup</div>
          <div className="flex items-center gap-2 text-sm text-zinc-900">
            <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
            </svg>
            <span className="font-semibold">{formatDate(startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-900 mt-1.5">
            <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 3" />
            </svg>
            <span className="font-semibold">{startTime}</span>
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] p-3 border border-zinc-300">
          <div className="text-xs font-semibold text-zinc-900 mb-2">Return</div>
          <div className="flex items-center gap-2 text-sm text-zinc-900">
            <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
            </svg>
            <span className="font-semibold">{formatDate(endDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-900 mt-1.5">
            <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 3" />
            </svg>
            <span className="font-semibold">{endTime}</span>
          </div>
          {!returnTouched && (
            <div className="text-[11px] text-zinc-500 mt-1.5">Same as pickup</div>
          )}
        </div>
      </div>

      {/* Body — stacked lists */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {/* Pickup section */}
        <h3 className="text-base font-bold text-zinc-900 mb-3">Pickup time</h3>
        <div className="grid grid-cols-2 gap-2.5 mb-8">
          {TIME_SLOTS.map((slot) => {
            const isSelected = startTime === slot.value
            return (
              <button
                key={`pickup-${slot.value}`}
                ref={isSelected ? pickupSelectedRef : undefined}
                type="button"
                onClick={() => pickPickup(slot.value)}
                className={`min-h-11 px-4 py-3 rounded-[var(--radius-card)] text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-50 text-zinc-900 active:bg-zinc-100'
                }`}
              >
                {slot.label}
              </button>
            )
          })}
        </div>

        <div className="h-px bg-zinc-200 mb-6" />

        {/* Return section */}
        <h3 className="text-base font-bold text-zinc-900 mb-3">Return time</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {TIME_SLOTS.map((slot) => {
            const disabled = toMinutes(slot.value) <= returnMinMinutes
            const isSelected = endTime === slot.value
            return (
              <button
                key={`return-${slot.value}`}
                type="button"
                disabled={disabled}
                onClick={() => pickReturn(slot.value)}
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
        {!returnTouched && (
          <p className="text-xs text-zinc-500 mt-3">Return time defaults to pickup time</p>
        )}
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
