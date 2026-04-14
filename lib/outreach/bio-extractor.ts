/**
 * Extract a likely bio paragraph from an author/about page HTML.
 *
 * Uses heuristics in priority order:
 *   1. JSON-LD Person schema with description
 *   2. <meta name="description"> / og:description
 *   3. First paragraph inside author-page-like containers
 *   4. Fall back to first substantial paragraph in the body
 */

import 'server-only'

function decode(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

export function extractBio(html: string): string | null {
  // 1. JSON-LD Person schema with description
  const jsonLdMatches = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of candidates) {
        if (item && typeof item === 'object') {
          const type = item['@type']
          const isPerson = type === 'Person' || (Array.isArray(type) && type.includes('Person'))
          if (isPerson && typeof item.description === 'string' && item.description.length > 40) {
            return decode(item.description)
          }
        }
      }
    } catch { /* ignore malformed JSON-LD */ }
  }

  // 2. Meta description / og:description
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
  if (metaMatch) {
    const desc = decode(metaMatch[1])
    if (desc.length > 40 && desc.length < 600) return desc
  }

  // 3. First paragraph inside an author-ish container — only if it LOOKS
  //    like a bio (first/third person self-description, not an article lede).
  const containerRegex = /<(div|section|article)[^>]+(?:class|id)=["'][^"']*(?:author|bio|profile|about|contributor)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i
  const containerMatch = html.match(containerRegex)
  if (containerMatch) {
    const inner = containerMatch[2]
    const pMatches = Array.from(inner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    for (const pMatch of pMatches) {
      const text = decode(stripTags(pMatch[1]))
      if (looksLikeBio(text)) return text.slice(0, 500)
    }
  }

  // No reliable bio found. Returning null is better than guessing —
  // the old fallback often grabbed the lede of the author's latest article.
  return null
}

/**
 * Heuristic: does this paragraph read like a short professional bio,
 * or like the opening of a news article? Bios describe a person;
 * article ledes describe an event, product, or place.
 */
function looksLikeBio(text: string): boolean {
  if (text.length < 40 || text.length > 1000) return false
  if (/cookie|privacy|subscribe|newsletter/i.test(text)) return false

  // Strong bio signals: self-description phrasing
  const bioPhrases = [
    /\b(is|was)\s+(a|an|the)\s+(senior|staff|contributing|freelance|former|award[- ]winning|deputy|managing|assistant)?\s*(editor|journalist|writer|reporter|correspondent|columnist|contributor|producer|author)\b/i,
    /\b(writes|covers|reports|edits|contributes|specializes|focuses)\s+(on|for|about)\b/i,
    /\bjoined\s+[A-Z]/, // "joined Vogue in 2019"
    /\b(years? of experience|based in|lives in)\b/i,
    /\bholds? (a|an)\s+(BA|MA|degree|PhD)\b/i,
  ]
  if (bioPhrases.some((r) => r.test(text))) return true

  // Reject article-lede patterns (proper-noun-heavy, event-driven)
  // Article ledes often start with a brand/place/event, not a person descriptor.
  if (/^(In|On|At|After|When|While|The|A|An)\s+[A-Z]/.test(text) && !/\b(editor|journalist|writer|reporter)\b/i.test(text)) {
    return false
  }

  return false
}
