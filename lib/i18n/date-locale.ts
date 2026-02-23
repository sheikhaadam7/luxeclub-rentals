import type { Locale } from 'date-fns'
import type { Language } from './context'
import { arSA, fr, ru, zhCN, de, nl, es } from 'date-fns/locale'

const DATE_LOCALES: Partial<Record<Language, Locale>> = {
  ar: arSA,
  fr,
  ru,
  zh: zhCN,
  de,
  nl,
  es,
}

/** Returns a date-fns Locale for the given language, or undefined for English (default). */
export function getDateLocale(lang: Language): Locale | undefined {
  return DATE_LOCALES[lang]
}

/** BCP 47 locale tags for Intl / toLocaleDateString */
const BCP47: Record<Language, string> = {
  en: 'en-GB',
  ar: 'ar-SA',
  fr: 'fr-FR',
  ru: 'ru-RU',
  zh: 'zh-CN',
  de: 'de-DE',
  nl: 'nl-NL',
  es: 'es-ES',
}

export function getBcp47Locale(lang: Language): string {
  return BCP47[lang]
}
