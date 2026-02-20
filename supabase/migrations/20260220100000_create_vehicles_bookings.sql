-- Phase 02: Inventory Catalogue
-- Creates vehicles, bookings, and scraper_runs tables with RLS
-- Also adds role column to profiles for admin gating

-- Add role column to existing profiles table (for admin gating)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- ============================================================
-- vehicles table
-- ============================================================
CREATE TABLE vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT,
  daily_rate        NUMERIC(10, 2),
  weekly_rate       NUMERIC(10, 2),
  monthly_rate      NUMERIC(10, 2),
  specs             JSONB,
  image_urls        TEXT[],
  primary_image_url TEXT,
  is_available      BOOLEAN NOT NULL DEFAULT true,
  override_notes    TEXT,
  scraped_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT TO authenticated USING (true);

-- ============================================================
-- bookings table
-- Uses DATE columns (not TIMESTAMPTZ) to avoid timezone issues
-- ============================================================
CREATE TABLE bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- RPC: get_blocked_dates
-- Returns only the date ranges (not full booking rows) for a vehicle
-- SECURITY DEFINER so it can bypass RLS and return blocked dates
-- to any authenticated user without exposing other booking fields
-- ============================================================
CREATE OR REPLACE FUNCTION get_blocked_dates(p_vehicle_id UUID)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT b.start_date, b.end_date
  FROM bookings b
  WHERE b.vehicle_id = p_vehicle_id
    AND b.status IN ('pending', 'confirmed')
    AND b.end_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- scraper_runs table
-- Records each scraper execution for monitoring
-- ============================================================
CREATE TABLE scraper_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vehicle_count INT,
  status        TEXT CHECK (status IN ('success', 'error')),
  error_msg     TEXT
);

ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scraper runs"
  ON scraper_runs FOR SELECT TO authenticated USING (true);
