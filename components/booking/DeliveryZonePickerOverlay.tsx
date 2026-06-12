'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCurrency } from '@/lib/currency/context'

export interface ZoneEntry {
  value: string
  label: string
  fee: number
}

interface DeliveryZonePickerOverlayProps {
  open: boolean
  zones: ZoneEntry[]
  initialValue?: string
  onClose: () => void
  onSelect: (value: string) => void
}

export function DeliveryZonePickerOverlay({
  open,
  zones,
  initialValue,
  onClose,
  onSelect,
}: DeliveryZonePickerOverlayProps) {
  const { formatPrice } = useCurrency()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Delivery zone"
      className={`fixed inset-0 z-[120] ${open ? '' : 'pointer-events-none'}`}
    >
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 hidden sm:block bg-black/60 transition-opacity duration-150 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="absolute inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none">
        <div
          className={`bg-white flex flex-col
            h-[100dvh] w-full
            sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-[560px] sm:rounded-2xl sm:shadow-2xl sm:border-2 sm:border-brand-cyan
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
              className="flex items-center justify-center w-11 h-11 -ml-2 text-zinc-900 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-zinc-900">
              Delivery zone
            </h2>
            <span className="w-11" />
          </div>

          {/* Intro copy */}
          <div className="px-4 pt-4 pb-2 sm:px-6">
            <p className="text-sm text-zinc-700 leading-relaxed">
              This is the hassle-free delivery & return service — we bring your chosen car to you
              for a small additional fee. No need to stress, no hassle. Just let us handle
              everything for you.
            </p>
          </div>

          {/* Zone list */}
          <div className="flex-1 overflow-y-auto overscroll-contain pb-6 pt-2">
            <ul>
              {zones.map((z) => {
                const isSelected = initialValue === z.value
                return (
                  <li key={z.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(z.value)
                        onClose()
                      }}
                      className={`w-full flex items-center gap-4 px-4 sm:px-6 py-4 text-left active:bg-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors border-b border-zinc-100 ${
                        isSelected ? 'bg-brand-cyan/5' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-zinc-900">{z.label}</p>
                      </div>
                      <p className="text-base font-bold text-zinc-900 tabular-nums shrink-0">
                        {formatPrice(z.fee, { exact: true })}
                      </p>
                      {isSelected && (
                        <svg className="w-5 h-5 text-brand-cyan shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
