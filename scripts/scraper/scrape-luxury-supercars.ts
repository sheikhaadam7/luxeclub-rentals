import type { Page } from 'playwright'
import type { ScrapedVehicle } from './scrape-vehicles'

/**
 * Hardcoded vehicle detail-page URLs from luxurysupercarsdubai.com.
 * Each page carries a JSON-LD Product schema we parse for structured data.
 */
const VEHICLE_URLS = [
  // Lamborghini
  'https://luxurysupercarsdubai.com/rent-lamborghini-dubai/lamborghini-revuelto/',
  'https://luxurysupercarsdubai.com/rent-lamborghini-dubai/lamborghini-urus-black/',
  'https://luxurysupercarsdubai.com/rent-lamborghini-dubai/lamborghini-urus-yellow/',
  'https://luxurysupercarsdubai.com/rent-lamborghini-dubai/lamborghini-huracan-sto/',
  'https://luxurysupercarsdubai.com/rent-lamborghini-dubai/lamborghini-huracan-evo-coupe/',
  // Ferrari
  'https://luxurysupercarsdubai.com/rent-ferrari-dubai/ferrari-purosangue/',
  'https://luxurysupercarsdubai.com/rent-ferrari-dubai/ferrari-sf90-stradale/',
  'https://luxurysupercarsdubai.com/rent-ferrari-dubai/ferrari-296-gts-spyder/',
  'https://luxurysupercarsdubai.com/rent-ferrari-dubai/ferrari-roma-spyder/',
  'https://luxurysupercarsdubai.com/rent-ferrari-dubai/ferrari-portofino/',
  'https://luxurysupercarsdubai.com/rent-ferrari-dubai/ferrari-f8-tributo-spyder-yellow/',
  'https://luxurysupercarsdubai.com/rent-ferrari-dubai/ferrari-488-spyder-white/',
  // McLaren
  'https://luxurysupercarsdubai.com/rent-mclaren-dubai/mclaren-765lt/',
  'https://luxurysupercarsdubai.com/rent-mclaren-dubai/mclaren-720s/',
  'https://luxurysupercarsdubai.com/rent-mclaren-dubai/mclaren-artura/',
  'https://luxurysupercarsdubai.com/rent-mclaren-dubai/mclaren-570s/',
  // BMW
  'https://luxurysupercarsdubai.com/rent-bmw-dubai/bmw-m3-competition/',
  'https://luxurysupercarsdubai.com/rent-bmw-dubai/bmw-m4-competition/',
  'https://luxurysupercarsdubai.com/rent-bmw-dubai/bmw-m5-competition/',
  'https://luxurysupercarsdubai.com/rent-bmw-dubai/bmw-x6-m-competition-blue/',
]

/** Tokens that should stay uppercase when converting slug → display name */
const UPPERCASE_TOKENS = new Set([
  'gts', 'sto', 'evo', 'sf90', 'f8', 'lt', 'm3', 'm4', 'm5', 'x6',
  'bmw', '765lt', '720s', '570s', '488', '296',
])

/**
 * Convert a URL slug like "lamborghini-huracan-evo-coupe" into
 * a clean display name: "Lamborghini Huracan EVO Coupe".
 */
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) =>
      UPPERCASE_TOKENS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/**
 * Extract the slug from a vehicle URL.
 * e.g. ".../lamborghini-revuelto/" → "lamborghini-revuelto"
 */
function urlToSlug(url: string): string {
  const parts = url.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1]
}

/**
 * Scrapes 20 vehicles from luxurysupercarsdubai.com.
 *
 * Each detail page embeds a JSON-LD Product schema with name, price,
 * images, color, seats, and year. Where the JSON-LD image array is
 * missing we fall back to wp-content/uploads images in the DOM.
 */
