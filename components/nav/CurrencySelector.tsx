'use client'

import { useState, useRef, useEffect } from 'react'
import { useCurrency, type Currency } from '@/lib/currency/context'

const OPTIONS: { code: Currency; label: string }[] = [
  { code: 'AED', label: 'AED' },
  { code: 'USD', label: 'USD' },
  { code: 'GBP', label: 'GBP' },
  { code: 'EUR', label: 'EUR' },
]

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-medium tracking-wide text-brand-muted hover:text-white hover:bg-white/[0.04] transition-all duration-200"
      >
        {currency}
        <svg
          className={['w-3 h-3 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-24 rounded-lg border border-brand-border bg-brand-surface shadow-xl overflow-hidden z-50">
          {OPTIONS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setCurrency(code)
                setOpen(false)
              }}
              className={[
                'w-full text-left px-3 py-2 text-[13px] font-medium transition-colors',
                code === currency
                  ? 'text-brand-cyan bg-white/[0.06]'
                  : 'text-brand-muted hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Inline variant for mobile menu — renders flat buttons instead of a dropdown */
export function CurrencySelectorInline() {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <span className="text-xs text-brand-muted uppercase tracking-wider mr-2">Currency</span>
      {OPTIONS.map(({ code }) => (
        <button
          key={code}
          type="button"
          onClick={() => setCurrency(code)}
          className={[
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
            code === currency
              ? 'text-brand-cyan bg-white/[0.08]'
              : 'text-brand-muted hover:text-white hover:bg-white/[0.04]',
          ].join(' ')}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
