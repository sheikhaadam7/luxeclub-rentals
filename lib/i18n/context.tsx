'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'

// English is always bundled (fallback); other locales loaded on demand
import en from './locales/en'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Language = 'en' | 'ar' | 'fr' | 'ru' | 'zh' | 'de' | 'nl' | 'es'

interface LanguageContextValue {
  language: Language
  setLanguage: (l: Language) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'luxeclub-language'

export const LANGUAGES: { code: Language; label: string; country: string }[] = [
  { code: 'en', label: 'English', country: 'gb' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', country: 'sa' },
  { code: 'fr', label: 'Fran\u00E7ais', country: 'fr' },
  { code: 'ru', label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', country: 'ru' },
  { code: 'zh', label: '\u4E2D\u6587', country: 'cn' },
  { code: 'de', label: 'Deutsch', country: 'de' },
  { code: 'nl', label: 'Nederlands', country: 'nl' },
  { code: 'es', label: 'Espa\u00F1ol', country: 'es' },
]

/** Returns the flag image URL for a country code */
export function flagUrl(country: string, size: 'w20' | 'w40' | 'w80' = 'w40') {
  return `https://flagcdn.com/${size}/${country}.png`
}

const VALID_LANGUAGES = new Set<string>(LANGUAGES.map((l) => l.code))

// ---------------------------------------------------------------------------
// Lazy locale loader — only imports the dictionary when needed
// ---------------------------------------------------------------------------

const localeCache = new Map<Language, Record<string, string>>()
localeCache.set('en', en)

async function loadLocale(lang: Language): Promise<Record<string, string>> {
  const cached = localeCache.get(lang)
  if (cached) return cached

  let dict: Record<string, string>
  switch (lang) {
    case 'ar': dict = (await import('./locales/ar')).default; break
    case 'fr': dict = (await import('./locales/fr')).default; break
    case 'ru': dict = (await import('./locales/ru')).default; break
    case 'zh': dict = (await import('./locales/zh')).default; break
    case 'de': dict = (await import('./locales/de')).default; break
    case 'nl': dict = (await import('./locales/nl')).default; break
    case 'es': dict = (await import('./locales/es')).default; break
    default: dict = en
  }

  localeCache.set(lang, dict)
  return dict
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const LanguageContext = createContext<LanguageContextValue | null>(null)

// Internal context for the loaded dictionary (avoids prop drilling)
const DictionaryContext = createContext<Record<string, string>>(en)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [dict, setDict] = useState<Record<string, string>>(en)

  // Read saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && VALID_LANGUAGES.has(saved)) {
        setLanguageState(saved as Language)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  // Load dictionary when language changes
  useEffect(() => {
    let cancelled = false
    loadLocale(language).then((d) => {
      if (!cancelled) setDict(d)
    })
    return () => { cancelled = true }
  }, [language])

  // Set document lang + dir when language changes
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  // Persist preference
  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // localStorage unavailable
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <DictionaryContext.Provider value={dict}>
        {children}
      </DictionaryContext.Provider>
    </LanguageContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function useTranslation() {
  const dict = useContext(DictionaryContext)

  const t = useMemo(() => {
    return (key: string): string => dict[key] ?? en[key] ?? key
  }, [dict])

  return { t }
}
