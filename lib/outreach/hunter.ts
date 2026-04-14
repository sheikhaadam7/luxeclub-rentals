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

export async function fetchDomainEmails(domain: string): Promise<HunterDomainResponse> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) throw new HunterApiError(500, 'HUNTER_API_KEY not configured')

  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${apiKey}`
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
