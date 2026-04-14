/**
 * Wider-web bio enrichment.
 *
 * Looks for the editor's bio on sources outside their current outlet:
 *   - Muckrack (muckrack.com/jane-doe) — the de-facto journalist portfolio
 *   - Contently (contently.com/janedoe)
 *   - Journoportfolio (journoportfolio.com/janedoe)
 *   - About.me / personal websites (janedoe.com, janedoe.substack.com)
 *
 * Strategy: one Serper search without the `site:` restriction, pick the
 * highest-ranked result on a known portfolio host or personal domain,
 * fetch via ScrapingBee, extract bio with the same heuristics used for
 * outlet author pages.
 */

import 'server-only'
import { fetchPage } from './scrapingbee'
import { extractBio } from './bio-extractor'

export interface ExternalBioResult {
  text: string
  url: string
  source: string
}

const PORTFOLIO_HOSTS: { host: string; label: string }[] = [
  { host: 'muckrack.com', label: 'muckrack' },
  { host: 'contently.com', label: 'contently' },
  { host: 'journoportfolio.com', label: 'journoportfolio' },
  { host: 'about.me', label: 'about.me' },
  { host: 'linktr.ee', label: 'linktree' },
  { host: 'medium.com', label: 'medium' },
  { host: 'substack.com', label: 'substack' },
]

/**
 * Pick the best result for the editor's external bio. Ranking:
 *   1. Known portfolio host (muckrack > contently > journoportfolio > about.me)
 *   2. Personal-looking domain (firstname or lastname in hostname, not a news outlet)
 *   3. First result, if nothing else matches
 */
function pickCandidate(
  results: { link: string; title: string }[],
  firstName: string,
  lastName: string,
  excludeDomain: string
): { link: string; title: string; source: string } | null {
  const first = firstName.toLowerCase()
  const last = lastName.toLowerCase()

  // 1. Portfolio hosts, ordered by preference
  for (const { host, label } of PORTFOLIO_HOSTS) {
    const hit = results.find((r) => r.link.toLowerCase().includes(host))
    if (hit) return { ...hit, source: label }
  }

  // 2. Personal-looking domain
  const personal = results.find((r) => {
    try {
      const url = new URL(r.link)
      const host = url.hostname.toLowerCase()
      if (host.includes(excludeDomain.toLowerCase())) return false
      return host.includes(first) || host.includes(last)
    } catch { return false }
  })
  if (personal) return { ...personal, source: 'personal-site' }

  return null
}

export async function findExternalBio(
  firstName: string,
  lastName: string,
  excludeDomain: string,
  serperSearch: (q: string) => Promise<{ link: string; title: string }[]>
): Promise<ExternalBioResult | null> {
  const query = `"${firstName} ${lastName}" (journalist OR editor OR writer OR bio) -site:${excludeDomain}`
  const results = await serperSearch(query)

  const candidate = pickCandidate(results, firstName, lastName, excludeDomain)
  if (!candidate) return null

  try {
    const html = await fetchPage(candidate.link, { renderJs: false })
    const text = extractBio(html)
    if (!text) return null
    return { text, url: candidate.link, source: candidate.source }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Twitter / X bio
// ---------------------------------------------------------------------------

/**
 * Extract the bio from a Twitter/X profile page. The meta description of
 * a public X profile is typically "Full Name (@handle) · Bio · Location".
 */
function extractTwitterBio(html: string, handle: string): string | null {
  const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
  if (!metaDescription) return null
  let raw = metaDescription[1]
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
  // Strip leading "@handle" or "Full Name (@handle)" if present
  raw = raw.replace(new RegExp(`^[^·|:-]*\\(@${handle}\\)\\s*[·|:-]\\s*`, 'i'), '')
  raw = raw.replace(new RegExp(`^@${handle}\\s*[·|:-]\\s*`, 'i'), '')
  raw = raw.trim()
  if (raw.length < 3 || raw.length > 500) return null
  return raw
}

export async function scrapeTwitterBio(handle: string): Promise<string | null> {
  const clean = handle.replace(/^@/, '')
  if (!clean) return null
  // X (Twitter) requires JS render + often premium proxy; try render_js first.
  try {
    const html = await fetchPage(`https://x.com/${clean}`, { renderJs: true })
    return extractTwitterBio(html, clean)
  } catch {
    return null
  }
}