export async function scrapeLuxurySupercars(page: Page): Promise<ScrapedVehicle[]> {
  const vehicles: ScrapedVehicle[] = []

  for (const url of VEHICLE_URLS) {
    const slug = urlToSlug(url)
    console.log(`  Scraping: ${slug}`)
    try {
      const vehicle = await scrapeDetailPage(page, url, slug)
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
  await page.waitForTimeout(3000)

  const data = await page.evaluate(() => {
    // ---- JSON-LD extraction ----
    const ldScripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    )
    let product: Record<string, unknown> | null = null
    for (const script of ldScripts) {
      try {
        const parsed = JSON.parse(script.textContent ?? '')
        // Collect all candidate objects — could be top-level, in an array, or in @graph
        const candidates: unknown[] = []
        if (Array.isArray(parsed)) {
          candidates.push(...parsed)
        } else {
          candidates.push(parsed)
          // Also search inside @graph array (WordPress SEO plugins nest Product here)
          if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            candidates.push(...parsed['@graph'])
          }
        }
        for (const c of candidates) {
          if (c && typeof c === 'object' && (c as Record<string, unknown>)['@type'] === 'Product') {
            product = c as Record<string, unknown>
            break
          }
        }
      } catch { /* skip malformed JSON-LD */ }
      if (product) break
    }

    let name: string | null = null
    let description: string | null = null
    let price: number | null = null
    let color: string | null = null
    let seats: string | null = null
    let year: string | null = null
    let jsonLdImages: string[] = []

    if (product) {
      // Name: strip "Rent " prefix and trailing " Dubai | ..." or " | ..."
      const rawName = (product.name as string) ?? ''
      name = rawName
        .replace(/^Rent\s+/i, '')
        .replace(/\s+Dubai\b.*$/i, '')
        .replace(/\s*\|.*$/, '')
        .trim() || null

      description = (product.description as string) ?? null

      // Price from offers
      const offers = product.offers as Record<string, unknown> | undefined
      if (offers?.price) {
        const val = parseFloat(String(offers.price).replace(/,/g, ''))
        if (!isNaN(val) && val > 0) price = val
      }

      color = (product.color as string) ?? null

      // Additional properties (seats, year)
      const addlProps = product.additionalProperty as
        | Array<{ name: string; value: string }>
        | undefined
      if (Array.isArray(addlProps)) {
        for (const prop of addlProps) {
          const pName = (prop.name ?? '').toLowerCase()
          if (pName.includes('seat')) seats = prop.value
          if (pName.includes('year')) year = prop.value
        }
      }

      // Images from JSON-LD — may be plain strings OR ImageObject { url: "..." }
      // Only keep actual vehicle photos (wp-content/uploads in jpg/png/webp)
      const rawImages = Array.isArray(product.image) ? product.image : product.image ? [product.image] : []
      for (const img of rawImages) {
        const imgUrl = typeof img === 'string' ? img
          : (img && typeof img === 'object' && typeof (img as Record<string, unknown>).url === 'string')
            ? (img as Record<string, string>).url
            : null
        if (!imgUrl) continue
        const l = imgUrl.toLowerCase()
        if (!l.includes('wp-content/uploads')) continue
        const e = l.split('?')[0].split('.').pop() ?? ''
        if (['jpg', 'jpeg', 'png', 'webp'].includes(e)) {
          jsonLdImages.push(imgUrl)
        }
      }
    }

    // ---- DOM fallback for images when JSON-LD has none ----
    let domImages: string[] = []
    if (jsonLdImages.length === 0) {
      // Target the WooCommerce product gallery first, then fall back to all uploads
      const galleryImgs = Array.from(
        document.querySelectorAll(
          '.woocommerce-product-gallery img, .wpgs-for img, .single-product-main-image img',
        ),
      )
      const fallbackImgs = galleryImgs.length > 0
        ? galleryImgs
        : Array.from(document.querySelectorAll('img[src*="wp-content/uploads"]'))

      const seen = new Set<string>()
      for (const img of fallbackImgs) {
        const src = (img as HTMLImageElement).src
        if (!src) continue
        const srcLower = src.toLowerCase()
        if (!srcLower.includes('wp-content/uploads')) continue
        const ext = srcLower.split('?')[0].split('.').pop() ?? ''
        if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) continue
        // Skip thumbnails (e.g. -150x150.jpg)
        if (/-\d+x\d+\.\w+$/.test(src)) continue
        const canonical = src.split('?')[0]
        if (!seen.has(canonical)) {
          seen.add(canonical)
          domImages.push(canonical)
        }
      }
    }

    const imageUrls = jsonLdImages.length > 0 ? jsonLdImages : domImages

    return { name, description, price, color, seats, year, imageUrls }
  })

  // Always use slug-derived name — JSON-LD names are SEO titles with junk suffixes
  const vehicleName = slugToName(slug)

  // Build specs
  const specs: Record<string, string> = {}
  if (data.color) specs['Color'] = data.color
  if (data.seats) specs['Seats'] = data.seats
  if (data.year) specs['Year'] = data.year

  return {
    name: vehicleName,
    slug,
    description: data.description,
    category: null,
    daily_rate: data.price,
    weekly_rate: null,
    monthly_rate: null,
    specs: Object.keys(specs).length > 0 ? specs : null,
    image_urls: data.imageUrls,
    primary_image_url: data.imageUrls[0] ?? null,
  }
}
