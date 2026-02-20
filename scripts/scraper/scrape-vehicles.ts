import type { Page } from 'playwright'

export interface ScrapedVehicle {
  name: string
  slug: string
  description: string | null
  category: string | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
  specs: Record<string, string> | null
  image_urls: string[]
  primary_image_url: string | null
}

/**
 * Scrapes the full garage listing from luxeclubrentals.com.
 *
 * Strategy (empirically determined by DOM inspection):
 * - /garage lists all vehicles as <a href="/garage/{slug}"> cards
 * - Each card's innerText contains name, 0-100 time, engine, seats, AED daily price
 * - We visit each detail page for full description, category, image gallery
 *
 * Selector basis:
 * - Vehicle card links: a[href*="/garage/"] with data-framer-name attribute
 * - Detail page: H1 = name, P nodes = description / category / price / specs
 * - Images: img[src*="framerusercontent.com"] excluding SVGs (first 3 are icons)
 */
export async function scrapeVehicles(page: Page): Promise<ScrapedVehicle[]> {
  console.log('  Loading garage listing page...')
  await page.goto('https://www.luxeclubrentals.com/garage', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  // Framer JS needs time to hydrate
  await page.waitForTimeout(3000)

  // Extract all vehicle links from the garage listing
  const vehicleLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/garage/"]'))
    const seen = new Set<string>()
    const results: Array<{ href: string; slug: string }> = []
    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href
      // Only vehicle detail pages — not the /garage listing itself
      const match = href.match(/\/garage\/([a-z0-9-]+)$/)
      if (match && !seen.has(match[1])) {
        seen.add(match[1])
        results.push({ href, slug: match[1] })
      }
    }
    return results
  })

  console.log(`  Found ${vehicleLinks.length} vehicle links on garage page`)

  const vehicles: ScrapedVehicle[] = []

  for (const { href, slug } of vehicleLinks) {
    console.log(`  Scraping detail page: ${slug}`)
    try {
      const vehicle = await scrapeDetailPage(page, href, slug)
      if (vehicle) vehicles.push(vehicle)
    } catch (err) {
      console.warn(`  WARNING: Failed to scrape ${slug}: ${err}`)
    }
  }

  return vehicles
}

async function scrapeDetailPage(
  page: Page,
  url: string,
  slug: string,
): Promise<ScrapedVehicle | null> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  const data = await page.evaluate(() => {
    // Name: first H1
    const nameEl = document.querySelector('h1')
    const name = nameEl?.textContent?.trim() ?? null

    // All leaf-node text: P, SPAN, H2 etc without children (to avoid container duplicates)
    const leafTexts: string[] = []
    const allEls = Array.from(document.querySelectorAll('p, span, h2, h3, li'))
    for (const el of allEls) {
      if (el.childElementCount === 0) {
        const t = el.textContent?.trim()
        if (t && t.length > 1) leafTexts.push(t)
      }
    }

    // Description: the longest <p> that isn't a price/label
    let description: string | null = null
    for (const t of leafTexts) {
      if (
        t.length > 60 &&
        !t.match(/^AED$|^\/Day|^\/Daily|^Insurance|^Crypto|^Color|^Deposit|^Included|^Additional|^Call|^Rated/)
      ) {
        if (!description || t.length > description.length) {
          description = t
        }
      }
    }

    // Category: look for text like "SUV Cars", "Sports Cars", "Luxury Cars"
    const categoryMatch = leafTexts.find(t =>
      /cars$/i.test(t) && t.length < 40
    )
    const category = categoryMatch ?? null

    // Daily rate: find "AED" followed by a number in the leaf texts
    let daily_rate: number | null = null
    for (let i = 0; i < leafTexts.length; i++) {
      if (leafTexts[i] === 'AED' && leafTexts[i + 1]) {
        const val = parseFloat(leafTexts[i + 1].replace(/,/g, ''))
        if (!isNaN(val) && val > 0) {
          daily_rate = val
          break
        }
      }
    }

    // Specs: structured key-value pairs
    // The detail page has patterns like: "0 - 100 km/h" / "3.7 seconds", "Engine type" / "V8", "Seats" / "5 seats"
    const specs: Record<string, string> = {}
    const specKeys = ['0 - 100 km/h', 'Engine type', 'Seats', 'Door', 'Color', 'Deposit', 'Included mileage limit:', 'Additional mileage charge:']
    for (let i = 0; i < leafTexts.length; i++) {
      const t = leafTexts[i]
      if (specKeys.some(k => t.startsWith(k.replace(':', '')))) {
        const key = t.replace(/:$/, '').trim()
        const val = leafTexts[i + 1]?.trim()
        if (val && !specKeys.some(k => val.startsWith(k.replace(':', '')))) {
          specs[key] = val
        }
      }
    }

    // Images: framerusercontent.com JPEGs/WEBPs only (not SVGs)
    const imgs = Array.from(document.querySelectorAll('img[src*="framerusercontent.com"]'))
    const imageUrls: string[] = []
    const seenUrls = new Set<string>()
    for (const img of imgs) {
      const src = (img as HTMLImageElement).src
      // Skip SVG files (logos/icons)
      if (src.includes('.svg')) continue
      // Strip query params to get canonical URL for deduplication
      const canonical = src.split('?')[0]
      if (!seenUrls.has(canonical)) {
        seenUrls.add(canonical)
        // Use a higher-quality version without width restrictions
        imageUrls.push(canonical)
      }
    }

    return {
      name,
      description,
      category,
      daily_rate,
      image_urls: imageUrls,
      specs: Object.keys(specs).length > 0 ? specs : null,
    }
  })

  if (!data.name) {
    console.warn(`  WARNING: No name found for ${slug}`)
    return null
  }

  return {
    name: data.name,
    slug,
    description: data.description,
    category: data.category,
    daily_rate: data.daily_rate,
    weekly_rate: null,  // Not shown on the site
    monthly_rate: null, // Not shown on the site
    specs: data.specs,
    image_urls: data.image_urls,
    primary_image_url: data.image_urls[0] ?? null,
  }
}
