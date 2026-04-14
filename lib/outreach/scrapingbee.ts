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
 * Attempt to find an editor's author page URL via Serper, then fetch it.
 * Returns null if no bio page found or if fetch fails.
 */
export async function findAndFetchEditorBioPage(
  firstName: string,
  lastName: string,
  domain: string,
  serperSearch: (q: string) => Promise<{ link: string; title: string }[]>
): Promise<{ url: string; html: string } | null> {
  // Search Google for author/bio pages
  const query = `"${firstName} ${lastName}" site:${domain} (author OR contributor OR about OR bio OR team)`
  const results = await serperSearch(query)

  // Pick the first result that looks like an author page
  const candidate = results.find((r) => {
    const l = r.link.toLowerCase()
    return /\/author\/|\/contributors?\/|\/about\/|\/team\/|\/staff\//.test(l)
  }) ?? results[0]

  if (!candidate) return null

  try {
    const html = await fetchPage(candidate.link, { renderJs: false })
    return { url: candidate.link, html }
  } catch {
    return null
  }
}
