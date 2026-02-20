-- Phase 04: Tracking + Admin
-- Extends booking status CHECK with tracking states, adds vehicle_locations table,
-- GPS device mapping on vehicles, is_active flag, and vehicle_availability_blocks.
-- Enables Supabase Realtime on vehicle_locations.

-- ============================================================
-- 1. Extend booking status CHECK constraint
--    Current values: pending, confirmed, completed, cancelled
--    Phase 4 adds: car_on_the_way, car_delivered
-- ============================================================
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'car_on_the_way',   -- Car dispatched from office, en route to customer
    'car_delivered',    -- Car handed over to customer, rental active
    'completed',
    'cancelled'
  ));

-- ============================================================
-- 2. Add GPS device ID to vehicles
--    Maps physical GPS tracker hardware device to a vehicle row.
--    Used by the GPS ingest API route to look up which vehicle
--    a tracker ping belongs to.
-- ============================================================
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS gps_device_id TEXT UNIQUE;

-- ============================================================
-- 3. Add is_active to vehicles
--    Admin-managed deactivation flag (distinct from is_available
--    which is scraper/override managed).
--    is_active = false permanently removes vehicle from catalogue.
--    is_available = false temporarily hides it (scraper + admin override).
-- ============================================================
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 4. Create vehicle_locations table
--    Upsert-only model: one row per vehicle = current location only.
--    No history retained (prevents unbounded growth at 30s intervals).
--    PRIMARY KEY on vehicle_id enforces the one-row-per-vehicle invariant.
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_locations (
  vehicle_id   UUID PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  speed_kmh    NUMERIC(6, 2),
  heading      NUMERIC(5, 2),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on vehicle_locations
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read vehicle locations (needed for tracking page)
-- GPS ingest API uses the admin client which bypasses RLS — no INSERT/UPDATE
-- policy needed for regular users.
CREATE POLICY "Authenticated users can view vehicle locations"
  ON vehicle_locations FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 5. Enable Realtime on vehicle_locations
--    Required for the useVehicleLocation hook's postgres_changes
--    subscription to receive live GPS updates.
--    Note: bookings table was already added to supabase_realtime
--    in the Phase 3 migration (20260220200000_extend_bookings_phase3.sql).
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_locations;

-- ============================================================
-- 6. Create vehicle_availability_blocks table
--    Admin-managed date ranges when a vehicle is unavailable
--    regardless of bookings. Used to block vehicles for maintenance,
--    events, or other admin-controlled downtime.
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_availability_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on vehicle_availability_blocks
ALTER TABLE vehicle_availability_blocks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view availability blocks (needed for booking calendar)
CREATE POLICY "Authenticated users can view availability blocks"
  ON vehicle_availability_blocks FOR SELECT TO authenticated USING (true);

-- Only service_role (admin client) can insert/update/delete availability blocks.
-- Admin actions use createAdminClient() which bypasses RLS entirely.
-- These policies are explicit guards in case RLS is queried with a user session.
CREATE POLICY "Service role can manage availability blocks"
  ON vehicle_availability_blocks FOR ALL TO service_role USING (true) WITH CHECK (true);
