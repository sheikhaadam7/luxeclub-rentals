-- Add 'crypto' to the payment_method check constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('card', 'apple_pay', 'google_pay', 'cash', 'crypto'));

-- Add 'pending_crypto' to the payment_status check constraint if it exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'pending_cash', 'pending_crypto', 'refunded'));
