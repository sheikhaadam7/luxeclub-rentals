-- Make user_id nullable for guest bookings
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;

-- Add guest contact fields
ALTER TABLE bookings ADD COLUMN guest_name TEXT;
ALTER TABLE bookings ADD COLUMN guest_email TEXT;
ALTER TABLE bookings ADD COLUMN guest_phone TEXT;
