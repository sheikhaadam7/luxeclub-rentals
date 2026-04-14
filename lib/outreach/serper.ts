/**
 * Serper.dev API client.
 * Free tier: 2,500 credits on signup, then 100/month.
 * Docs: https://serper.dev/api-key
 */

import 'server-only'

export interface SerperOrganicResult {
  title: string
  link: string
  snippet?: string
  date?: string
  position?: number
}

export interface SerperSearchResponse {
  organic?: SerperOrganicResult[]
  peopleAlsoAsk?: unknown
  relatedSearches?: unknown
  searchParameters?: unknown
}

export class SerperApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'SerperApiError'
  }
}

/**
 * Query Google for articles by a given editor on a given outlet domain.
 * Uses exact-name phrase + site: operator for precision.
 */
export async function searchEditorArticles(
  firstName: string,
  lastName: string,
  domain: string
): Promise<SerperOrganicResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new SerperApiError(500, 'SERPER_API_KEY not configured')

  const query = `"${firstName} ${lastName}" site:${domain}`

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 10, gl: 'ae', hl: 'en' }),
  })

  if (!res.ok) {
    let errMsg = `Serper API error ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) errMsg += `: ${body.message}`
    } catch { /* ignore */ }
    throw new SerperApiError(res.status, errMsg)
  }

  const data = await res.json() as SerperSearchResponse
  return data.organic ?? []
}

/**
 * Parse a Serper date field ("Mar 15, 2026", "2 days ago", etc) to ISO date string.
 * Returns null if unparseable.
 */
export function parseSerperDate(date: string | undefined): string | null {
  if (!date) return null
  // Absolute format: "Mar 15, 2026"
  const parsed = new Date(date)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return null
}
