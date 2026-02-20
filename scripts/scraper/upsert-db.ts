import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScrapedVehicle } from './scrape-vehicles'

/**
 * Upserts vehicle records to the vehicles table idempotently.
 * Uses ON CONFLICT on slug so re-runs update existing records
 * (updating scraped_at timestamp for staleness tracking).
 *
 * Also inserts a row into scraper_runs logging the run outcome.
 */
export async function upsertVehicles(
  supabase: SupabaseClient,
  vehicles: ScrapedVehicle[],
  imageMap: Map<string, string[]>,
): Promise<{ count: number; error: string | null }> {
  const now = new Date().toISOString()

  // Build DB rows: merge scraped data with storage URLs from imageMap
  const rows = vehicles.map((v) => {
    const storageUrls = imageMap.get(v.slug) ?? []
    // Prefer storage URLs; fall back to original scraped URLs if upload failed
    const image_urls = storageUrls.length > 0 ? storageUrls : v.image_urls
    const primary_image_url = image_urls[0] ?? null

    return {
      slug: v.slug,
      name: v.name,
      description: v.description,
      category: v.category,
      daily_rate: v.daily_rate,
      weekly_rate: v.weekly_rate,
      monthly_rate: v.monthly_rate,
      specs: v.specs,
      image_urls,
      primary_image_url,
      scraped_at: now,
      updated_at: now,
    }
  })

  console.log(`  Upserting ${rows.length} vehicles to database...`)

  const { error: upsertError } = await supabase
    .from('vehicles')
    .upsert(rows, {
      onConflict: 'slug',
      ignoreDuplicates: false, // Update all fields on re-run
    })

  if (upsertError) {
    // Log failed run to scraper_runs
    await supabase.from('scraper_runs').insert({
      status: 'error',
      error_msg: upsertError.message,
      vehicle_count: 0,
      ran_at: now,
    })
    return { count: 0, error: upsertError.message }
  }

  // Log successful run to scraper_runs
  const { error: logError } = await supabase.from('scraper_runs').insert({
    status: 'success',
    vehicle_count: rows.length,
    ran_at: now,
  })

  if (logError) {
    console.warn(`  WARNING: Failed to log scraper run: ${logError.message}`)
  }

  return { count: rows.length, error: null }
}
