#!/usr/bin/env node
// Detect and remove byte-identical duplicate images across all vehicles.
// Reads image_urls from the vehicles table, looks up each file's ETag
// (MD5) via Supabase Storage list API, and removes duplicates preserving
// the first occurrence. Optionally runs in --dry-run mode.

import { readFileSync } from 'node:fs'

const envRaw = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n')
    .map(l => l.match(/^([A-Z_]+)="?([^"]*)"?$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]])
)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'vehicle-images'
const DRY_RUN = process.argv.includes('--dry-run')

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function listFiles(prefix) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix, limit: 1000 }),
  })
  if (!res.ok) throw new Error(`list ${prefix}: ${res.status}`)
  return res.json()
}

async function fetchVehicles() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?select=slug,name,primary_image_url,image_urls`,
    { headers }
  )
  if (!res.ok) throw new Error(`vehicles: ${res.status}`)
  return res.json()
}

async function patchVehicle(slug, body) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`patch ${slug}: ${res.status} ${await res.text()}`)
}

function fileKeyFromUrl(url) {
  // https://<host>/storage/v1/object/public/vehicle-images/<slug>/<file>
  const m = url.match(/\/vehicle-images\/(.+)$/)
  return m ? m[1] : null
}

const vehicles = await fetchVehicles()
console.log(`Scanning ${vehicles.length} vehicles…\n`)

const summary = []

for (const car of vehicles) {
  const urls = car.image_urls || []
  if (urls.length === 0) continue

  // Figure out the folder prefix (everything before last /)
  const firstKey = fileKeyFromUrl(urls[0])
  if (!firstKey) continue
  const prefix = firstKey.includes('/') ? firstKey.split('/')[0] : ''

  let files
  try {
    files = await listFiles(prefix)
  } catch (e) {
    console.error(`  ${car.slug}: list failed — ${e.message}`)
    continue
  }

  // Map filename → eTag
  const etagByFile = new Map()
  for (const f of files) {
    if (f.metadata?.eTag) etagByFile.set(f.name, f.metadata.eTag.replace(/"/g, ''))
  }

  // Walk image_urls, dedupe by ETag
  const seenEtags = new Set()
  const keptUrls = []
  const removedUrls = []
  for (const url of urls) {
    const key = fileKeyFromUrl(url) // e.g. "bmw-m4-competition/1.webp"
    const filename = key ? key.split('/').slice(1).join('/') : null
    const etag = filename ? etagByFile.get(filename) : null
    if (!etag) {
      // Unknown — keep as-is, can't classify
      keptUrls.push(url)
      continue
    }
    if (seenEtags.has(etag)) {
      removedUrls.push({ url, etag })
    } else {
      seenEtags.add(etag)
      keptUrls.push(url)
    }
  }

  if (removedUrls.length === 0) continue

  // Determine if primary_image_url needs fixing
  let newPrimary = car.primary_image_url
  if (newPrimary && !keptUrls.includes(newPrimary)) {
    // primary was removed; pick its ETag's canonical kept URL
    const primaryFilename = fileKeyFromUrl(newPrimary)?.split('/').slice(1).join('/')
    const primaryEtag = primaryFilename ? etagByFile.get(primaryFilename) : null
    const replacement = keptUrls.find(u => {
      const f = fileKeyFromUrl(u)?.split('/').slice(1).join('/')
      return f && etagByFile.get(f) === primaryEtag
    }) ?? keptUrls[0]
    newPrimary = replacement
  }

  summary.push({
    slug: car.slug,
    name: car.name,
    before: urls.length,
    after: keptUrls.length,
    removed: removedUrls.map(r => fileKeyFromUrl(r.url)),
    primaryChanged: newPrimary !== car.primary_image_url,
    newPrimary,
    keptUrls,
  })
}

if (summary.length === 0) {
  console.log('No byte-identical duplicates found.')
  process.exit(0)
}

console.log(`Found duplicates in ${summary.length} vehicles:\n`)
for (const s of summary) {
  console.log(`  ${s.slug} (${s.name}): ${s.before} → ${s.after}`)
  for (const r of s.removed) console.log(`     - ${r}`)
  if (s.primaryChanged) console.log(`     primary_image_url updated`)
}

if (DRY_RUN) {
  console.log('\n[dry-run] no changes written.')
  process.exit(0)
}

console.log('\nApplying updates…')
for (const s of summary) {
  const body = { image_urls: s.keptUrls }
  if (s.primaryChanged) body.primary_image_url = s.newPrimary
  await patchVehicle(s.slug, body)
  console.log(`  ✓ ${s.slug}`)
}
console.log('\nDone.')
