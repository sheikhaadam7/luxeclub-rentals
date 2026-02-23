-- Add card-on-file columns to bookings for cash booking guarantees
-- stripe_setup_intent_id: tracks the SetupIntent used to save the card
-- stripe_payment_method_id: the saved card for future off-session charges (cancellation/no-show)

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_setup_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
