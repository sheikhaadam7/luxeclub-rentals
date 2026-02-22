-- Add cancellation and date modification columns to bookings table

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_fee           NUMERIC,
  ADD COLUMN IF NOT EXISTS cancellation_refund_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS stripe_refund_id           TEXT,
  ADD COLUMN IF NOT EXISTS modification_requested_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS modification_requested_start TEXT,
  ADD COLUMN IF NOT EXISTS modification_requested_end   TEXT,
  ADD COLUMN IF NOT EXISTS modification_status        TEXT;

-- Constrain modification_status to valid values
ALTER TABLE bookings
  ADD CONSTRAINT bookings_modification_status_check
  CHECK (modification_status IS NULL OR modification_status IN ('pending', 'approved', 'rejected'));
