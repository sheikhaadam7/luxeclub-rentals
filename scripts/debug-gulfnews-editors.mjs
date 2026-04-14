/**
 * Debug: pull Gulf News editors directly from Supabase to see what's actually
 * in the DB vs. what the UI is showing.
 *
 * Run: node scripts/debug-gulfnews-editors.mjs
 */

import { readFileSync } from 'node:fs'

function loadEnv() {
  const env = {}
  for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY

async function get(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  return res.json()
}

const domains = await get('outreach_domains?domain=eq.gulfnews.com&select=id,domain,outlet_name')
if (!domains.length) {
  console.log('No gulfnews.com domain row found.')
  process.exit(0)
}
const d = domains[0]
console.log('Domain row:', d)

const editors = await get(
  `outreach_editors?domain_id=eq.${d.id}&select=id,email,first_name,last_name,position,relevance_score,topical_score,combined_score,created_at&order=created_at.desc`
)
console.log(`\nEditors for ${d.domain}: ${editors.length}`)
for (const e of editors) {
  const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || '(no name)'
  console.log(`  - ${name} <${e.email}> :: pos="${e.position}" match=${e.relevance_score} cov=${e.topical_score} overall=${e.combined_score} :: ${e.id}`)
}
