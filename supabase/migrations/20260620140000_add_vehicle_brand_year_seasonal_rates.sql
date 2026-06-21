-- Add columns for the fleet master spreadsheet workflow:
--   * explicit brand (drives the catalogue brand filter; falls back to the
--     existing name-regex when null)
--   * model year (metadata only for now)
--   * seasonal pricing (winter / summer × daily / weekly — stored only;
--     booking flow still uses default daily_rate)
--   * per-km overage rate (charged when a renter exceeds the site-wide
--     included mileage allowance — 250 km/day, 1,500 km/week,
--     4,500 km/month)
--
-- All nullable. No backfill — UI fallbacks keep the existing 48 cars working
-- without intervention.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS year INT,
  ADD COLUMN IF NOT EXISTS winter_daily_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS summer_daily_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS winter_weekly_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS summer_weekly_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS overage_rate_per_km NUMERIC(10, 2);
