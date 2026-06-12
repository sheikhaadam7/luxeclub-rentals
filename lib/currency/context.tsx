'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Currency = 'AED' | 'USD' | 'GBP' | 'EUR' | 'SAR' | 'RUB' | 'CNY'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (c: Currency) => void
  formatPrice: (aedAmount: number, options?: { exact?: boolean }) => string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'luxeclub-currency'
const RATES_CACHE_KEY = 'luxeclub-rates'
const RATES_MAX_AGE = 3_600_000 // 1 hour
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const FALLBACK_RATES: Record<Currency, number> = {
  AED: 1,
  USD: 0.27,
  GBP: 0.22,
  EUR: 0.25,
  SAR: 1.02,
  RUB: 24.93,
  CNY: 1.98,
}

const SYMBOLS: Record<Currency, string> = {
  AED: 'AED',
  USD: '$',
  GBP: '\u00A3',
  EUR: '\u20AC',
  SAR: 'SAR',
  RUB: '\u20BD',
  CNY: '\u00A5',
}

// ---------------------------------------------------------------------------
// Rates cache helpers
// ---------------------------------------------------------------------------

function getCachedRates(): Record<Currency, number> | null {
  try {
    const raw = sessionStorage.getItem(RATES_CACHE_KEY)
    if (!raw) return null
    const { rates, ts } = JSON.parse(raw)
    if (Date.now() - ts > RATES_MAX_AGE) return null
    return rates
  } catch {
    return null
  }
}

function setCachedRates(rates: Record<Currency, number>) {
  try {
    sessionStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, ts: Date.now() }))
  } catch {
    // sessionStorage unavailable
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CurrencyProvider({
  children,
  initialCurrency,
}: {
  children: ReactNode
  initialCurrency?: Currency
}) {
  // useState initializer takes initialCurrency from the server (header or
  // geo cookie) so first paint already uses the right symbol — no flash.
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency ?? 'AED')
  const [rates, setRates] = useState<Record<Currency, number>>(() => getCachedRates() ?? FALLBACK_RATES)

  // Read saved preference on mount — localStorage takes precedence over the
  // server-passed initialCurrency since localStorage = user's explicit choice.
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

  // Fetch live rates once on mount — skip if we have fresh cached rates
  useEffect(() => {
    if (getCachedRates()) return // already have fresh rates

    let cancelled = false

    async function fetchRates() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/AED')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data?.rates) return

        const fresh: Record<Currency, number> = {
          AED: 1,
          USD: data.rates.USD ?? FALLBACK_RATES.USD,
          GBP: data.rates.GBP ?? FALLBACK_RATES.GBP,
          EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
          SAR: data.rates.SAR ?? FALLBACK_RATES.SAR,
          RUB: data.rates.RUB ?? FALLBACK_RATES.RUB,
          CNY: data.rates.CNY ?? FALLBACK_RATES.CNY,
        }

        setRates(fresh)
        setCachedRates(fresh)
      } catch {
        // Keep fallback rates
      }
    }

    fetchRates()
    return () => { cancelled = true }
  }, [])

  // Persist preference to both localStorage (long-term client storage) and a
  // cookie (so the server-side middleware sees the choice on next request and
  // won't re-tag with a geo guess).
  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {
      // localStorage unavailable
    }
    try {
      document.cookie = `${STORAGE_KEY}=${c}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
    } catch {
      // document unavailable (SSR — shouldn't happen here, defensive)
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

const SSR_FALLBACK: CurrencyContextValue = {
  currency: 'AED',
  setCurrency: () => {},
  formatPrice: (aedAmount: number) => `AED ${aedAmount.toLocaleString('en-US')}`,
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  return ctx ?? SSR_FALLBACK
}
