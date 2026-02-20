-- Phase 03: Booking, Identity, Payment
-- Extends bookings and vehicles tables with all pricing/payment/delivery/KYC fields
-- Creates stripe_webhook_events table for idempotent webhook processing
-- Adds KYC columns to profiles
-- Adds RLS policies for booking mutations

-- ============================================================
-- vehicles: add per-vehicle deposit amount
-- ============================================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2);

-- ============================================================
-- bookings: extend with all Phase 3 fields
-- ============================================================

-- Duration and timing
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_type TEXT
  CHECK (duration_type IN ('daily', 'weekly', 'monthly'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME;

-- Delivery / pickup
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_method TEXT
  CHECK (pickup_method IN ('delivery', 'self_pickup'))
  DEFAULT 'self_pickup';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_method TEXT
  CHECK (return_method IN ('collection', 'self_dropoff'))
  DEFAULT 'self_dropoff';

-- Deposit choice
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_choice TEXT
  CHECK (deposit_choice IN ('deposit', 'no_deposit'))
  DEFAULT 'deposit';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2);

-- Pricing breakdown
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rental_subtotal NUMERIC(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_deposit_surcharge NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_due NUMERIC(10, 2);

-- Payment
-- NOTE: payment_status MUST include 'pending_cash' — Plan 04's createBooking sets this for cash bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IN ('card', 'apple_pay', 'google_pay', 'cash'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT
  DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded', 'pending_cash'));

-- Stripe payment intent IDs
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_rental_pi_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_deposit_pi_id TEXT;

-- Deposit lifecycle
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT
  DEFAULT 'none'
  CHECK (deposit_status IN ('none', 'held', 'captured', 'voided'));

-- Timestamps
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- profiles: add KYC columns
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT
  DEFAULT 'none'
  CHECK (kyc_status IN ('none', 'submitted', 'pending', 'verified', 'rejected'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_provider TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_session_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

-- ============================================================
-- stripe_webhook_events: idempotent webhook processing
-- ============================================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS policies for booking mutations
-- ============================================================

-- Admin can manage all bookings
CREATE POLICY "Admin can manage all bookings"
  ON bookings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Users can insert their own bookings
CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Enable real-time for bookings (for future live status updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
