#!/usr/bin/env node
// Update LuxeClub daily_rate values from a user-edited xlsx file.
// Reads column A (car name) + column B (new daily rate) from sheet 1.
// Skips rows where column A is empty, the header row, or starts with
// "MK-ONLY" (the MK-only-cars section from the comparison script).
//
// Usage:
//   node scripts/update-daily-rates.mjs                  # dry-run preview
//   node scripts/update-daily-rates.mjs --apply          # actually update Supabase

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

const SRC = 'C:\\Users\\cherr\\OneDrive\\Desktop\\luxeclub-vs-mkprices.xlsx'
const APPLY = process.argv.includes('--apply')

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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

// ── Extract xlsx (it's a zip) ──────────────────────────────────────────────
const workDir = join(tmpdir(), 'luxeclub-xlsx-' + Date.now())
mkdirSync(workDir, { recursive: true })
const zipCopy = join(workDir, 'file.zip')
writeFileSync(zipCopy, readFileSync(SRC))

execSync(
  `powershell -NoProfile -Command "Expand-Archive -Path '${zipCopy}' -DestinationPath '${workDir}\\unpacked' -Force"`,
  { stdio: ['ignore', 'ignore', 'inherit'] },
)

const sharedRaw = readFileSync(join(workDir, 'unpacked', 'xl', 'sharedStrings.xml'), 'utf8')
const sheetRaw = readFileSync(join(workDir, 'unpacked', 'xl', 'worksheets', 'sheet1.xml'), 'utf8')

// ── Parse sharedStrings (array of strings used anywhere that a cell t="s") ─
// Each <si> contains one or more <t> children (with possible inline run formatting).
// Concatenate all <t> text inside each <si>.
const strings = []
for (const siMatch of sharedRaw.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  const inner = siMatch[1]
  let text = ''
  for (const t of inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) {
    text += t[1]
  }
  // Decode basic XML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  strings.push(text)
}

// ── Walk rows, extract (A, B) pairs ────────────────────────────────────────
const rows = []
for (const rowMatch of sheetRaw.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
  const rowInner = rowMatch[1]
  const cells = {}
  for (const c of rowInner.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
    const col = c[1]
    const attrs = c[3]
    const contents = c[4]
    const isStr = /t="s"/.test(attrs)
    const vMatch = contents.match(/<v>([\s\S]*?)<\/v>/)
    if (!vMatch) continue
    const raw = vMatch[1]
    cells[col] = isStr ? strings[Number(raw)] : Number(raw)
  }
  if (cells.A !== undefined && cells.B !== undefined) {
    rows.push({ name: String(cells.A).trim(), daily: cells.B })
  }
}

// Skip header + MK-only rows
const updates = rows
  .filter(r => r.name && !/^Car\s*\(LuxeClub\)$/i.test(r.name))
  .filter(r => !/^MK-ONLY/i.test(r.name))
  .filter(r => typeof r.daily === 'number' && r.daily > 0)

console.log(`Parsed ${updates.length} (name, daily) pairs from the xlsx.\n`)

// ── Fetch LuxeClub fleet for matching ──────────────────────────────────────
const vehRes = await fetch(
  `${SUPABASE_URL}/rest/v1/vehicles?select=slug,name,daily_rate&order=name.asc`,
  { headers },
)
if (!vehRes.ok) {
  console.error('Supabase fetch failed:', vehRes.status, await vehRes.text())
  process.exit(1)
}
const vehicles = await vehRes.json()

// ── Match by exact (case/space-insensitive) name, then by normalized form ──
function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '').trim()
}
const byNorm = new Map()
for (const v of vehicles) byNorm.set(norm(v.name), v)

const matched = []
const unmatched = []
for (const u of updates) {
  const key = norm(u.name)
  const v = byNorm.get(key)
  if (!v) {
    unmatched.push(u)
    continue
  }
  if (v.daily_rate === u.daily) continue // no change needed
  matched.push({ slug: v.slug, name: v.name, oldDaily: v.daily_rate, newDaily: u.daily })
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`✓ Matched & changing: ${matched.length}`)
console.log(`= Matched & unchanged: ${updates.length - matched.length - unmatched.length}`)
console.log(`✗ Unmatched (skipped): ${unmatched.length}\n`)

if (matched.length) {
  console.log('Proposed updates:')
  for (const m of matched) {
    const sign = m.newDaily > m.oldDaily ? '↑' : '↓'
    console.log(`  ${sign} ${m.name.padEnd(32)}  ${String(m.oldDaily ?? '—').padStart(5)} → ${String(m.newDaily).padStart(5)}  (${m.newDaily - (m.oldDaily ?? 0) > 0 ? '+' : ''}${m.newDaily - (m.oldDaily ?? 0)})`)
  }
}

if (unmatched.length) {
  console.log('\nUnmatched rows (no LuxeClub vehicle with this name):')
  for (const u of unmatched) {
    console.log(`  ? ${u.name.padEnd(32)}  daily=${u.daily}`)
  }
}

if (!APPLY) {
  console.log('\n(dry-run) — re-run with --apply to push these to Supabase')
  rmSync(workDir, { recursive: true, force: true })
  process.exit(0)
}

// ── Apply ──────────────────────────────────────────────────────────────────
console.log('\nApplying to Supabase...')
let ok = 0
let fail = 0
for (const m of matched) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vehicles?slug=eq.${encodeURIComponent(m.slug)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ daily_rate: m.newDaily }),
    },
  )
  if (res.ok) {
    ok++
  } else {
    fail++
    console.error(`  FAILED ${m.slug}: ${res.status} ${await res.text()}`)
  }
}
console.log(`\nDone: ${ok} updated, ${fail} failed.`)

rmSync(workDir, { recursive: true, force: true })
