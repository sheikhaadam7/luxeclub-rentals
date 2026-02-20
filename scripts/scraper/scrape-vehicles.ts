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

const BRANDS = [
  'Audi',
  'Porsche',
  'Bentley',
  'Maserati',
  'Aston Martin',
  'Range Rover',
  'Cadillac',
  'Rolls Royce',
  'Mercedes',
]

/**
 * Scrapes the full garage from luxeclubrentals.com across all brand filters.
 *
 * The garage page shows one brand at a time via clickable brand filters.
 * Default view shows Audi. We click each brand filter to reveal that brand's cars,
 * collect all vehicle links, then visit each detail page for full data.
 */
export async function scrapeVehicles(page: Page): Promise<ScrapedVehicle[]> {
  console.log('  Loading garage listing page...')
  await page.goto('https://www.luxeclubrentals.com/garage', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(4000)

  // Collect all vehicle links across all brand filters
  const allLinks = new Map<string, { href: string; slug: string }>()

  for (const brand of BRANDS) {
    console.log(`  Clicking brand filter: ${brand}`)
    try {
      // Click the brand filter — target the <p> tag with exact text
      const filterEl = page.locator('p', { hasText: new RegExp(`^${brand.replace(/\s/g, '\\s')}$`) }).first()
      await filterEl.click({ timeout: 5000 })
      await page.waitForTimeout(2000)

      // Extract vehicle links visible after filter click
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/garage/"]'))
        const results: Array<{ href: string; slug: string }> = []
        for (const a of anchors) {
          const href = (a as HTMLAnchorElement).href
          const match = href.match(/\/garage\/([a-z0-9-]+)$/)
          if (match) {
            results.push({ href, slug: match[1] })
          }
        }
        return results
      })

      for (const link of links) {
        if (!allLinks.has(link.slug)) {
          allLinks.set(link.slug, link)
        }
      }
      console.log(`    Found ${links.length} vehicles for ${brand} (${allLinks.size} total unique)`)
    } catch (err) {
      console.warn(`    WARNING: Could not click filter for ${brand}: ${err}`)
    }
  }

  console.log(`  Total unique vehicle links: ${allLinks.size}`)

  const vehicles: ScrapedVehicle[] = []

  for (const { href, slug } of allLinks.values()) {
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

    // All leaf-node text
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

    // Daily rate: find "AED" followed by a number
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

    // Images: framerusercontent.com JPEGs/WEBPs only
    const imgs = Array.from(document.querySelectorAll('img[src*="framerusercontent.com"]'))
    const imageUrls: string[] = []
    const seenUrls = new Set<string>()
    for (const img of imgs) {
      const src = (img as HTMLImageElement).src
      if (src.includes('.svg')) continue
      const canonical = src.split('?')[0]
      if (!seenUrls.has(canonical)) {
        seenUrls.add(canonical)
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
    weekly_rate: null,
    monthly_rate: null,
    specs: data.specs,
    image_urls: data.image_urls,
    primary_image_url: data.image_urls[0] ?? null,
  }
}
