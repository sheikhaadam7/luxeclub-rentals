ALTER TABLE bookings ADD COLUMN IF NOT EXISTS nowpayments_invoice_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS nowpayments_payment_id TEXT;
