-- Add a multi-value categories column to vehicles so a car can belong to several
-- catalogue types at once (e.g. Bentley Bentayga is both SUV and Family).
--
-- The existing singular `category` TEXT column stays in place — the scraper at
-- scripts/scraper/upsert-db.ts still writes to it. The UI stops reading it after
-- this migration; backfill of `categories` happens in
-- scripts/backfill-vehicle-categories.py to preserve the legacy name-regex
-- inference (zero-regression).

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

CREATE INDEX IF NOT EXISTS vehicles_categories_gin_idx
  ON public.vehicles USING GIN (categories);
