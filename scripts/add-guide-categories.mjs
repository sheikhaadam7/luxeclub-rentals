import { readFileSync, writeFileSync } from 'node:fs'

let text = readFileSync('lib/guides.ts', 'utf8')

const cats = {
  'dubai-driving-rules-for-tourists': 'driving',
  'best-driving-roads-dubai-uae': 'driving',
  'porsche-911-turbo-s-why-its-the-ultimate-rental': 'cars',
  'first-time-renting-luxury-car-dubai': 'planning',
  'why-dubai-is-supercar-capital-of-the-world': 'dubai-life',
  'car-rental-deposits-dubai-how-to-protect-yourself': 'cars',
  'dubai-traffic-fines-complete-guide': 'driving',
  'dubai-airport-parking-guide': 'planning',
  'uae-roundabout-rules-guide': 'driving',
  'dubai-speed-cameras-locations-guide': 'driving',
  'dubai-to-hatta-road-trip-guide': 'driving',
  'rental-car-fines-dubai-what-happens': 'driving',
  'rent-car-dubai-cryptocurrency-bitcoin': 'cars',
  'best-cars-rent-dubai-wedding': 'cars',
  'is-dubai-safe-to-visit-2026': 'planning',
  'dubai-mall-guide-parking-access': 'planning',
}

for (const [slug, cat] of Object.entries(cats)) {
  const marker = `slug: '${slug}'`
  const idx = text.indexOf(marker)
  if (idx === -1) { console.log('MISS:', slug); continue }

  const dateMarker = 'publishedDate:'
  const dateIdx = text.indexOf(dateMarker, idx)
  if (dateIdx === -1) { console.log('NO DATE:', slug); continue }

  // Find end of publishedDate line
  const lineEnd = text.indexOf('\n', dateIdx)

  // Check if next line already has category
  const nextChunk = text.substring(lineEnd + 1, lineEnd + 30)
  if (nextChunk.includes('category')) {
    console.log('SKIP:', slug)
    continue
  }

  text = text.substring(0, lineEnd + 1) + `    category: '${cat}',\n` + text.substring(lineEnd + 1)
  console.log('Added', cat, 'to', slug)
}

writeFileSync('lib/guides.ts', text)
console.log('Done.')
