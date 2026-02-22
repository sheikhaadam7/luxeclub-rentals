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
  primary_image_url: string | null
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
      'id, slug, name, category, daily_rate, weekly_rate, monthly_rate, is_available, is_active, override_notes, scraped_at, gps_device_id, deposit_amount, primary_image_url'
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
  updated_at: string | null
  vehicle_name: string | null
  vehicle_slug: string | null
  user_email: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  rental_subtotal: number | null
  delivery_fee: number | null
  return_fee: number | null
  no_deposit_surcharge: number | null
  deposit_choice: string | null
  deposit_amount: number | null
  deposit_status: string | null
  return_method: string | null
  collection_address: string | null
  start_time: string | null
  end_time: string | null
  stripe_deposit_pi_id: string | null
  modification_status: string | null
  modification_requested_start: string | null
  modification_requested_end: string | null
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
      'id, vehicle_id, user_id, start_date, end_date, duration_type, status, payment_status, payment_method, total_due, pickup_method, delivery_address, created_at, updated_at, guest_name, guest_email, guest_phone, rental_subtotal, delivery_fee, return_fee, no_deposit_surcharge, deposit_choice, deposit_amount, deposit_status, return_method, collection_address, start_time, end_time, stripe_deposit_pi_id, modification_status, modification_requested_start, modification_requested_end, vehicles(name, slug)'
    )
    .order('created_at', { ascending: false })

  if (bookingsError) {
    console.error('getAllBookings error:', bookingsError)
    return { error: bookingsError.message }
  }

  // Fetch user emails separately (profiles table has RLS but admin client bypasses it)
  const userIds = [...new Set((bookings ?? []).filter((b) => b.user_id).map((b) => b.user_id))]
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
      updated_at: b.updated_at ?? null,
      vehicle_name: vehicleData?.name ?? null,
      vehicle_slug: vehicleData?.slug ?? null,
      user_email: b.user_id ? (emailMap[b.user_id] ?? null) : null,
      guest_name: b.guest_name ?? null,
      guest_email: b.guest_email ?? null,
      guest_phone: b.guest_phone ?? null,
      rental_subtotal: b.rental_subtotal ?? null,
      delivery_fee: b.delivery_fee ?? null,
      return_fee: b.return_fee ?? null,
      no_deposit_surcharge: b.no_deposit_surcharge ?? null,
      deposit_choice: b.deposit_choice ?? null,
      deposit_amount: b.deposit_amount ?? null,
      deposit_status: b.deposit_status ?? null,
      return_method: b.return_method ?? null,
      collection_address: b.collection_address ?? null,
      start_time: b.start_time ?? null,
      end_time: b.end_time ?? null,
      stripe_deposit_pi_id: b.stripe_deposit_pi_id ?? null,
      modification_status: b.modification_status ?? null,
      modification_requested_start: b.modification_requested_start ?? null,
      modification_requested_end: b.modification_requested_end ?? null,
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
// Dashboard Overview Types
// ============================================================

export interface DashboardNeedItem {
  id: string
  vehicle_name: string | null
  customer: string | null
  date: string
  status: BookingStatus
}

export interface DashboardOverview {
  activeBookingsToday: number
  pendingActions: number
  revenueThisMonth: number
  fleetUtilization: number
  fleetTotal: number
  fleetUtilized: number
  needsAttention: {
    pendingBookings: DashboardNeedItem[]
    todayDeliveries: DashboardNeedItem[]
    overdueReturns: DashboardNeedItem[]
    pendingCash: DashboardNeedItem[]
  }
  recentBookings: AdminBooking[]
}

// ============================================================
// Dashboard Overview Action
// ============================================================

export async function getDashboardOverview(): Promise<
  DashboardOverview | { error: string }
> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    activeResult,
    pendingResult,
    revenueResult,
    deliveriesResult,
    overdueResult,
    cashResult,
    recentResult,
    fleetCountResult,
  ] = await Promise.all([
    // Active bookings today
    admin
      .from('bookings')
      .select('vehicle_id')
      .lte('start_date', today)
      .gte('end_date', today)
      .in('status', ['confirmed', 'car_on_the_way', 'car_delivered']),
    // Pending bookings
    admin
      .from('bookings')
      .select('id, start_date, status, guest_name, guest_email, vehicles(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    // Revenue this month
    admin
      .from('bookings')
      .select('total_due')
      .gte('created_at', startOfMonth.toISOString())
      .in('status', ['confirmed', 'car_on_the_way', 'car_delivered', 'completed']),
    // Today's deliveries
    admin
      .from('bookings')
      .select('id, start_date, status, guest_name, guest_email, pickup_method, vehicles(name)')
      .eq('start_date', today)
      .eq('pickup_method', 'delivery')
      .in('status', ['confirmed', 'car_on_the_way']),
    // Overdue returns
    admin
      .from('bookings')
      .select('id, end_date, status, guest_name, guest_email, vehicles(name)')
      .lt('end_date', today)
      .in('status', ['confirmed', 'car_on_the_way', 'car_delivered']),
    // Pending cash
    admin
      .from('bookings')
      .select('id, start_date, status, guest_name, guest_email, payment_status, vehicles(name)')
      .eq('payment_status', 'pending_cash')
      .order('created_at', { ascending: false })
      .limit(10),
    // Recent 10 bookings
    admin
      .from('bookings')
      .select(
        'id, vehicle_id, user_id, start_date, end_date, duration_type, status, payment_status, payment_method, total_due, pickup_method, delivery_address, created_at, updated_at, guest_name, guest_email, guest_phone, rental_subtotal, delivery_fee, return_fee, no_deposit_surcharge, deposit_choice, deposit_amount, deposit_status, return_method, collection_address, start_time, end_time, stripe_deposit_pi_id, modification_status, modification_requested_start, modification_requested_end, vehicles(name, slug)'
      )
      .order('created_at', { ascending: false })
      .limit(10),
    // Total active vehicles
    admin
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  const activeVehicleIds = new Set(
    (activeResult.data ?? []).map((b) => b.vehicle_id)
  )

  const revenueThisMonth =
    (revenueResult.data ?? []).reduce((sum, b) => sum + (b.total_due ?? 0), 0)

  const fleetTotal = fleetCountResult.count ?? 0
  const fleetUtilized = activeVehicleIds.size

  function extractVehicleName(row: { vehicles: unknown }): string | null {
    const v = row.vehicles
    if (Array.isArray(v)) return (v[0] as { name: string } | undefined)?.name ?? null
    return (v as { name: string } | null)?.name ?? null
  }

  function extractCustomer(row: { guest_name?: string | null; guest_email?: string | null }): string | null {
    return row.guest_name || row.guest_email || null
  }

  function toNeedItem(
    row: { id: string; status: string; guest_name?: string | null; guest_email?: string | null; vehicles: unknown },
    date: string
  ): DashboardNeedItem {
    return {
      id: row.id,
      vehicle_name: extractVehicleName(row as { vehicles: unknown }),
      customer: extractCustomer(row),
      date,
      status: row.status as BookingStatus,
    }
  }

  const recentBookings: AdminBooking[] = (recentResult.data ?? []).map((b) => {
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
      updated_at: b.updated_at ?? null,
      vehicle_name: vehicleData?.name ?? null,
      vehicle_slug: vehicleData?.slug ?? null,
      user_email: null,
      guest_name: b.guest_name ?? null,
      guest_email: b.guest_email ?? null,
      guest_phone: b.guest_phone ?? null,
      rental_subtotal: b.rental_subtotal ?? null,
      delivery_fee: b.delivery_fee ?? null,
      return_fee: b.return_fee ?? null,
      no_deposit_surcharge: b.no_deposit_surcharge ?? null,
      deposit_choice: b.deposit_choice ?? null,
      deposit_amount: b.deposit_amount ?? null,
      deposit_status: b.deposit_status ?? null,
      return_method: b.return_method ?? null,
      collection_address: b.collection_address ?? null,
      start_time: b.start_time ?? null,
      end_time: b.end_time ?? null,
      stripe_deposit_pi_id: b.stripe_deposit_pi_id ?? null,
      modification_status: b.modification_status ?? null,
      modification_requested_start: b.modification_requested_start ?? null,
      modification_requested_end: b.modification_requested_end ?? null,
    }
  })

  return {
    activeBookingsToday: activeResult.data?.length ?? 0,
    pendingActions: (pendingResult.data ?? []).length,
    revenueThisMonth,
    fleetUtilization: fleetTotal > 0 ? Math.round((fleetUtilized / fleetTotal) * 100) : 0,
    fleetTotal,
    fleetUtilized,
    needsAttention: {
      pendingBookings: (pendingResult.data ?? []).map((b) =>
        toNeedItem(b as never, b.start_date)
      ),
      todayDeliveries: (deliveriesResult.data ?? []).map((b) =>
        toNeedItem(b as never, b.start_date)
      ),
      overdueReturns: (overdueResult.data ?? []).map((b) =>
        toNeedItem(b as never, b.end_date)
      ),
      pendingCash: (cashResult.data ?? []).map((b) =>
        toNeedItem(b as never, b.start_date)
      ),
    },
    recentBookings,
  }
}

// ============================================================
// Enhanced Analytics Types
// ============================================================

export interface EnhancedAnalytics {
  currentRevenue: number
  previousRevenue: number
  currentBookings: number
  previousBookings: number
  avgBookingValue: number
  fleetUtilization: number
  dailyRevenue: { date: string; revenue: number }[]
  topVehicles: { name: string; bookings: number; revenue: number }[]
  statusBreakdown: Record<string, number>
  durationBreakdown: Record<string, number>
}

// ============================================================
// Enhanced Analytics Action
// ============================================================

export async function getEnhancedAnalytics(
  period: '7d' | '30d'
): Promise<EnhancedAnalytics | { error: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const days = period === '7d' ? 7 : 30
  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setDate(currentStart.getDate() - days)
  currentStart.setHours(0, 0, 0, 0)

  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - days)

  const today = now.toISOString().split('T')[0]
  const activeStatuses = ['confirmed', 'car_on_the_way', 'car_delivered', 'completed']

  const [currentResult, previousResult, allBookingsResult, fleetResult, activeResult] = await Promise.all([
    admin
      .from('bookings')
      .select('total_due, vehicle_id, created_at, status, duration_type, vehicles(name)')
      .gte('created_at', currentStart.toISOString())
      .in('status', activeStatuses),
    admin
      .from('bookings')
      .select('total_due')
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', currentStart.toISOString())
      .in('status', activeStatuses),
    admin
      .from('bookings')
      .select('status')
      .not('status', 'eq', 'cancelled'),
    admin
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    admin
      .from('bookings')
      .select('vehicle_id')
      .lte('start_date', today)
      .gte('end_date', today)
      .in('status', ['confirmed', 'car_on_the_way', 'car_delivered']),
  ])

  const currentBookings = currentResult.data ?? []
  const previousBookings = previousResult.data ?? []

  const currentRevenue = currentBookings.reduce((s, b) => s + (b.total_due ?? 0), 0)
  const previousRevenue = previousBookings.reduce((s, b) => s + (b.total_due ?? 0), 0)
  const avgBookingValue = currentBookings.length > 0 ? Math.round(currentRevenue / currentBookings.length) : 0

  // Daily revenue breakdown
  const dailyMap: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart)
    d.setDate(d.getDate() + i)
    dailyMap[d.toISOString().split('T')[0]] = 0
  }
  for (const b of currentBookings) {
    const day = b.created_at.split('T')[0]
    if (day in dailyMap) {
      dailyMap[day] += b.total_due ?? 0
    }
  }
  const dailyRevenue = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }))

  // Top 5 vehicles
  const vehicleStats: Record<string, { name: string; bookings: number; revenue: number }> = {}
  for (const b of currentBookings) {
    const vid = b.vehicle_id
    const rawV = b.vehicles
    const vName = Array.isArray(rawV)
      ? (rawV[0] as { name: string } | undefined)?.name ?? 'Unknown'
      : (rawV as { name: string } | null)?.name ?? 'Unknown'
    if (!vehicleStats[vid]) {
      vehicleStats[vid] = { name: vName, bookings: 0, revenue: 0 }
    }
    vehicleStats[vid].bookings += 1
    vehicleStats[vid].revenue += b.total_due ?? 0
  }
  const topVehicles = Object.values(vehicleStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Status breakdown
  const statusBreakdown: Record<string, number> = {}
  for (const b of allBookingsResult.data ?? []) {
    statusBreakdown[b.status] = (statusBreakdown[b.status] ?? 0) + 1
  }

  // Duration type breakdown
  const durationBreakdown: Record<string, number> = {}
  for (const b of currentBookings) {
    const dt = b.duration_type ?? 'unknown'
    durationBreakdown[dt] = (durationBreakdown[dt] ?? 0) + 1
  }

  // Fleet utilization
  const fleetTotal = fleetResult.count ?? 0
  const utilizedCount = new Set((activeResult.data ?? []).map((b) => b.vehicle_id)).size
  const fleetUtilization = fleetTotal > 0 ? Math.round((utilizedCount / fleetTotal) * 100) : 0

  return {
    currentRevenue,
    previousRevenue,
    currentBookings: currentBookings.length,
    previousBookings: previousBookings.length,
    avgBookingValue,
    fleetUtilization,
    dailyRevenue,
    topVehicles,
    statusBreakdown,
    durationBreakdown,
  }
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
// ============================================================
// Vehicle Location Types
// ============================================================

export interface VehicleLocation {
  id: string
  name: string
  slug: string
  lat: number | null
  lng: number | null
  speed_kmh: number | null
  heading: number | null
  recorded_at: string | null
  location_updated_at: string | null
}

// ============================================================
// Vehicle Location Actions
// ============================================================

/**
 * Fetch all active vehicles joined with their current location from vehicle_locations.
 * Returns vehicles regardless of whether a location row exists.
 */
export async function getVehicleLocations(): Promise<
  VehicleLocation[] | { error: string }
> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { data: vehicles, error: vehiclesError } = await admin
    .from('vehicles')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  if (vehiclesError) {
    console.error('getVehicleLocations vehicles error:', vehiclesError)
    return { error: vehiclesError.message }
  }

  if (!vehicles || vehicles.length === 0) {
    return []
  }

  const vehicleIds = vehicles.map((v) => v.id)
  const { data: locations, error: locationsError } = await admin
    .from('vehicle_locations')
    .select('vehicle_id, lat, lng, speed_kmh, heading, recorded_at, updated_at')
    .in('vehicle_id', vehicleIds)

  if (locationsError) {
    console.error('getVehicleLocations locations error:', locationsError)
    return { error: locationsError.message }
  }

  const locationMap: Record<string, (typeof locations)[number]> = {}
  for (const loc of locations ?? []) {
    locationMap[loc.vehicle_id] = loc
  }

  return vehicles.map((v) => {
    const loc = locationMap[v.id]
    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      speed_kmh: loc?.speed_kmh != null ? Number(loc.speed_kmh) : null,
      heading: loc?.heading != null ? Number(loc.heading) : null,
      recorded_at: loc?.recorded_at ?? null,
      location_updated_at: loc?.updated_at ?? null,
    }
  })
}

