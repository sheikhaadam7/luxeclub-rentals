-- ============================================================
-- Add 'draft' back to the allowed bookings.status values.
--
-- The createBooking server action (app/actions/bookings.ts) inserts
-- status='draft' as the initial state — booking row exists but the
-- reservation fee hasn't been paid yet. Three other server actions
-- (cancel/modify/reschedule) also check for status='draft' explicitly.
--
-- The phase-4 migration (20260220300000_tracking_admin_phase4.sql)
-- redefined bookings_status_check without 'draft', causing every new
-- booking insert to fail with:
--   "new row for relation 'bookings' violates check constraint
--    'bookings_status_check'"
--
-- This migration adds 'draft' back. Idempotent — safe to run on any
-- environment, including ones where the constraint was already
-- loosened manually.
-- ============================================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'draft',
    'pending',
    'confirmed',
    'car_on_the_way',
    'car_delivered',
    'completed',
    'cancelled'
  ));
