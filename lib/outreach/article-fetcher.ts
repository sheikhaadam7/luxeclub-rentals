/**
 * Full-article text fetching + extraction.
 * Uses ScrapingBee for the fetch (to bypass outlet bot blocks),
 * then a simple readability-like extraction for the body text.
 */

import 'server-only'
import { fetchPage, ScrapingBeeError } from './scrapingbee'

function decode(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Extract clean article body text from HTML.
 * Heuristics:
 *   1. Look for <article> tag, prefer this if found
 *   2. Fall back to <main>
 *   3. Collect all <p> tags in the preferred container
 *   4. Strip all remaining tags, decode entities
 *   5. Truncate to 5000 chars
 */
export function extractArticleText(html: string): string {
  // Prefer <article>, then <main>
  let container = html
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) {
    container = articleMatch[1]
  } else {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch) container = mainMatch[1]
  }

  // Strip script + style blocks before extracting paragraphs
  container = container
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

  const paragraphs = Array.from(container.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => decode(m[1].replace(/<[^>]+>/g, '')).trim())
    .filter((text) => text.length > 40) // Drop short fragments (captions, bylines)

  const joined = paragraphs.join('\n\n')
  return joined.slice(0, 5000)
}

export async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const html = await fetchPage(url, { renderJs: false })
    const text = extractArticleText(html)
    return text.length > 0 ? text : null
  } catch (err) {
    if (err instanceof ScrapingBeeError) {
      console.error(`[fetchArticleText] ScrapingBee error for ${url}:`, err.message)
    }
    return null
  }
}
