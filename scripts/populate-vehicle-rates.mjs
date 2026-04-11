#!/usr/bin/env node
// Populate weekly_rate, monthly_rate, and deposit_amount for all vehicles
// that currently have daily_rate but are missing the other fields.
//
// Formulas (industry-typical for Dubai luxury rental market, April 2026):
//   weekly_rate  = daily_rate × 4.75 (≈32% per-day discount vs daily)
//   monthly_rate = daily_rate × 15   (≈50% per-day discount vs daily)
//   deposit_amount = daily_rate × 1  (one day's rental as damage hold)
//
// These are formulaic starting points, not real negotiated rates. Adjust
// individual vehicles via the admin panel or SQL after this script runs.
// Supports --dry-run.

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
const DRY_RUN = process.argv.includes('--dry-run')

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

// Round to the nearest 50 AED for nicer-looking prices
const round50 = (n) => Math.round(n / 50) * 50

async function fetchVehicles() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?select=slug,name,daily_rate,weekly_rate,monthly_rate,deposit_amount`,
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

const vehicles = await fetchVehicles()
console.log(`Scanning ${vehicles.length} vehicles…\n`)

const updates = []

for (const car of vehicles) {
  if (!car.daily_rate) continue
  const daily = Number(car.daily_rate)

  const body = {}
  if (car.weekly_rate == null) body.weekly_rate = round50(daily * 4.75)
  if (car.monthly_rate == null) body.monthly_rate = round50(daily * 15)
  if (car.deposit_amount == null) body.deposit_amount = round50(daily * 1)

  if (Object.keys(body).length === 0) continue
  updates.push({ slug: car.slug, name: car.name, daily, body })
}

if (updates.length === 0) {
  console.log('No vehicles need populating — all rates already set.')
  process.exit(0)
}

console.log(`Populating ${updates.length} vehicles:\n`)
for (const u of updates) {
  const parts = []
  if ('weekly_rate' in u.body) parts.push(`w:${u.body.weekly_rate}`)
  if ('monthly_rate' in u.body) parts.push(`m:${u.body.monthly_rate}`)
  if ('deposit_amount' in u.body) parts.push(`dep:${u.body.deposit_amount}`)
  console.log(`  ${u.name.padEnd(42)} d:${String(u.daily).padEnd(6)} ${parts.join(' ')}`)
}

if (DRY_RUN) {
  console.log('\n[dry-run] no changes written.')
  process.exit(0)
}

console.log('\nApplying updates…')
for (const u of updates) {
  await patchVehicle(u.slug, u.body)
  console.log(`  ✓ ${u.slug}`)
}
console.log('\nDone. Review individual vehicles in the admin panel and adjust any that need different rates.')
