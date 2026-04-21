#!/usr/bin/env node
// One-off price comparison: LuxeClub fleet vs MK Rent a Car.
// Writes a CSV to ~/Downloads that opens directly in Excel.
//
// Usage: npx tsx scripts/compare-prices.mjs
// Output: C:\Users\<user>\Downloads\luxeclub-vs-mk-prices-YYYY-MM-DD.csv

import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// ── Env ────────────────────────────────────────────────────────────────────
const envRaw = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n')
    .map(l => l.match(/^([A-Z_]+)="?([^"]*)"?$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]])
)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

// ── MK Rent a Car snapshot (fetched 2026-04-21 from mkrentacar.com/rental-prices/)
// Format: [name, daily]. MK shows only daily rates publicly; weekly/monthly are
// "Ask Now" on their site so we leave those blank in the output CSV. Deposit
// is uniformly "No Deposit" on the MK page so we don't repeat it per-row.
const MK_FLEET = [
  ['Mercedes CLA 200', 199], ['Jetour G700', 399], ['Nissan Patrol Platinum', 599],
  ['Audi RS6', 999], ['Brabus G800 Kit', 1699], ['Ferrari Roma Spyder', 2199],
  ['Ferrari 296 GTB', 2199], ['Ferrari 296 GTS', 2699], ['Lamborghini Revuelto', 8999],
  ['BMW 420i', 349], ['Infinity QX80', 599], ['Lamborghini Huracan Tecnica', 1999],
  ['Ferrari 812 GTS', 4999], ['Mclaren Artura Yellow', 1499], ['Ferrari SF90', 2999],
  ['Mercedes G63', 999], ['Volkswagen GTI', 249], ['Lamborghini Urus Performante', 2499],
  ['BMW 530Li', 299], ['Lamborghini Evo Spyder', 1999], ['Ferrari Purosangue', 7999],
  ['Ferrari F8 Tributo', 2499], ['Bentley Bentayga', 1299], ['Ferrari 488 Spider', 2499],
  ['Rolls Royce Ghost', 1999], ['Lamborghini Urus', 1799], ['Porsche 911 Carrera 4s', 1299],
  ['Ferrari 812 Superfast', 3999], ['Land Rover Defender', 599], ['Range Rover Vogue', 899],
  ['Lamborghini Urus S', 1999], ['Lamborghini Huracan STO', 2299], ['BMW 318i', 179],
  ['Rolls Royce Cullinan', 2499], ['Porsche GT3', 1999], ['Lamborghini Evo Joker Edition', 1999],
  ['Range Rover Sport', 899], ['RAM TRX 1500', 799], ['Porsche GT3 RS', 2499],
  ['Lamborghini Aventador Roadster SVJ', 9999], ['Range Rover SVR', 899],
  ['Mercedes AMG G63 4x4 Squared', 1499], ['Lamborghini Urus Mansory', 3499],
  ['BMW X4', 399], ['Lamborghini Aventador', 9999], ['Nissan Magnite', 79],
  ['Rolls Royce Phantom', 2999], ['Mercedes GLC 200', 399], ['BMW 630 GT', 299],
  ['Rolls Royce Spectre', 2999], ['Mercedes A200', 179], ['Porsche Cayenne', 799],
  ['BMW 420i Convertible', 349], ['Rolls Royce Wraith', 2999], ['Bentley Continental GT', 1999],
  ['Mercedes E300', 299], ['BMW 750Li', 1099], ['BMW M235', 349],
  ['Bentley Flying Spur', 2099], ['Audi A3', 199], ['BMW M4 Competition', 899],
  ['Rolls Royce Dawn', 3499], ['Range Rover Velar', 699], ['Mercedes E63s', 999],
  ['BMW M8 Competition Convertible', 1999], ['Bentley GTC Convertible', 2499],
  ['Mercedes G Wagon', 999], ['Rolls Royce Cullinan Black Badge', 3499],
  ['Audi RSQ8', 899], ['Mercedes S500', 799], ['Audi RS3', 599],
  ['Audi RSQ8 Performance', 899], ['Mercedes GLE 350', 649], ['Mercedes A 200 AMG', 179],
  ['Audi A6', 299], ['Mercedes E class', 469], ['Audi RS7', 1999],
  ['Mercedes C200', 299], ['Audi R8 V10 Spyder', 1999], ['Mercedes GLC 200 Coupe', 349],
  ['Chevrolet Captiva', 99], ['Mercedes C300 Convertible', 449], ['Mercedes Vito', 949],
  ['Mclaren Artura Orange', 1499], ['Mercedes GT63S', 1699], ['Mercedes G63 Brabus', 1699],
  ['Mercedes G63 Keyvany', 1999], ['Maserati Levante', 699], ['2025 Mercedes G63', 2999],
  ['Mclaren Artura Green', 1499], ['Mini Cooper Countryman', 479],
  ['2023 Mini Cooper S Cabriolet', 249], ['Mini Cooper', 199], ['McLaren Artura', 1499],
  ['2026 Nissan Patrol', 499], ['Nissan Patrol', 349], ['Nissan Super Safari', 349],
  ['Cadillac Escalade', 699], ['Chevrolet Tahoe', 349],
  ['Chevrolet Corvette Convertible', 1499], ['GMC Yukon', 399],
  ['Fiat 500 Convertible', 199], ['Jetour T2', 249],
  ['McLaren Artura Spider', 2099], ['Mclaren 570S Spider', 3999],
  ['Mclaren 720S Spider', 3999],
]

