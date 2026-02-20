import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

/**
 * GPS Hardware Ingest Endpoint
 *
 * Accepts POST requests from GPS tracker devices installed in vehicles.
 * Validates a shared secret header, looks up the vehicle by device ID,
 * and upserts the current location into vehicle_locations.
 *
 * The upsert-on-primary-key strategy keeps only the latest position per
 * vehicle (no unbounded history growth). Because the row already exists
 * after the first write, subsequent upserts trigger a Supabase Realtime
 * UPDATE event — client hooks must subscribe to event: 'UPDATE'.
 *
 * Authentication: x-gps-secret header validated against GPS_INGEST_SECRET env var.
 * Never trust device-provided vehicle IDs — always look up by gps_device_id.
 */

const LocationSchema = z.object({
  /** GPS tracker's unique hardware ID — maps to vehicles.gps_device_id */
  device_id: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed_kmh: z.number().optional(),
  heading: z.number().optional(),
  /** ISO 8601 timestamp from device (fallback: server time) */
  timestamp: z.string().optional(),
})

export async function POST(req: NextRequest) {
  // ── 1. Authenticate via shared secret header ───────────────────────────────
  const secret = req.headers.get('x-gps-secret')
  if (!secret || secret !== process.env.GPS_INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse JSON body ─────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── 3. Validate payload with Zod ──────────────────────────────────────────
  const result = LocationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: result.error.flatten() },
      { status: 422 }
    )
  }

  const { device_id, lat, lng, speed_kmh, heading, timestamp } = result.data

  // ── 4. Look up vehicle by GPS device ID ───────────────────────────────────
  // Admin client bypasses RLS — required because this is a device-to-server
  // request with no user session.
  const admin = createAdminClient()

  const { data: vehicle, error: vehicleError } = await admin
    .from('vehicles')
    .select('id')
    .eq('gps_device_id', device_id)
    .single()

  if (vehicleError || !vehicle) {
    // Return 200 even for unknown devices to prevent hardware retry loops.
    // GPS devices typically retry on 4xx/5xx — a 200 stops the retry cycle.
    console.warn('[GPS] Unknown device_id:', device_id)
    return NextResponse.json({ ok: true, warning: 'Unknown device' })
  }

  // ── 5. Upsert current location ────────────────────────────────────────────
  // onConflict: 'vehicle_id' — vehicle_id is the PRIMARY KEY of vehicle_locations.
  // This overwrites the existing row in place, triggering a Realtime UPDATE event
  // (not INSERT) because the row already exists after the first write.
  const { error: upsertError } = await admin
    .from('vehicle_locations')
    .upsert(
      {
        vehicle_id: vehicle.id,
        lat,
        lng,
        speed_kmh: speed_kmh ?? null,
        heading: heading ?? null,
        recorded_at: timestamp
          ? new Date(timestamp).toISOString()
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'vehicle_id',
      }
    )

  if (upsertError) {
    console.error('[GPS] Upsert error:', upsertError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