/**
 * Upsert a vehicle's location in vehicle_locations.
 * Used by the admin Locations tab to manually set GPS coordinates.
 */
export async function updateVehicleLocation(
  vehicleId: string,
  lat: number,
  lng: number
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  if (lat < -90 || lat > 90) {
    return { error: 'Latitude must be between -90 and 90.' }
  }
  if (lng < -180 || lng > 180) {
    return { error: 'Longitude must be between -180 and 180.' }
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await admin
    .from('vehicle_locations')
    .upsert(
      {
        vehicle_id: vehicleId,
        lat,
        lng,
        speed_kmh: null,
        heading: null,
        recorded_at: now,
        updated_at: now,
      },
      { onConflict: 'vehicle_id' }
    )

  if (error) {
    console.error('updateVehicleLocation error:', error)
    return { error: error.message }
  }

  return { error: null }
}

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

// ============================================================
// Modification Request Actions
// ============================================================

/**
 * Approve a customer's date modification request.
 * Copies the requested dates to the booking's start_date / end_date,
 * sets modification_status = 'approved'.
 */
export async function approveModificationRequest(
  bookingId: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { data: booking, error: fetchError } = await admin
    .from('bookings')
    .select('modification_requested_start, modification_requested_end, modification_status')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: fetchError?.message ?? 'Booking not found' }
  }

  if (booking.modification_status !== 'pending') {
    return { error: 'No pending modification request for this booking' }
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      start_date: booking.modification_requested_start,
      end_date: booking.modification_requested_end,
      modification_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('approveModificationRequest error:', updateError)
    return { error: updateError.message }
  }

  return { error: null }
}

/**
 * Reject a customer's date modification request.
 * Sets modification_status = 'rejected'.
 */
export async function rejectModificationRequest(
  bookingId: string
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      modification_status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('modification_status', 'pending')

  if (updateError) {
    console.error('rejectModificationRequest error:', updateError)
    return { error: updateError.message }
  }

  return { error: null }
}
