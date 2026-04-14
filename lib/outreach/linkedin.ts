/**
 * LinkedIn public profile title scraper.
 *
 * Uses ScrapingBee with premium_proxy + JS render to bypass LinkedIn's
 * anti-scraping. Only extracts the public-facing headline / title from
 * <og:title> or <title> tags — we do not attempt to parse the full profile.
 *
 * Expected og:title format: "First Last - Current Headline | LinkedIn"
 * We strip the name and the " | LinkedIn" suffix.
 *
 * Cost: ~25 ScrapingBee credits per call (premium_proxy + render_js).
 * Success rate varies (~60-80%); failures return null and are logged.
 */

import 'server-only'

export class LinkedInScrapeError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'LinkedInScrapeError'
  }
}

function decode(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function extractTitle(html: string, firstName: string | null, lastName: string | null): string | null {
  // Prefer og:title which LinkedIn sets to "Name - Headline | LinkedIn"
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)

  let raw: string | null = null
  if (og) raw = decode(og[1])

  if (!raw) {
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (title) raw = decode(title[1])
  }

  if (!raw) return null

  // Strip " | LinkedIn" (and locale variants)
  raw = raw.replace(/\s*[|·•]\s*LinkedIn.*$/i, '')

  // Strip the person's name prefix if present: "Jane Doe - ..."
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  if (fullName) {
    const namePattern = new RegExp(`^${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—:]\\s*`, 'i')
    raw = raw.replace(namePattern, '')
  }

  raw = raw.trim()
  if (raw.length < 3 || raw.length > 300) return null
  return raw
}

export async function scrapeLinkedInTitle(
  linkedinUrl: string,
  firstName: string | null,
  lastName: string | null
): Promise<string | null> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY
  if (!apiKey) throw new LinkedInScrapeError('SCRAPINGBEE_API_KEY not configured')

  const params = new URLSearchParams({
    api_key: apiKey,
    url: linkedinUrl,
    render_js: 'true',
    premium_proxy: 'true',
    // Tell ScrapingBee to wait for the profile headline to render
    wait: '2500',
  })

  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new LinkedInScrapeError(
      `ScrapingBee LinkedIn fetch failed: ${res.status} ${body.slice(0, 180)}`,
      res.status
    )
  }
  const html = await res.text()
  return extractTitle(html, firstName, lastName)
}
