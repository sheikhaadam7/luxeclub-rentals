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

// ============================================================
// Fleet Management Types
// ============================================================

export interface AvailabilityBlock {
  id: string
  vehicle_id: string
  start_date: string
  end_date: string
  reason: string | null
}

export interface FleetVehicle {
  id: string
  slug: string
  name: string
  category: string | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
  is_available: boolean
  is_active: boolean
  override_notes: string | null
  scraped_at: string | null
  gps_device_id: string | null
  deposit_amount: number | null
  availability_blocks: AvailabilityBlock[]
}

export interface FleetData {
  vehicles: FleetVehicle[]
  lastRun: ScraperRun | null
  isStale: boolean
}

// ============================================================
// Fleet Actions
// ============================================================

/**
 * Returns all vehicles with full fields plus availability blocks per vehicle.
 * Also returns last scraper run and staleness flag.
 */
export async function getFleetData(): Promise<FleetData | { error: string }> {
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

  const { data: vehicles, error: vehiclesError } = await admin
    .from('vehicles')
    .select(
      'id, slug, name, category, daily_rate, weekly_rate, monthly_rate, is_available, is_active, override_notes, scraped_at, gps_device_id, deposit_amount'
    )
    .order('name')

  if (vehiclesError) {
    console.error('getFleetData vehicles error:', vehiclesError)
    return { error: vehiclesError.message }
  }

  const { data: blocks, error: blocksError } = await admin
    .from('vehicle_availability_blocks')
    .select('id, vehicle_id, start_date, end_date, reason')
    .order('start_date', { ascending: true })

  if (blocksError) {
    console.error('getFleetData blocks error:', blocksError)
    return { error: blocksError.message }
  }

  const blocksByVehicle: Record<string, AvailabilityBlock[]> = {}
  for (const block of blocks ?? []) {
    if (!blocksByVehicle[block.vehicle_id]) {
      blocksByVehicle[block.vehicle_id] = []
    }
    blocksByVehicle[block.vehicle_id].push(block as AvailabilityBlock)
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const isStale = !lastRun || new Date(lastRun.ran_at) < twentyFourHoursAgo

  return {
    vehicles: (vehicles ?? []).map((v) => ({
      ...v,
      availability_blocks: blocksByVehicle[v.id] ?? [],
    })) as FleetVehicle[],
    lastRun: lastRun ?? null,
    isStale,
  }
}

/**
 * Add a new vehicle to the fleet.
 * Validates slug format (lowercase letters, numbers, hyphens only).
 */
export async function addVehicle(data: {
  name: string
  slug: string
  category: string
  daily_rate: number
  description?: string
}): Promise<{ error: string | null; vehicleId?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  // Validate slug: lowercase letters, numbers, and hyphens only
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugPattern.test(data.slug)) {
    return {
      error:
        'Invalid slug format. Use lowercase letters, numbers, and hyphens only (e.g. "ferrari-488").',
    }
  }

  const admin = createAdminClient()
  const { data: vehicle, error } = await admin
    .from('vehicles')
    .insert({
      name: data.name,
      slug: data.slug,
      category: data.category,
      daily_rate: data.daily_rate,
      description: data.description ?? null,
      is_available: true,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('addVehicle error:', error)
    return { error: error.message }
  }

  return { error: null, vehicleId: vehicle?.id }
}

/**
 * Update partial vehicle fields.
 * Only updates fields that are explicitly provided (not undefined).
 */
export async function updateVehicle(
  vehicleId: string,
  data: {
    name?: string
    slug?: string
    category?: string
    daily_rate?: number
    weekly_rate?: number | null
    monthly_rate?: number | null
    deposit_amount?: number | null
    gps_device_id?: string | null
    description?: string | null
    override_notes?: string | null
  }
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  // Validate slug if provided
  if (data.slug !== undefined) {
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugPattern.test(data.slug)) {
      return {
        error:
          'Invalid slug format. Use lowercase letters, numbers, and hyphens only.',
      }
    }
  }

  // Build update payload with only provided fields
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.slug !== undefined) updatePayload.slug = data.slug
  if (data.category !== undefined) updatePayload.category = data.category
  if (data.daily_rate !== undefined) updatePayload.daily_rate = data.daily_rate
  if (data.weekly_rate !== undefined) updatePayload.weekly_rate = data.weekly_rate
  if (data.monthly_rate !== undefined) updatePayload.monthly_rate = data.monthly_rate
  if (data.deposit_amount !== undefined) updatePayload.deposit_amount = data.deposit_amount
  if (data.gps_device_id !== undefined) updatePayload.gps_device_id = data.gps_device_id
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.override_notes !== undefined) updatePayload.override_notes = data.override_notes

  const admin = createAdminClient()
  const { error } = await admin
    .from('vehicles')
    .update(updatePayload)
    .eq('id', vehicleId)

  if (error) {
    console.error('updateVehicle error:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Toggle a vehicle's is_active flag.
 * is_active = false means permanently deactivated by admin (removed from catalogue).
 * Distinct from is_available which is scraper/override managed.
 */
export async function toggleVehicleActive(
  vehicleId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('vehicles')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId)

  if (error) {
    console.error('toggleVehicleActive error:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Add an availability block for a vehicle.
 * Blocks a date range from being bookable regardless of existing bookings.
 * Validates that startDate <= endDate.
 */
export async function addAvailabilityBlock(
  vehicleId: string,
  startDate: string,
  endDate: string,
  reason?: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  if (new Date(startDate) > new Date(endDate)) {
    return { error: 'Start date must be on or before end date.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('vehicle_availability_blocks')
    .insert({
      vehicle_id: vehicleId,
      start_date: startDate,
      end_date: endDate,
      reason: reason ?? null,
    })

  if (error) {
    console.error('addAvailabilityBlock error:', error)
    return { error: error.message }
  }

  return { error: null }
}

/**
 * Remove an availability block by id.
 */
export async function removeAvailabilityBlock(
  blockId: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('vehicle_availability_blocks')
    .delete()
    .eq('id', blockId)

  if (error) {
    console.error('removeAvailabilityBlock error:', error)
    return { error: error.message }
  }

  return { error: null }
}

// ============================================================
// Booking Management Types
// ============================================================

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'car_on_the_way'
  | 'car_delivered'
  | 'completed'
  | 'cancelled'

export interface AdminBooking {
  id: string
  vehicle_id: string
  user_id: string
  start_date: string
  end_date: string
  duration_type: string
  status: BookingStatus
  payment_status: string
  payment_method: string | null
  total_due: number | null
  pickup_method: string
  delivery_address: string | null
  created_at: string
  vehicle_name: string | null
  vehicle_slug: string | null
  user_email: string | null
}

// ============================================================
// Booking Actions
// ============================================================

/**
 * Returns all bookings across all customers with vehicle name and user email.
 * Ordered by created_at DESC.
 */
export async function getAllBookings(): Promise<
  AdminBooking[] | { error: string }
> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select(
      'id, vehicle_id, user_id, start_date, end_date, duration_type, status, payment_status, payment_method, total_due, pickup_method, delivery_address, created_at, vehicles(name, slug)'
    )
    .order('created_at', { ascending: false })

  if (bookingsError) {
    console.error('getAllBookings error:', bookingsError)
    return { error: bookingsError.message }
  }

  // Fetch user emails separately (profiles table has RLS but admin client bypasses it)
  const userIds = [...new Set((bookings ?? []).map((b) => b.user_id))]
  let emailMap: Record<string, string> = {}

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, email')
      .in('id', userIds)

    if (!profilesError && profiles) {
      for (const p of profiles) {
        if (p.email) emailMap[p.id] = p.email
      }
    }
  }

  const result: AdminBooking[] = (bookings ?? []).map((b) => {
    const rawVehicle = b.vehicles
    const vehicleData = Array.isArray(rawVehicle)
      ? (rawVehicle[0] as { name: string; slug: string } | undefined) ?? null
      : (rawVehicle as { name: string; slug: string } | null)
    return {
      id: b.id,
      vehicle_id: b.vehicle_id,
      user_id: b.user_id,
      start_date: b.start_date,
      end_date: b.end_date,
      duration_type: b.duration_type,
      status: b.status as BookingStatus,
      payment_status: b.payment_status,
      payment_method: b.payment_method,
      total_due: b.total_due,
      pickup_method: b.pickup_method,
      delivery_address: b.delivery_address,
      created_at: b.created_at,
      vehicle_name: vehicleData?.name ?? null,
      vehicle_slug: vehicleData?.slug ?? null,
      user_email: emailMap[b.user_id] ?? null,
    }
  })

  return result
}

/**
 * Update booking status. Accepts one of the 6 valid statuses.
 * Triggers Supabase Realtime automatically (bookings table is in publication).
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const validStatuses: BookingStatus[] = [
    'pending',
    'confirmed',
    'car_on_the_way',
    'car_delivered',
    'completed',
    'cancelled',
  ]
  if (!validStatuses.includes(status)) {
    return { error: `Invalid status: ${status}` }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('bookings')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (error) {
    console.error('updateBookingStatus error:', error)
    return { error: error.message }
  }

  return { error: null }
}

// ============================================================
// KYC Review Types
// ============================================================

export interface PendingKYCEntry {
  userId: string
  email: string
  kycStatus: string
  kycSessionId: string | null
  createdAt: string
}

// ============================================================
// KYC Actions
// ============================================================

/**
 * Returns all profiles with pending or submitted KYC status.
 * Fetches user emails via auth.admin.getUserById for each profile.
 * Ordered by created_at ASC (FIFO queue — oldest first).
 */
export async function getPendingKYC(): Promise<
  PendingKYCEntry[] | { error: string }
> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, kyc_status, kyc_session_id, created_at')
    .in('kyc_status', ['submitted', 'pending'])
    .order('created_at', { ascending: true })

  if (profilesError) {
    console.error('getPendingKYC profiles error:', profilesError)
    return { error: profilesError.message }
  }

  if (!profiles || profiles.length === 0) {
    return []
  }

  // Fetch user emails via auth admin API
  const results: PendingKYCEntry[] = []
  for (const profile of profiles) {
    let email = ''
    try {
      const { data: userData, error: userError } =
        await admin.auth.admin.getUserById(profile.id)
      if (!userError && userData?.user?.email) {
        email = userData.user.email
      }
    } catch {
      // Non-fatal: email lookup failure should not block the queue
      console.warn('getPendingKYC: could not fetch email for', profile.id)
    }
    results.push({
      userId: profile.id,
      email,
      kycStatus: profile.kyc_status ?? 'pending',
      kycSessionId: profile.kyc_session_id ?? null,
      createdAt: profile.created_at,
    })
  }

  return results
}

/**
 * Approve or reject a KYC verification.
 * Uses optimistic locking — only updates profiles currently in submitted/pending state.
 * Returns an error if the profile was already processed.
 */
export async function reviewKYC(
  userId: string,
  decision: 'verified' | 'rejected'
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profiles')
    .update({
      kyc_status: decision,
      kyc_verified_at:
        decision === 'verified' ? new Date().toISOString() : null,
    })
    .eq('id', userId)
    .in('kyc_status', ['submitted', 'pending'])
    .select('id')

  if (error) {
    console.error('reviewKYC error:', error)
    return { error: error.message }
  }

  if (!data?.length) {
    return { error: 'Already processed or not in pending state' }
  }

  return { error: null }
}

// ============================================================
// Payment Management Types
// ============================================================

export interface PaymentBooking {
  id: string
  vehicle_id: string
  user_id: string
  total_due: number | null
  payment_status: string
  payment_method: string | null
  status: string
  created_at: string
  vehicle_name: string | null
}

// ============================================================
// Payment Actions
// ============================================================

/**
 * Returns all bookings where payment_status is pending_cash or unpaid,
 * or where payment_method is cash or bank_transfer.
 * Ordered by created_at DESC.
 */
export async function getPaymentBookings(): Promise<
  PaymentBooking[] | { error: string }
> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select(
      'id, vehicle_id, user_id, total_due, payment_status, payment_method, status, created_at, vehicles(name)'
    )
    .or(
      "payment_status.in.(pending_cash,unpaid),payment_method.in.(cash,bank_transfer)"
    )
    .order('created_at', { ascending: false })

  if (bookingsError) {
    console.error('getPaymentBookings error:', bookingsError)
    return { error: bookingsError.message }
  }

  return (bookings ?? []).map((b) => {
    const rawVehicle = b.vehicles
    const vehicleData = Array.isArray(rawVehicle)
      ? (rawVehicle[0] as { name: string } | undefined) ?? null
      : (rawVehicle as { name: string } | null)
    return {
      id: b.id,
      vehicle_id: b.vehicle_id,
      user_id: b.user_id,
      total_due: b.total_due,
      payment_status: b.payment_status,
      payment_method: b.payment_method,
      status: b.status,
      created_at: b.created_at,
      vehicle_name: vehicleData?.name ?? null,
    }
  })
}

/**
 * Confirm a manual (cash or bank transfer) payment for a booking.
 * Uses optimistic locking — only updates bookings currently in pending_cash state.
 */
export async function confirmManualPayment(
  bookingId: string,
  method: 'cash' | 'bank_transfer'
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('bookings')
    .update({
      payment_status: 'paid',
      payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('payment_status', 'pending_cash')
    .select('id')

  if (error) {
    console.error('confirmManualPayment error:', error)
    return { error: error.message }
  }

  if (!data?.length) {
    return { error: 'Booking not in pending cash state' }
  }

  return { error: null }
}

// ============================================================
// Analytics Types
// ============================================================

export interface AnalyticsSummary {
  thisMonth: {
    bookings: number
    revenue: number
  }
  allTime: {
    bookings: number
    revenue: number
  }
  fleet: {
    total: number
    utilized: number
    utilizationRate: number
  }
}

// ============================================================
// Analytics Actions
// ============================================================

/**
 * Returns analytics summary: this month's bookings + revenue, all-time totals,
 * and current fleet utilization rate.
 * Uses lightweight queries — only selects required columns.
 */
export async function getAnalyticsSummary(): Promise<
  AnalyticsSummary | { error: string }
> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  // This month's bookings and revenue
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthlyStats, error: monthlyError } = await admin
    .from('bookings')
    .select('total_due, status')
    .gte('created_at', startOfMonth.toISOString())
    .in('status', ['confirmed', 'car_on_the_way', 'car_delivered', 'completed'])

  if (monthlyError) {
    console.error('getAnalyticsSummary monthly error:', monthlyError)
    return { error: monthlyError.message }
  }

  const thisMonthBookings = monthlyStats?.length ?? 0
  const thisMonthRevenue =
    monthlyStats?.reduce((sum, b) => sum + (b.total_due ?? 0), 0) ?? 0

  // All-time bookings and revenue
  const { data: allTimeStats, error: allTimeError } = await admin
    .from('bookings')
    .select('total_due, status')
    .in('status', ['confirmed', 'car_on_the_way', 'car_delivered', 'completed'])

  if (allTimeError) {
    console.error('getAnalyticsSummary all-time error:', allTimeError)
    return { error: allTimeError.message }
  }

  const allTimeBookings = allTimeStats?.length ?? 0
  const allTimeRevenue =
    allTimeStats?.reduce((sum, b) => sum + (b.total_due ?? 0), 0) ?? 0

  // Fleet utilization: vehicles with active bookings today
  const today = new Date().toISOString().split('T')[0]

  const { data: activeBookings, error: activeError } = await admin
    .from('bookings')
    .select('vehicle_id')
    .lte('start_date', today)
    .gte('end_date', today)
    .in('status', ['confirmed', 'car_on_the_way', 'car_delivered'])

  if (activeError) {
    console.error('getAnalyticsSummary active bookings error:', activeError)
    return { error: activeError.message }
  }

  const { count: totalVehicles, error: vehiclesError } = await admin
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_available', true)

  if (vehiclesError) {
    console.error('getAnalyticsSummary vehicles error:', vehiclesError)
    return { error: vehiclesError.message }
  }

  const utilizedCount = new Set(
    (activeBookings ?? []).map((b) => b.vehicle_id)
  ).size
  const total = totalVehicles ?? 0

  return {
    thisMonth: {
      bookings: thisMonthBookings,
      revenue: thisMonthRevenue,
    },
    allTime: {
      bookings: allTimeBookings,
      revenue: allTimeRevenue,
    },
    fleet: {
      total,
      utilized: utilizedCount,
      utilizationRate: total > 0 ? Math.round((utilizedCount / total) * 100) : 0,
    },
  }
}
