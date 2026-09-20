-- Atomic append helper for vehicles.image_urls.
-- Used by uploadVehicleImage() server action so two concurrent uploads never
-- lose an entry via a client-side read-modify-write race.
--
-- The single UPDATE takes a row lock, appends, and returns the new array in
-- one statement — no window between read and write.

create or replace function public.append_vehicle_image_url(
  vehicle_id uuid,
  new_url text
)
returns text[]
language sql
security definer
set search_path = public
as $$
  update vehicles
     set image_urls = coalesce(image_urls, '{}'::text[]) || array[new_url]
   where id = vehicle_id
  returning image_urls;
$$;

comment on function public.append_vehicle_image_url(uuid, text) is
  'Atomically append a URL to vehicles.image_urls. Called by admin.uploadVehicleImage server action.';
