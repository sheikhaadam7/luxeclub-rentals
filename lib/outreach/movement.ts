/**
 * Outlet movement detection.
 *
 * Per outlet, fetch the author/sitemap index and diff against our recorded
 * editors to detect:
 *   - NEW bylines — author not in DB yet
 *   - WENT_QUIET — known editor with no fresh byline in 60+ days
 *   - RETURNED — previously-quiet editor now publishing again
 *
 * This is a generic implementation using Serper + the outlet's sitemap. Per-
 * outlet adapters can be added later; the fallback covers the common case.
 */

import 'server-only'
import { fetchPage } from './scrapingbee'

const QUIET_DAYS = 60

export interface ByLineCandidate {
  firstName: string
  lastName: string
  sourceUrl: string
}

/**
 * Parse likely bylines from an HTML blob (recent articles list, sitemap, or
 * author index). We look for:
 *   - <meta name="author" content="First Last">
 *   - "By First Last" text patterns
 *   - rel="author" anchor text
 * Returns a deduped set of plausible names.
 */
export function extractBylinesFromHtml(html: string, sourceUrl: string): ByLineCandidate[] {
  const seen = new Set<string>()
  const out: ByLineCandidate[] = []

  const patterns: RegExp[] = [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/gi,
    /\bBy\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/g,
    /<a[^>]+rel=["']author["'][^>]*>([^<]+)<\/a>/gi,
  ]

  for (const rx of patterns) {
    let m
    while ((m = rx.exec(html)) !== null) {
      const raw = m[1]?.trim()
      if (!raw) continue
      const parts = raw.split(/\s+/).filter(Boolean)
      if (parts.length < 2) continue
      const first = parts[0]
      const last = parts[parts.length - 1]
      // Guard against obvious non-names (dates, numbers, common words)
      if (!/^[A-Z]/.test(first) || !/^[A-Z]/.test(last)) continue
      if (/\d/.test(first) || /\d/.test(last)) continue
      const key = `${first.toLowerCase()} ${last.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ firstName: first, lastName: last, sourceUrl })
    }
  }

  return out
}

/**
 * Try a few canonical URLs that most outlets expose to list recent content
 * or author indexes. Returns the first HTML blob we can fetch.
 */
export async function fetchOutletIndex(domain: string): Promise<{ url: string; html: string } | null> {
  const candidates = [
    `https://${domain}/`,
    `https://${domain}/latest/`,
    `https://${domain}/news/`,
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_news.xml`,
    `https://${domain}/feed/`,
  ]
  for (const url of candidates) {
    try {
      const html = await fetchPage(url, { renderJs: false })
      if (html && html.length > 500) return { url, html }
    } catch {
      // try next
    }
  }
  return null
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000))
}

export function isQuiet(lastSeenAt: Date | null): boolean {
  if (!lastSeenAt) return false
  return daysBetween(lastSeenAt, new Date()) >= QUIET_DAYS
}
