/**
 * Hunter.io Email Finder.
 * Separate credit pool from domain-search. Given domain + first/last name,
 * returns the most likely email (with confidence). Used by the movement
 * scanner when we detect a new byline and need to resolve it to an email.
 *
 * Docs: https://hunter.io/api-documentation/v2#email-finder
 */

import 'server-only'
import { HunterApiError } from './hunter'

export interface EmailFinderResult {
  email: string | null
  score: number | null  // 0-100, Hunter's deliverability confidence
  first_name: string | null
  last_name: string | null
  position: string | null
  linkedin_url: string | null
  twitter_handle: string | null
}

export async function findEmail(
  domain: string,
  firstName: string,
  lastName: string
): Promise<EmailFinderResult> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) throw new HunterApiError(500, 'HUNTER_API_KEY not configured')

  const url =
    `https://api.hunter.io/v2/email-finder` +
    `?domain=${encodeURIComponent(domain)}` +
    `&first_name=${encodeURIComponent(firstName)}` +
    `&last_name=${encodeURIComponent(lastName)}` +
    `&api_key=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) {
    let errMsg = `Hunter email-finder error ${res.status}`
    try {
      const body = await res.json()
      if (body?.errors?.[0]?.details) errMsg += `: ${body.errors[0].details}`
    } catch { /* ignore */ }
    throw new HunterApiError(res.status, errMsg)
  }

  const body = await res.json()
  const data = body?.data ?? {}
  return {
    email: typeof data.email === 'string' ? data.email : null,
    score: typeof data.score === 'number' ? data.score : null,
    first_name: data.first_name ?? null,
    last_name: data.last_name ?? null,
    position: data.position ?? null,
    linkedin_url: data.linkedin_url ?? null,
    twitter_handle: data.twitter ?? null,
  }
}
