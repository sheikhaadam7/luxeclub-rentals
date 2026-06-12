import type { Currency } from './context'

const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  // GBP
  GB: 'GBP',

  // EUR — eurozone proper
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR',
  DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR',
  LU: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR',
  ES: 'EUR', HR: 'EUR',
  // EUR — pragmatic proxy for non-eurozone European countries.
  // We don't carry CHF/SEK/NOK/DKK/PLN/CZK/HUF/RON/BGN. EUR is the
  // closest familiar currency for these visitors. Acceptable trade-off.
  CH: 'EUR', SE: 'EUR', NO: 'EUR', DK: 'EUR', PL: 'EUR', CZ: 'EUR',
  HU: 'EUR', RO: 'EUR', BG: 'EUR',

  // USD-anchored (US + countries where USD is widely understood and
  // we don't carry the native currency)
  US: 'USD', CA: 'USD', AU: 'USD', NZ: 'USD', MX: 'USD',
  SG: 'USD', HK: 'USD', JP: 'USD', KR: 'USD', IN: 'USD',

  // SAR
  SA: 'SAR',
  // RUB region
  RU: 'RUB', BY: 'RUB', KZ: 'RUB',
  // CNY
  CN: 'CNY', TW: 'CNY', MO: 'CNY',
  // GCC stays on AED (home market — no conversion noise)
  AE: 'AED', BH: 'AED', KW: 'AED', OM: 'AED', QA: 'AED',
}

// Vercel sometimes emits these sentinels — treat as undefined.
const GEO_SENTINELS = new Set(['XX', 'T1', ''])

export function currencyForCountry(
  country: string | null | undefined,
): Currency {
  if (!country || GEO_SENTINELS.has(country)) return 'AED'
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? 'USD'
}
