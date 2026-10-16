/**
 * Calendar days, handled as calendar days.
 *
 * A booking date is not an instant. "16 October" is the same 16 October
 * whether you read it in Dubai or New York, and it must survive the whole
 * round trip unchanged:
 *
 *     the day the customer tapped
 *       -> the day stored
 *       -> the day emailed, displayed, blocked and priced
 *
 * Every bug this module exists to kill came from converting that day
 * through UTC at one end and not the other. A Dubai customer picked the
 * 16th, `toISOString()` read the UTC day off a local-midnight Date, and
 * the booking was stored -- and emailed -- as the 15th.
 *
 * The rule: the stored `YYYY-MM-DD` string is the source of truth, and
 * conversions to and from it are SYMMETRIC.
 *
 * No timezone library. The UAE observes no daylight saving, so the
 * business offset is a fixed +04:00 and the arithmetic below is exact
 * rather than approximate.
 */

/** IANA zone the business runs on. Owner ruling: the business day is Dubai. */
export const BUSINESS_TIMEZONE = 'Asia/Dubai'

/** Fixed UTC offset for the business. The UAE has never observed DST. */
const BUSINESS_UTC_OFFSET = '+04:00'

/** A calendar day, as stored: 'YYYY-MM-DD'. */
export type DateKey = string

/**
 * A Date -> the calendar day it represents **where the reader is standing**.
 *
 * 🔴 Client-side only. On the server this reads the UTC day, which is the
 * original bug: Vercel runs UTC, so a Date the browser created at local
 * midnight on the 16th arrives as `2026-10-15T20:00:00Z` and this would
 * answer "2026-10-15". The browser must call this and send the result.
 */
export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * A stored day -> a LOCAL-midnight Date.
 *
 * For calendars. react-day-picker builds its day cells at local midnight
 * and compares instants, so a blocked range has to be expressed the same
 * way or the first day of the range fails to grey out.
 *
 * 🔴 Client-side only, for the same reason as `toDateKey`. Calling this in
 * a server component yields UTC midnight and quietly achieves nothing.
 */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Does this look like a stored calendar day? Used to validate client input. */
export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * A stored day -> the text a human reads.
 *
 * Parsed and rendered in the same frame (UTC in, UTC out), so it echoes
 * the stored day faithfully for every viewer, in every timezone. This is
 * not new behaviour -- it is the pattern that was already correct and
 * duplicated byte-for-byte across six files, including the confirmation
 * email. One copy now.
 */
export function formatDateKey(
  key: DateKey,
  locale: string = 'en-GB',
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString(locale, {
    ...options,
    timeZone: 'UTC',
  })
}

/** Both ends of a booking, formatted. */
export function formatDateKeyRange(start: DateKey, end: DateKey, locale?: string): string {
  return `${formatDateKey(start, locale)} — ${formatDateKey(end, locale)}`
}

/**
 * Today, as the business reckons it.
 *
 * `en-CA` is the shortcut: it formats as `YYYY-MM-DD` natively, so there
 * is no parsing or padding to get wrong. Used instead of
 * `new Date().toISOString().split('T')[0]`, which answered UTC and left
 * the admin dashboard showing yesterday between midnight and 4am Dubai.
 */
export function businessTodayKey(now: Date = new Date()): DateKey {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE }).format(now)
}

/**
 * The real moment a pickup happens.
 *
 * `start_time` is a Dubai wall clock -- "10:00" means ten in the morning
 * in Dubai. Every consumer used to apply it with `setUTCHours`, turning
 * 10:00 Dubai into 14:00 Dubai, so the 24-hour cancellation window sat
 * four hours late and refunded AED 450 it should have retained.
 *
 * Safe as a fixed offset precisely because the UAE has no DST; the same
 * line for a country that switches clocks would need a real timezone
 * library.
 */
export function pickupInstant(key: DateKey, time: string | null): Date {
  // Stored times are 'HH:MM' or 'HH:MM:SS'; default matches the old behaviour.
  const [h = '10', min = '00'] = (time || '10:00').split(':')
  return new Date(
    `${key}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:00${BUSINESS_UTC_OFFSET}`
  )
}

/** Hours from now until the pickup moment. Negative once it has passed. */
export function hoursUntilPickup(key: DateKey, time: string | null, now: Date = new Date()): number {
  return (pickupInstant(key, time).getTime() - now.getTime()) / (1000 * 60 * 60)
}
