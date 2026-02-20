'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verify the caller is an admin.
 * Returns the user's profile role on success, null on failure.
 */
async function verifyAdmin(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims?.sub) {
    return { error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', claims.sub)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  return { userId: claims.sub }
}

/**
 * Update a vehicle's availability and override notes.
 * Validates admin role before performing any write.
 */
export async function updateVehicleAvailability(
  vehicleId: string,
  isAvailable: boolean,
  overrideNotes: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('vehicles')
    .update({
      is_available: isAvailable,
      override_notes: overrideNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId)

  if (error) {
    console.error('updateVehicleAvailability error:', error)
    return { error: error.message }
  }

  return { error: null }
}

interface ScraperRun {
  id: string
  ran_at: string
  vehicle_count: number | null
  status: string
  error_msg: string | null
}

interface VehicleRow {
  id: string
  slug: string
  name: string
  is_available: boolean
  override_notes: string | null
  scraped_at: string | null
}

interface AdminDashboardData {
  lastRun: ScraperRun | null
  vehicles: VehicleRow[]
  isStale: boolean
}

/**
 * Fetch all data needed for the admin dashboard.
 * Returns last scraper run, all vehicles, and staleness flag.
 */
export async function getAdminDashboardData(): Promise<
  AdminDashboardData | { error: string }
> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: lastRun } = await supabase
    .from('scraper_runs')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(1)
    .single()

  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, slug, name, is_available, override_notes, scraped_at')
    .order('name')

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const isStale =
    !lastRun || new Date(lastRun.ran_at) < twentyFourHoursAgo

  return {
    lastRun: lastRun ?? null,
    vehicles: vehicles ?? [],
    isStale,
  }
}
