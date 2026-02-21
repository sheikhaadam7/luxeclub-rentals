ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS collection_address text,
  ADD COLUMN IF NOT EXISTS collection_lat double precision,
  ADD COLUMN IF NOT EXISTS collection_lng double precision;
