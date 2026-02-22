-- Add end_time (dropoff time) column to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS end_time TEXT;
