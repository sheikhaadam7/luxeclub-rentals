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

interface AhrefsMetricsResponse {
  metrics?: {
    org_traffic?: number
    organic_traffic?: number
  }
}

async function fetchMetricsForMode(domain: string, mode: 'subdomains' | 'domain'): Promise<number | null> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const data = await ahrefsGet<AhrefsMetricsResponse>('/site-explorer/metrics', {
      target: domain,
      date: today,
      mode,
      protocol: 'both',
      volume_mode: 'monthly',
    })
    const t = data?.metrics?.org_traffic ?? data?.metrics?.organic_traffic
    if (typeof t === 'number') return Math.round(t)
    console.warn(`[ahrefs] ${domain} mode=${mode} returned no org_traffic. Raw:`, JSON.stringify(data).slice(0, 300))
    return null
  } catch (err) {
    console.error(`[ahrefs] metrics fetch failed for ${domain} mode=${mode}:`, err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Fetch DR + monthly organic traffic for a domain.
 * For traffic we try mode=subdomains first (captures style.rbc.ru, blogs.*, etc.)
 * and fall back to mode=domain. Returns nulls on persistent failure so the
 * refresh job keeps going on partial failures.
 */
export async function fetchDomainMetrics(domain: string): Promise<DomainMetrics> {
  const today = new Date().toISOString().slice(0, 10)

  const drData = await ahrefsGet<{ domain_rating?: { domain_rating?: number } }>(
    '/site-explorer/domain-rating',
    { target: domain, date: today, protocol: 'both' }
  ).catch((err) => {
    console.error(`[ahrefs] DR fetch failed for ${domain}:`, err.message)
    return null
  })

  let traffic = await fetchMetricsForMode(domain, 'subdomains')
  if (traffic == null || traffic === 0) {
    const fallback = await fetchMetricsForMode(domain, 'domain')
    if (fallback != null && fallback > 0) traffic = fallback
  }

  const dr = drData?.domain_rating?.domain_rating

  return {
    dr: typeof dr === 'number' ? Math.round(dr) : null,
    monthlyTraffic: traffic,
  }
}