// Deduplicate MK list (their page has many color-duplicate rows)
const mkDedup = new Map()
for (const [name, daily] of MK_FLEET) {
  const key = normalize(name)
  // Keep the lowest price when duplicates exist (MK's base trim)
  if (!mkDedup.has(key) || mkDedup.get(key).daily > daily) {
    mkDedup.set(key, { name, daily })
  }
}

// ── Normalization & matching ───────────────────────────────────────────────
function normalize(s) {
  return String(s)
    .toLowerCase()
    // Strip common descriptors that cause false mismatches
    .replace(/\b(20\d\d|mansory|spyder|spider|coupe|convertible|cabriolet|roadster|black|white|red|grey|gray|brown|yellow|green|orange|chrome|amg)\b/g, ' ')
    // "rs q8" / "rsq8" / "rs-q8" → rsq8
    .replace(/rs\s*q\s*(\d)/g, 'rsq$1')
    .replace(/sq\s*(\d)/g, 'sq$1')
    // Normalize huracan diacritics
    .replace(/huracán/g, 'huracan')
    // Brand aliases
    .replace(/\bmercedes[- ]benz\b/g, 'mercedes')
    .replace(/\bland ?rover\b/g, 'landrover')
    .replace(/\brolls[- ]?royce\b/g, 'rollsroyce')
    .replace(/\bmclaren\b/g, 'mclaren')
    // Collapse non-alphanumeric
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findMkMatch(lcName) {
  const target = normalize(lcName)
  const targetTokens = new Set(target.split(' ').filter(Boolean))
  if (targetTokens.size === 0) return null

  let best = null
  let bestScore = 0
  for (const [mkKey, mk] of mkDedup.entries()) {
    const mkTokens = new Set(mkKey.split(' ').filter(Boolean))
    // Intersection size / smaller set = similarity
    let shared = 0
    for (const t of targetTokens) if (mkTokens.has(t)) shared++
    const score = shared / Math.min(targetTokens.size, mkTokens.size)
    // Require at least 2 shared tokens AND a score of 0.6+ to match
    if (shared >= 2 && score >= 0.6 && score > bestScore) {
      best = mk
      bestScore = score
    }
  }
  return best
}

// ── Fetch LuxeClub fleet ───────────────────────────────────────────────────
async function fetchLuxeFleet() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?select=slug,name,daily_rate,weekly_rate,monthly_rate&is_available=eq.true&order=name.asc`,
    { headers }
  )
  if (!res.ok) {
    console.error('Supabase fetch failed:', res.status, await res.text())
    process.exit(1)
  }
  return await res.json()
}

// ── CSV helpers ────────────────────────────────────────────────────────────
function csvEscape(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// ── Main ───────────────────────────────────────────────────────────────────
;(async () => {
  const luxe = await fetchLuxeFleet()
  console.log(`Pulled ${luxe.length} LuxeClub vehicles from Supabase`)
  console.log(`MK fleet: ${mkDedup.size} unique cars (after dedup from ${MK_FLEET.length} rows)`)

  const matchedMkKeys = new Set()
  const rows = []

  // Header
  rows.push([
    'Car (LuxeClub)', 'LuxeClub Daily', 'MK Daily', 'Difference (Luxe - MK)',
    'LuxeClub Weekly', 'LuxeClub Monthly', 'MK Name (matched)', 'Notes',
  ])

  // LuxeClub rows with matched MK prices
  for (const v of luxe) {
    const mk = findMkMatch(v.name)
    if (mk) matchedMkKeys.add(normalize(mk.name))
    const diff = (mk && v.daily_rate) ? (v.daily_rate - mk.daily) : ''
    rows.push([
      v.name,
      v.daily_rate ?? '',
      mk ? mk.daily : '',
      diff,
      v.weekly_rate ?? '',
      v.monthly_rate ?? '',
      mk ? mk.name : '',
      mk ? '' : 'No MK match found',
    ])
  }

  // Separator + MK-only rows (cars MK stocks that we don't)
  rows.push(['', '', '', '', '', '', '', ''])
  rows.push(['MK-ONLY CARS (we do not stock)', '', '', '', '', '', '', ''])
  for (const [key, mk] of mkDedup.entries()) {
    if (matchedMkKeys.has(key)) continue
    rows.push([mk.name, '', mk.daily, '', '', '', mk.name, 'MK stocks this, LuxeClub does not'])
  }

  // Write CSV
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n')
  const date = new Date().toISOString().slice(0, 10)
  const outPath = join(homedir(), 'Downloads', `luxeclub-vs-mk-prices-${date}.csv`)
  writeFileSync(outPath, csv, 'utf8')

  const matchedCount = rows.filter(r => r[2] && r[0] && !String(r[0]).startsWith('MK-ONLY')).length - 1 // minus header
  console.log(`\nWrote ${rows.length - 2} data rows to:\n  ${outPath}`)
  console.log(`\n${matchedCount} of ${luxe.length} LuxeClub cars matched to MK prices`)
  console.log(`${mkDedup.size - matchedMkKeys.size} MK cars have no LuxeClub equivalent`)
  console.log('\nOpen the CSV directly in Excel.')
})().catch(err => {
  console.error(err)
  process.exit(1)
})
