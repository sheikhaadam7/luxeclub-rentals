/**
 * One-shot seeder for outreach_domains.
 * Reads docs/seo/hunter-domains.csv and inserts via Supabase REST API.
 */

import { readFileSync } from 'node:fs'

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf-8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY in .env.local')
  process.exit(1)
}

const csv = readFileSync('docs/seo/hunter-domains.csv', 'utf-8')
const lines = csv.split('\n').filter((l) => l.trim())
const header = lines[0].split(',')
const idx = (name) => header.indexOf(name)

const rows = lines.slice(1).map((line) => {
  const cells = line.split(',')
  return {
    domain: cells[idx('domain')]?.trim(),
    outlet_name: cells[idx('outlet')]?.trim(),
    tier: cells[idx('tier')]?.trim(),
    priority: cells[idx('priority')]?.trim(),
    notes: cells[idx('notes')]?.trim() || null,
  }
}).filter((r) => r.domain && r.outlet_name)

console.log(`Seeding ${rows.length} domains...`)

let inserted = 0
let skipped = 0

for (const row of rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/outreach_domains`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })

  if (res.ok) {
    inserted++
  } else if (res.status === 409) {
    skipped++
  } else {
    const err = await res.text()
    console.error(`Failed for ${row.domain}: ${res.status} - ${err.slice(0, 200)}`)
  }
}

console.log(`✓ Inserted: ${inserted}`)
console.log(`✓ Skipped (already existed): ${skipped}`)

// Verify count
const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/outreach_domains?select=*`, {
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    Prefer: 'count=exact',
  },
})
const all = await verifyRes.json()
console.log(`\n✓ Total domains in DB: ${all.length}`)
console.log('\nP1 domains:')
for (const d of all.filter((d) => d.priority === 'P1')) {
  console.log(`  - ${d.outlet_name} (${d.tier}) → ${d.domain}`)
}
