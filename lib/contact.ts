/**
 * Single source of truth for LuxeClub Rentals contact numbers.
 *
 * The site has two numbers with different purposes:
 * - WhatsApp (messages only)  → wa.me deep-links with prefilled text
 * - Call (voice line)         → tel: links, JSON-LD `telephone` field
 *
 * Never hard-code either number elsewhere in the codebase — import from here.
 */

export const PHONE_WHATSAPP_DISPLAY = '+971 58 808 6137'
/** Digits only, no leading +, for wa.me/{digits} URLs. */
export const PHONE_WHATSAPP_E164 = '971588086137'

export const PHONE_CALL_DISPLAY = '+971 50 610 1375'
/** Full E.164 with +, for tel: hrefs and schema.org `telephone`. */
export const PHONE_CALL_E164 = '+971506101375'

/** Bare wa.me base — append `?text=<encoded>` for prefilled messages. */
export const WHATSAPP_BASE_URL = `https://wa.me/${PHONE_WHATSAPP_E164}`

/** Helper for wa.me URLs with an optional prefilled message. */
export function whatsappUrl(prefillMessage?: string): string {
  if (!prefillMessage) return WHATSAPP_BASE_URL
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(prefillMessage)}`
}
