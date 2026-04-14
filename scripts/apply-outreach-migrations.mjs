/**
 * One-shot migration applier for the outreach feature.
 * Reads SUPABASE_DB_PASSWORD from env, connects to Supabase Postgres,
 * applies both outreach migrations.
 *
 * Run: SUPABASE_DB_PASSWORD="..." node scripts/apply-outreach-migrations.mjs
 */

import { readFileSync } from 'node:fs'
import pg from 'pg'

const PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD env var required')
  process.exit(1)
}

const PROJECT_REF = 'oezwrobajotfxzmqabvp'

// Try direct connection first
const connectionString = `postgresql://postgres:${encodeURIComponent(PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  console.log('Connecting to Postgres...')
  await client.connect()
  console.log('✓ Connected')

  const migrations = [
    'supabase/migrations/20260414000000_outreach_tables.sql',
    'supabase/migrations/20260414010000_outreach_oauth.sql',
  ]

  for (const path of migrations) {
    console.log(`\nApplying ${path}...`)
    const sql = readFileSync(path, 'utf-8')
    try {
      await client.query(sql)
      console.log(`✓ ${path} applied successfully`)
    } catch (err) {
      console.error(`✗ ${path} failed:`, err.message)
      throw err
    }
  }

  // Verify tables exist
  console.log('\nVerifying tables...')
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'outreach_%'
    ORDER BY table_name
  `)
  console.log('Tables created:')
  for (const row of rows) console.log(`  - ${row.table_name}`)

  await client.end()
  console.log('\n✓ All migrations applied successfully.')
}

run().catch((err) => {
  console.error('\nMigration failed:', err.message)
  client.end().catch(() => {})
  process.exit(1)
})
