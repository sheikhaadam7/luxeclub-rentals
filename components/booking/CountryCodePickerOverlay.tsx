'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

export interface CountryEntry {
  iso: string
  code: string
  flag: string
  label: string
}

interface CountryCodePickerOverlayProps {
  open: boolean
  countries: CountryEntry[]
  /** Subset shown under "Most popular" — ISO codes that should also exist in `countries`. */
  popularCodes?: string[]
  /** ISO code of the currently selected country. */
  initialValue?: string
  onClose: () => void
  /** Receives the ISO code of the selected country. */
  onSelect: (iso: string) => void
}

export function CountryCodePickerOverlay({
  open,
  countries,
  popularCodes = [],
  initialValue,
  onClose,
  onSelect,
}: CountryCodePickerOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => setMounted(true), [])

  // Reset the search when reopening
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return countries
    return countries.filter((c) => {
      return (
        c.label.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.code.replace('+', '').includes(q.replace('+', ''))
      )
    })
  }, [countries, query])

  const popular = useMemo(() => {
    if (query.trim()) return []
    return popularCodes
      .map((iso) => countries.find((c) => c.iso === iso))
      .filter((c): c is CountryEntry => !!c)
  }, [countries, popularCodes, query])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Country"
      className={`fixed inset-0 z-[120] ${open ? '' : 'pointer-events-none'}`}
    >
      {/* Desktop backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 hidden sm:block bg-black/60 transition-opacity duration-150 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet — full screen on mobile, centered modal on desktop */}
      <div className="absolute inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none">
        <div
          className={`bg-white flex flex-col
            h-[100dvh] w-full
            sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-[560px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-zinc-200
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
              Country
            </h2>
            <span className="w-11" />
          </div>

          {/* Search */}
          <div className="px-4 pt-4 pb-2">
            <div className="relative flex items-center">
              <svg
                className="absolute left-3 w-5 h-5 text-zinc-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3-3" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code"
                autoFocus
                className="w-full pl-11 pr-10 py-3 text-base border border-brand-cyan rounded-full focus:outline-none focus:ring-2 focus:ring-brand-cyan text-zinc-900 placeholder:text-zinc-400 bg-white"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6m0-6l-6 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain pb-6">
            {popular.length > 0 && (
              <>
                <p className="px-4 pt-2 pb-1 text-sm font-bold text-zinc-900">Most popular</p>
                <ul className="border-b border-zinc-200">
                  {popular.map((c) => (
                    <CountryRow
                      key={`pop-${c.iso}`}
                      country={c}
                      selected={initialValue === c.iso}
                      onSelect={() => {
                        onSelect(c.iso)
                        onClose()
                      }}
                    />
                  ))}
                </ul>
              </>
            )}

            {filtered.length > 0 ? (
              <ul>
                {filtered.map((c) => (
                  <CountryRow
                    key={`all-${c.iso}`}
                    country={c}
                    selected={initialValue === c.iso}
                    onSelect={() => {
                      onSelect(c.iso)
                      onClose()
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No country matches &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function CountryRow({
  country,
  selected,
  onSelect,
}: {
  country: CountryEntry
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full flex items-center gap-4 px-4 py-3 text-left active:bg-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors ${
          selected ? 'bg-brand-cyan/5' : ''
        }`}
      >
        <span className="text-2xl shrink-0">{country.flag}</span>
        <span className="text-base text-zinc-900 flex-1">
          {country.label} <span className="text-zinc-500">{country.code}</span>
        </span>
        {selected && (
          <svg className="w-5 h-5 text-brand-cyan shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </li>
  )
}
