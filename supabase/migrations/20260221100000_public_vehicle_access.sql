-- Allow anonymous (unauthenticated) users to view vehicles
-- so the catalogue and vehicle detail pages work without login
CREATE POLICY "Anyone can view vehicles"
  ON vehicles FOR SELECT TO anon USING (true);

-- Allow anonymous users to call get_blocked_dates
-- so the availability calendar renders on the public detail page
GRANT EXECUTE ON FUNCTION get_blocked_dates(UUID) TO anon;
