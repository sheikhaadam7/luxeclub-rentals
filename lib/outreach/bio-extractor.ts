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

  // 3. First paragraph inside an author-ish container
  const containerRegex = /<(div|section|article)[^>]+(?:class|id)=["'][^"']*(?:author|bio|profile|about|contributor)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i
  const containerMatch = html.match(containerRegex)
  if (containerMatch) {
    const inner = containerMatch[2]
    const pMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    if (pMatch) {
      const text = decode(stripTags(pMatch[1]))
      if (text.length > 40) return text.slice(0, 500)
    }
  }

  // 4. Fall back to first p tag with substantial text
  const allPs = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
  for (const p of allPs) {
    const text = decode(stripTags(p[1]))
    if (text.length > 80 && text.length < 1000 && !/cookie|privacy|subscribe/i.test(text)) {
      return text.slice(0, 500)
    }
  }

  return null
}
