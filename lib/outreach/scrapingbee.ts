/**
 * ScrapingBee API client.
 * Free tier: 1,000 API calls / month.
 * Docs: https://www.scrapingbee.com/documentation/
 */

import 'server-only'

export interface ScrapingBeeOptions {
  /** Use a headless browser (required for JS-rendered sites). Costs 10 credits instead of 1. */
  renderJs?: boolean
  /** Geo-bias for location-restricted content. */
  countryCode?: string
}

export class ScrapingBeeError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ScrapingBeeError'
  }
}

/**
 * Fetch a page via ScrapingBee.
 * Returns the HTML string. Throws ScrapingBeeError on failure.
 *
 * Default is render_js=false (1 credit). Set renderJs=true for SPA sites
 * like React/Angular outlets where articles only load via JS (10 credits).
 */
export async function fetchPage(
  url: string,
  opts: ScrapingBeeOptions = {}
): Promise<string> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY
  if (!apiKey) throw new ScrapingBeeError(500, 'SCRAPINGBEE_API_KEY not configured')

  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: opts.renderJs ? 'true' : 'false',
  })
  if (opts.countryCode) params.set('country_code', opts.countryCode)

  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`, {
    method: 'GET',
  })

  if (!res.ok) {
    let errMsg = `ScrapingBee error ${res.status}`
    try {
      const body = await res.text()
      if (body) errMsg += `: ${body.slice(0, 200)}`
    } catch { /* ignore */ }
    throw new ScrapingBeeError(res.status, errMsg)
  }

  return await res.text()
}

/**
 * Generate plausible URL-slug variants for a person's name. Covers:
 *   - hyphen / dot / underscore / concat
 *   - both with and without middle portion (if supplied as part of firstName)
 *   - all lowercased, stripped of punctuation, unicode-collapsed
 */
function nameSlugs(firstName: string, lastName: string): string[] {
  function normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/['’`]/g, '')                            // O'Brien → obrien
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const firstTokens = normalize(firstName).split(' ').filter(Boolean)
  const lastTokens = normalize(lastName).split(' ').filter(Boolean)
  if (firstTokens.length === 0 || lastTokens.length === 0) return []

  const fn = firstTokens[0]
  const ln = lastTokens[lastTokens.length - 1]
  const middle = firstTokens.slice(1).concat(lastTokens.slice(0, -1))

  const slugs = new Set<string>()
  const addVariants = (parts: string[]) => {
    if (parts.length < 2) return
    slugs.add(parts.join('-'))
    slugs.add(parts.join('.'))
    slugs.add(parts.join('_'))
    slugs.add(parts.join(''))
  }
  addVariants([fn, ln])
  if (middle.length > 0) {
    addVariants([fn, ...middle, ln])
    // middle initials only: "Laura A Redman" → laura-a-redman
    addVariants([fn, ...middle.map((m) => m[0]), ln])
  }
  return [...slugs].filter((s) => s.length > 2)
}

const AUTHOR_PATH_PREFIXES = [
  'authors', 'author', 'contributors', 'contributor',
  'writers', 'writer', 'journalists', 'journalist',
  'profiles', 'profile', 'team', 'staff', 'by',
]

/**
 * Attempt to find an editor's author page URL via:
 *   1. Serper search with broad slug regex
 *   2. Direct URL construction across common path prefixes + slug variants
 *      (fallback when Serper's top hit isn't an author page)
 * Returns null if no bio page found or if all fetches fail.
 */
export async function findAndFetchEditorBioPage(
  firstName: string,
  lastName: string,
  domain: string,
  serperSearch: (q: string) => Promise<{ link: string; title: string }[]>
): Promise<{ url: string; html: string } | null> {
  // --- Attempt 1: Serper search ---------------------------------------------
  const query = `"${firstName} ${lastName}" site:${domain} (author OR contributor OR about OR bio OR team OR writer OR journalist)`
  const results = await serperSearch(query)

  const serperCandidate = results.find((r) => {
    const l = r.link.toLowerCase()
    return /\/(authors?|contributors?|writers?|journalists?|profiles?|about|team|staff|by)\//.test(l)
  })

  if (serperCandidate) {
    try {
      const html = await fetchPage(serperCandidate.link, { renderJs: false })
      return { url: serperCandidate.link, html }
    } catch { /* fall through */ }
  }

  // --- Attempt 2: direct URL guessing (capped to avoid burning credits) ----
  // Try the most common prefix × slug combos only. Stop after
  // MAX_DIRECT_GUESSES attempts or as soon as one succeeds.
  const MAX_DIRECT_GUESSES = 6
  const slugs = nameSlugs(firstName, lastName)
  const baseDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const topPrefixes = ['authors', 'author', 'contributors', 'contributor', 'writers', 'writer']
  let tries = 0
  outer: for (const prefix of topPrefixes) {
    for (const slug of slugs) {
      if (tries++ >= MAX_DIRECT_GUESSES) break outer
      const url = `https://${baseDomain}/${prefix}/${slug}`
      try {
        const html = await fetchPage(url, { renderJs: false })
        const lowered = html.toLowerCase()
        if (
          lowered.includes(firstName.toLowerCase()) &&
          lowered.includes(lastName.toLowerCase())
        ) {
          return { url, html }
        }
      } catch { /* most guesses 404; continue */ }
    }
  }

  // --- Attempt 3: first Serper result anyway (last resort) ------------------
  const fallback = results[0]
  if (!fallback) return null
  try {
    const html = await fetchPage(fallback.link, { renderJs: false })
    return { url: fallback.link, html }
  } catch {
    return null
  }
}
