---
phase: 04-tracking-admin
plan: 01
subsystem: database, api, ui
tags: [supabase, realtime, postgres, gps, hooks, typescript, zod]

# Dependency graph
requires:
  - phase: 03-booking-identity-payment
    provides: bookings table with status CHECK constraint, vehicle_locations foundation, RLS patterns, admin client pattern

provides:
  - "SQL migration extending booking status to 6 values including car_on_the_way and car_delivered"
  - "vehicle_locations table (upsert-only, PK on vehicle_id) with RLS + Realtime enabled"
  - "gps_device_id and is_active columns on vehicles"
  - "vehicle_availability_blocks table for admin date blocking"
  - "POST /api/gps endpoint — GPS hardware ingest with shared secret auth and Zod validation"
  - "useRealtimeBooking hook — live booking status via Supabase Realtime postgres_changes"
  - "useVehicleLocation hook — live GPS coordinates via Supabase Realtime postgres_changes"

affects:
  - 04-02 (live tracking map — consumes useRealtimeBooking + useVehicleLocation)
  - 04-03 (admin dashboard — consumes extended booking status values + vehicle_availability_blocks)
  - Any component updating booking status (must use one of the 6 allowed values)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GPS hardware ingest: shared secret header (x-gps-secret) validated against env var GPS_INGEST_SECRET"
    - "vehicle_locations upsert-only pattern: onConflict vehicle_id keeps one row per vehicle, triggers UPDATE Realtime event"
    - "Realtime hooks: useEffect + createClient() + postgres_changes subscription + removeChannel cleanup"
    - "Unknown GPS device returns 200 (not 4xx) to prevent hardware retry loops"

key-files:
  created:
    - supabase/migrations/20260220300000_tracking_admin_phase4.sql
    - app/api/gps/route.ts
    - lib/hooks/use-realtime-booking.ts
    - lib/hooks/use-vehicle-location.ts
  modified: []

key-decisions:
  - "GPS ingest uses upsert onConflict vehicle_id — current-location-only model, no unbounded history growth"
  - "Upsert on PK triggers UPDATE Realtime event (not INSERT) — client hooks use event '*' to catch both INSERT (first ping) and UPDATE (subsequent)"
  - "Unknown GPS device IDs return 200 with warning (not 4xx) — prevents hardware retry storm"
  - "vehicle_locations has no INSERT/UPDATE policy — admin client (service_role) bypasses RLS, no user-facing writes needed"
  - "is_active (admin deactivation) distinct from is_available (scraper-managed) — different semantics, both needed"
  - "vehicle_availability_blocks uses service_role policy — admin-only mutation, admin client bypasses RLS anyway"

patterns-established:
  - "Realtime hook pattern: 'use client' + createClient() + useEffect postgres_changes + removeChannel return"
  - "GPS ingest pattern: x-gps-secret header auth + Zod validation + device lookup + upsert"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 4 Plan 01: Tracking + Admin Foundation Summary

**Supabase Realtime infrastructure for Phase 4 tracking: extended booking status CHECK (6 values), vehicle_locations upsert table, GPS hardware ingest endpoint with shared secret auth, and two postgres_changes hooks for live status/location in UI.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T22:53:48Z
- **Completed:** 2026-02-20T22:56:58Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- SQL migration extends bookings status CHECK to include `car_on_the_way` and `car_delivered`, creates `vehicle_locations` (upsert-only, PK on vehicle_id, RLS + Realtime), adds `gps_device_id` and `is_active` to vehicles, and creates `vehicle_availability_blocks` with RLS
- GPS ingest route at `POST /api/gps` validates shared secret header, Zod-validates device payload, looks up vehicle by `gps_device_id`, and upserts current location — returning 200 for unknown devices to prevent hardware retry storms
- Two Realtime hooks (`useRealtimeBooking`, `useVehicleLocation`) subscribe to postgres_changes events on bookings and vehicle_locations respectively, with channel cleanup preventing WebSocket leaks on unmount/HMR

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration** - `788944a` (chore)
2. **Task 2: GPS ingest API route** - `76ddfa9` (feat)
3. **Task 3: Supabase Realtime hooks** - `06a06d9` (feat)

## Files Created/Modified

- `supabase/migrations/20260220300000_tracking_admin_phase4.sql` — Phase 4 schema: extended booking status, vehicle_locations, gps_device_id, is_active, vehicle_availability_blocks
- `app/api/gps/route.ts` — GPS hardware ingest POST endpoint with shared secret + Zod + admin client upsert
- `lib/hooks/use-realtime-booking.ts` — Client hook subscribing to booking status UPDATE events via Supabase Realtime
- `lib/hooks/use-vehicle-location.ts` — Client hook subscribing to vehicle location INSERT/UPDATE events via Supabase Realtime

## Decisions Made

- **Upsert-only for vehicle_locations:** `onConflict: 'vehicle_id'` keeps one row per vehicle. Prevents unbounded table growth at 30-second GPS ping intervals. No location history for v1 (path replay is post-v1).
- **event: '*' for useVehicleLocation:** The first GPS ping triggers INSERT (no row existed yet); all subsequent pings trigger UPDATE (upsert on existing PK row). Using '*' wildcard catches both cases correctly.
- **200 for unknown GPS device IDs:** GPS hardware retries on 4xx/5xx. Returning 200 with a warning body stops the retry cycle without masking the misconfiguration (still logged to console).
- **is_active vs is_available:** `is_active` is admin-managed permanent deactivation; `is_available` is scraper/override managed temporary hiding. Both semantics are needed and must remain separate columns.
- **No INSERT/UPDATE RLS policy on vehicle_locations:** Admin client (service_role) bypasses RLS for GPS writes. No user-facing writes to this table are needed — authenticated users can only read.

## Deviations from Plan

None — plan executed exactly as written.

The plan specified `event: 'UPDATE'` for vehicle_locations in the task description but also noted "Also subscribe to event 'INSERT' as a fallback for the very first location write... Use event: '*' to catch both INSERT and UPDATE." Used `event: '*'` as the explicit recommendation in the plan's action text — this is not a deviation but following the plan's preferred approach.

## Issues Encountered

None.

## User Setup Required

Before GPS ingest can be used:
- Add `GPS_INGEST_SECRET` to `.env.local` and production environment variables
- Run `supabase db push` to apply migration `20260220300000_tracking_admin_phase4.sql`
- Configure GPS hardware management platform to POST to `{NEXT_PUBLIC_APP_URL}/api/gps` with header `x-gps-secret: {GPS_INGEST_SECRET}`

## Next Phase Readiness

- Schema foundation complete for all Phase 4 plans
- Plan 02 (live tracking map) can consume `useRealtimeBooking` and `useVehicleLocation` immediately
- Plan 03 (admin dashboard) can use extended booking status values and `vehicle_availability_blocks` table
- GPS ingest route ready for hardware integration testing with `curl -X POST http://localhost:3000/api/gps -H "x-gps-secret: test" -H "Content-Type: application/json" -d '{"device_id":"tracker-1","lat":25.2048,"lng":55.2708}'`
- No blockers — all artifacts created, no external service configuration required beyond adding `GPS_INGEST_SECRET` env var

---
*Phase: 04-tracking-admin*
*Completed: 2026-02-20*
