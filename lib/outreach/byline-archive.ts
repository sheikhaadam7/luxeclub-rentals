/**
 * Full byline archive fetcher.
 *
 * Tries in order:
 *   1. Outlet author-page paginated (/author/<slug>/, ?page=2, /page/2/)
 *   2. Sitemap author index (/sitemap_authors.xml)
 *   3. Serper broad search site:<domain> "First Last" paginated via `start`
 *
 * Returns discovered article URLs with titles/snippets. Caller inserts into
 * outreach_articles (using existing UNIQUE(editor_id, url) to dedupe).
 */

import 'server-only'
import { fetchPage } from './scrapingbee'

export interface BylineArticle {
  url: string
  title: string
  snippet: string | null
  publishedDate: string | null
}

function slugify(firstName: string, lastName: string): string[] {
  const fn = firstName.toLowerCase()
  const ln = lastName.toLowerCase()
  return [
    `${fn}-${ln}`,
    `${fn}.${ln}`,
    `${fn}${ln}`,
    `${fn}_${ln}`,
  ]
}

function extractArticlesFromHtml(html: string, baseUrl: string): BylineArticle[] {
  const out: BylineArticle[] = []
  const seen = new Set<string>()

  // Find all <a href="...">article links inside the HTML
  const anchorRx = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]{10,200})<\/a>/gi
  let m
  while ((m = anchorRx.exec(html)) !== null) {
    let url = m[1]
    if (url.startsWith('/')) {
      try { url = new URL(url, baseUrl).toString() } catch { continue }
    }
    if (!/^https?:\/\//.test(url)) continue
    if (seen.has(url)) continue
    // Heuristic: article URLs usually have a slug-like path with hyphens
    if (!/\/[a-z0-9][a-z0-9-]{8,}/.test(url)) continue
    if (/\/(tag|category|author|page|search|rss|feed|about|contact|privacy|sitemap)/i.test(url)) continue
    const title = m[2].replace(/\s+/g, ' ').trim()
    if (title.length < 10) continue
    seen.add(url)
    out.push({ url, title, snippet: null, publishedDate: null })
  }

  return out.slice(0, 100)
}

export async function fetchByline(
  domain: string,
  firstName: string,
  lastName: string
): Promise<BylineArticle[]> {
  const base = `https://${domain}`
  const slugs = slugify(firstName, lastName)

  // Attempt 1–4: author page slugs with optional page=2/3
  for (const slug of slugs) {
    for (const suffix of ['/', '/page/2/', '/page/3/']) {
      try {
        const url = `${base}/author/${slug}${suffix}`
        const html = await fetchPage(url, { renderJs: false })
        const articles = extractArticlesFromHtml(html, base)
        if (articles.length >= 3) return articles
      } catch { /* try next */ }
    }
  }

  // Attempt 5: author sitemap
  try {
    const sitemap = await fetchPage(`${base}/sitemap_authors.xml`, { renderJs: false })
    const urlRx = /<loc>([^<]+)<\/loc>/g
    const candidates: string[] = []
    let m
    while ((m = urlRx.exec(sitemap)) !== null) {
      if (slugs.some((s) => m![1].toLowerCase().includes(s))) candidates.push(m[1])
    }
    if (candidates.length > 0) {
      const html = await fetchPage(candidates[0], { renderJs: false })
      const articles = extractArticlesFromHtml(html, base)
      if (articles.length > 0) return articles
    }
  } catch { /* ignore */ }

  return []
}
