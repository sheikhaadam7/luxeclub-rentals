import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '')
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const key = get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
if (!url || !key) throw new Error('Missing Supabase env')

const supabase = createClient(url, key)
const { data, error } = await supabase
  .from('vehicles')
  .select('slug,name,is_available')
  .order('slug')
if (error) throw error

const live = new Map(data.map((v) => [v.slug, v]))

const expectedLive = [
  'bentley-continental-gt',
  'bentley-continental-gtc',
  'audi-r8-spyder',
  'porsche-cayenne-coupe',
  'bentley-bentayga-brown',
  'bentley-bentayga',
  '911-carerra-s-spyder',
  'aston-martin-dbx-707',
  'rolls-royce-culli-mansory',
  'audi-rs7',
  'audi-rs3',
  'audi-sq7',
  'audi-rs5',
  'porsche-911-gt3-rs',
  'porsche-911-gt3',
  'porsche-911-turbo-s',
  'range-rover-vogue-hse',
  'range-rover-vogue-mansory',
  'aston-martin-vantage',
]

const expectedGone = ['rolls-royce-wraith', 'range-rover-orange', '1000']

console.log(`\n=== All vehicles in Supabase (${data.length} rows) ===`)
for (const v of data) {
  console.log(`  ${v.is_available ? '✓' : '✗'} ${v.slug.padEnd(36)} ${v.name}`)
}

console.log(`\n=== User's 301 list — verify each slug exists ===`)
for (const slug of expectedLive) {
  const v = live.get(slug)
  if (!v) console.log(`  ❌ NOT IN SUPABASE: ${slug}`)
  else if (!v.is_available) console.log(`  ⚠️  exists but is_available=false: ${slug}`)
  else console.log(`  ✓ ${slug}`)
}

console.log(`\n=== User's 410 list — verify each slug is NOT live ===`)
for (const slug of expectedGone) {
  const v = live.get(slug)
  if (v?.is_available) console.log(`  ❌ STILL LIVE IN SUPABASE: ${slug} (${v.name})`)
  else if (v) console.log(`  ✓ exists but is_available=false: ${slug}`)
  else console.log(`  ✓ not in Supabase: ${slug}`)
}

console.log(`\n=== Live in Supabase but NOT in user's 301 list ===`)
console.log(`(these are current cars that aren't getting explicit overrides — fine if catch-all handles them)`)
const expectedSet = new Set(expectedLive)
for (const v of data.filter((v) => v.is_available && !expectedSet.has(v.slug))) {
  console.log(`  · ${v.slug.padEnd(36)} ${v.name}`)
}
