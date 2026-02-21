'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Currency = 'AED' | 'USD' | 'GBP' | 'EUR'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (c: Currency) => void
  formatPrice: (aedAmount: number, options?: { exact?: boolean }) => string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'luxeclub-currency'

const FALLBACK_RATES: Record<Currency, number> = {
  AED: 1,
  USD: 0.27,
  GBP: 0.22,
  EUR: 0.25,
}

const SYMBOLS: Record<Currency, string> = {
  AED: 'AED',
  USD: '$',
  GBP: '\u00A3',
  EUR: '\u20AC',
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('AED')
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES)

  // Read saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Currency | null
      if (saved && saved in FALLBACK_RATES) {
        setCurrencyState(saved)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  // Fetch live rates once on mount
  useEffect(() => {
    let cancelled = false

    async function fetchRates() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/AED')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data?.rates) return

        setRates({
          AED: 1,
          USD: data.rates.USD ?? FALLBACK_RATES.USD,
          GBP: data.rates.GBP ?? FALLBACK_RATES.GBP,
          EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
        })
      } catch {
        // Keep fallback rates
      }
    }

    fetchRates()
    return () => { cancelled = true }
  }, [])

  // Persist preference
  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {
      // localStorage unavailable
    }
  }, [])

  // Format an AED amount into the selected currency
  const formatPrice = useCallback(
    (aedAmount: number, options?: { exact?: boolean }): string => {
      if (currency === 'AED') {
        return `AED ${aedAmount.toLocaleString('en-US')}`
      }
      const raw = aedAmount * rates[currency]
      const converted = options?.exact
        ? Math.round(raw)
        : Math.ceil(raw / 5) * 5
      return `${SYMBOLS[currency]}${converted.toLocaleString('en-US')}`
    },
    [currency, rates],
  )

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
