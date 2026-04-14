/**
 * Ahrefs API v3 client.
 * Pulls Domain Rating (DR) and organic traffic for a given domain.
 * Docs: https://docs.ahrefs.com/docs/api/reference/site-explorer
 *
 * We only use two endpoints:
 *   - /v3/site-explorer/domain-rating (current DR)
 *   - /v3/site-explorer/metrics (live organic traffic)
 */

import 'server-only'

const BASE_URL = 'https://api.ahrefs.com/v3'

export class AhrefsApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'AhrefsApiError'
  }
}

function getToken(): string {
  const token = process.env.AHREFS_API_TOKEN
  if (!token) throw new AhrefsApiError('AHREFS_API_TOKEN not set in environment')
  return token
}

async function ahrefsGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const url = `${BASE_URL}${path}?${qs}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new AhrefsApiError(
      `Ahrefs ${path} failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
      res.status
    )
  }
  return res.json() as Promise<T>
}

export interface DomainMetrics {
  dr: number | null
  monthlyTraffic: number | null
}

/**
 * Fetch DR + monthly organic traffic for a domain.
 * Returns nulls for any field the API omits rather than throwing so the
 * refresh job keeps going on partial failures.
 */
export async function fetchDomainMetrics(domain: string): Promise<DomainMetrics> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const [drData, metricsData] = await Promise.all([
    ahrefsGet<{ domain_rating?: { domain_rating?: number } }>(
      '/site-explorer/domain-rating',
      { target: domain, date: today, protocol: 'both' }
    ).catch((err) => {
      console.error(`[ahrefs] DR fetch failed for ${domain}:`, err.message)
      return null
    }),
    ahrefsGet<{ metrics?: { org_traffic?: number } }>(
      '/site-explorer/metrics',
      { target: domain, date: today, mode: 'domain', protocol: 'both', volume_mode: 'monthly' }
    ).catch((err) => {
      console.error(`[ahrefs] metrics fetch failed for ${domain}:`, err.message)
      return null
    }),
  ])

  const dr = drData?.domain_rating?.domain_rating
  const traffic = metricsData?.metrics?.org_traffic

  return {
    dr: typeof dr === 'number' ? Math.round(dr) : null,
    monthlyTraffic: typeof traffic === 'number' ? Math.round(traffic) : null,
  }
}
