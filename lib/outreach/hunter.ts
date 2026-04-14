/**
 * Hunter.io Domain Search API client.
 * Free tier: 25 domain searches / month. Each search returns up to 10 emails.
 * Docs: https://hunter.io/api-documentation/v2#domain-search
 */

import 'server-only'

export interface HunterEmail {
  value: string
  type: 'personal' | 'generic'
  confidence: number
  first_name: string | null
  last_name: string | null
  position: string | null
  seniority: 'executive' | 'senior' | 'junior' | null
  department: string | null
  linkedin: string | null
  twitter: string | null
  verification?: { status?: string; date?: string }
}

export interface HunterDomainResponse {
  data: {
    domain: string
    organization: string | null
    disposable: boolean
    webmail: boolean
    emails: HunterEmail[]
  }
  meta: {
    results: number
    limit: number
    offset: number
  }
}

export class HunterApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'HunterApiError'
  }
}

// Hunter Starter plan: up to 100 results per domain-search. We paginate up to
// MAX_PAGES times so even large outlets (500+ staff) don't get truncated.
// Each page counts as 1 search against the 500/mo quota.
const PAGE_SIZE = 100
const MAX_PAGES = 5

async function fetchDomainEmailsPage(
  domain: string,
  apiKey: string,
  offset: number
): Promise<HunterDomainResponse> {
  const url =
    `https://api.hunter.io/v2/domain-search` +
    `?domain=${encodeURIComponent(domain)}` +
    `&type=personal` +
    `&limit=${PAGE_SIZE}` +
    `&offset=${offset}` +
    `&api_key=${apiKey}`

  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) {
    let errMsg = `Hunter API error ${res.status}`
    try {
      const body = await res.json()
      if (body?.errors?.[0]?.details) errMsg += `: ${body.errors[0].details}`
    } catch { /* ignore */ }
    throw new HunterApiError(res.status, errMsg)
  }
  return await res.json() as HunterDomainResponse
}

export async function fetchDomainEmails(domain: string): Promise<HunterDomainResponse> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) throw new HunterApiError(500, 'HUNTER_API_KEY not configured')

  const first = await fetchDomainEmailsPage(domain, apiKey, 0)
  const totalResults = first.meta?.results ?? first.data.emails.length
  if (totalResults <= PAGE_SIZE) return first

  const all: HunterEmail[] = [...first.data.emails]
  for (let page = 1; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE
    if (offset >= totalResults) break
    try {
      const next = await fetchDomainEmailsPage(domain, apiKey, offset)
      if (next.data.emails.length === 0) break
      all.push(...next.data.emails)
    } catch (err) {
      console.error(`[hunter] pagination stopped at offset ${offset} for ${domain}:`, err instanceof Error ? err.message : err)
      break
    }
  }

  return {
    ...first,
    data: { ...first.data, emails: all },
    meta: { ...first.meta, limit: all.length, offset: 0 },
  }
}
