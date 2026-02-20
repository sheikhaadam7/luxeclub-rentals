import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { scrapeVehicles } from './scrape-vehicles'
import { uploadImages } from './upload-images'
import { upsertVehicles } from './upsert-db'

async function run() {
  // Validate required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set in environment')
    process.exit(1)
  }
  if (!serviceRoleKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in environment')
    console.error('Get this from: Supabase Dashboard -> Project Settings -> API -> service_role key (secret)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Block non-data resources during scraping for performance.
  // IMPORTANT: Do NOT block 'script' on Framer sites — scripts render the content.
  // NOTE: This blocking only applies to page navigation (scrapeVehicles).
  //       fetch() calls in upload-images.ts use Node.js fetch and are NOT affected.
  await page.route('**/*', (route) => {
    const type = route.request().resourceType()
    if (['stylesheet', 'font', 'media'].includes(type)) {
      route.abort()
    } else {
      route.continue()
    }
  })

  try {
    console.log('=== LuxeClub Scraper ===')
    console.log('Scraping vehicles from luxeclubrentals.com...')
    const vehicles = await scrapeVehicles(page)
    console.log(`Found ${vehicles.length} vehicles`)

    if (vehicles.length === 0) {
      throw new Error('No vehicles found — scraper selectors may be broken or site structure changed')
    }

    console.log('\nUploading images to Supabase Storage...')
    const imageMap = await uploadImages(supabase, vehicles)

    console.log('\nUpserting vehicle records to database...')
    const result = await upsertVehicles(supabase, vehicles, imageMap)

    if (result.error) {
      throw new Error(`DB upsert failed: ${result.error}`)
    }

    console.log(`\nDone: ${result.count} vehicles upserted`)
    console.log('=== Scraper complete ===')
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('\nScraper failed:', errorMsg)

    // Log failure to scraper_runs so we can track it in the dashboard
    try {
      await supabase.from('scraper_runs').insert({
        status: 'error',
        error_msg: errorMsg,
        vehicle_count: 0,
      })
    } catch (logErr) {
      console.error('Also failed to log error to scraper_runs:', logErr)
    }

    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
