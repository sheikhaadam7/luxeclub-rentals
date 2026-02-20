---
phase: 04-tracking-admin
plan: 02
subsystem: ui
tags: [mapbox, mapbox-gl, realtime, supabase, react, typescript, next.js, tracking, geojson]

# Dependency graph
requires:
  - phase: 04-tracking-admin
    plan: 01
    provides: useRealtimeBooking + useVehicleLocation Realtime hooks, vehicle_locations table, extended booking status values

provides:
  - "LiveTrackingMap client component — Mapbox GL JS v3, Standard style + night preset, real-time car circle layer via GeoJSON source, static cyan destination marker"
  - "BookingStatusTimeline client component — 3-step horizontal/vertical stepper, live status via useRealtimeBooking, pulse animation on active step, cancelled/completed special states"
  - "Updated booking detail page — tracking section for confirmed/car_on_the_way/car_delivered, server-side initial vehicle location fetch, formatStatus extended with new statuses"
  - "BookingDetail interface + getBookingDetail query extended with delivery_lat, delivery_lng, vehicle_id"

affects:
  - 04-03 (admin dashboard — same booking status values used in admin UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mapbox GL JS v3 pattern: useRef for map instance (never useState), style.load callback for source/layer setup, setConfigProperty for night preset"
    - "GeoJSON source update pattern: map.getSource('car') as GeoJSONSource + setData() for real-time marker movement"
    - "Server-side initial location fetch: createClient() in Server Component to pre-populate initialLat/initialLng, preventing empty-state flash"
    - "Token guard pattern: NEXT_PUBLIC_MAPBOX_TOKEN check before rendering map, fallback div with message"

key-files:
  created:
    - components/tracking/LiveTrackingMap.tsx
    - components/tracking/BookingStatusTimeline.tsx
  modified:
    - app/(protected)/bookings/[bookingId]/page.tsx
    - app/actions/bookings.ts

key-decisions:
  - "Map rendered even for confirmed status with delivery — shows destination pin before car_on_the_way begins"
  - "showMap gated on pickup_method === 'delivery' AND delivery_lat/delivery_lng present — avoids rendering map for office pickups"
  - "Server-side vehicle_locations fetch wrapped in try/catch — non-fatal, map degrades to destination-pin-only until first GPS update"
  - "isUpcoming variable removed from render path — computed but unused, clean code avoids linter warnings"

patterns-established:
  - "Mapbox ref pattern: useRef<mapboxgl.Map | null> initialized in useEffect, never useState — prevents React reconciliation from destroying map instance"
  - "NEXT_PUBLIC token guard: early return with fallback UI when env var absent — matches AddressMinimap pattern from Phase 3"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 4 Plan 02: Live Tracking Map and Status Timeline Summary

**Mapbox GL JS v3 dark luxury tracking map with real-time car circle layer via GeoJSON + Supabase Realtime, and a 3-step status timeline with pulse animation — both integrated into the booking detail page.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-20T22:59:08Z
- **Completed:** 2026-02-20T23:02:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- LiveTrackingMap renders a dark luxury Mapbox Standard + night preset map with a static cyan delivery destination marker and a white/cyan circle GeoJSON layer for the car position — car marker updates in real time via `useVehicleLocation` hook without any page interaction
- BookingStatusTimeline shows a horizontal (desktop) / vertical (mobile) 3-step stepper for Confirmed → Car On The Way → Car Delivered, with pulse animation on the active step, solid cyan connectors for completed steps, dashed gray for upcoming — updates live via `useRealtimeBooking`
- Booking detail page integrates both components in a new "Delivery Status" section, conditionally rendered for trackable statuses, with server-side initial vehicle location pre-fetch to prevent map empty-state flash

## Task Commits

Each task was committed atomically:

1. **Task 1: LiveTrackingMap and BookingStatusTimeline components** - `5209edc` (feat)
2. **Task 2: Integrate tracking map and status timeline into booking detail page** - `4f947ea` (feat)

## Files Created/Modified

- `components/tracking/LiveTrackingMap.tsx` — Mapbox GL JS v3 map with Standard style, night preset, GeoJSON car source, cyan destination marker, useVehicleLocation, token fallback
- `components/tracking/BookingStatusTimeline.tsx` — 3-step stepper (confirmed/car_on_the_way/car_delivered), horizontal/vertical responsive layout, useRealtimeBooking, cancelled banner, completed state
- `app/(protected)/bookings/[bookingId]/page.tsx` — Tracking section added (isTrackable condition), LiveTrackingMap + BookingStatusTimeline rendered, server-side initial location fetch, formatStatus extended
- `app/actions/bookings.ts` — BookingDetail interface + getBookingDetail query extended with delivery_lat, delivery_lng, vehicle_id

## Decisions Made

- **Map shown for confirmed status too:** The plan spec says "Map is visible during car_on_the_way, car_delivered, and confirmed statuses with delivery." Confirmed with delivery shows the destination pin so customer knows where the car will go. Implemented `isTrackable` covering all three statuses, `showMap` additionally requires delivery method + coordinates.
- **showMap gated on delivery method:** Office pickup bookings don't have delivery coordinates — `pickup_method === 'delivery'` guard prevents map render for self-pickup bookings.
- **Server-side location fetch non-fatal:** The vehicle_locations table may not have a row yet (first GPS ping not received). `try/catch` around the Supabase query means the page still renders correctly — map just shows destination pin until GPS updates arrive.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `isUpcoming` variable from mobile timeline render**
- **Found during:** Task 1 (BookingStatusTimeline)
- **Issue:** `isUpcoming` was declared but never used in JSX inside the mobile vertical timeline block — would trigger TypeScript/ESLint unused-variable warning
- **Fix:** Removed the declaration from the mobile render block (desktop block already didn't declare it after first pass)
- **Files modified:** components/tracking/BookingStatusTimeline.tsx
- **Committed in:** `5209edc` (Task 1 commit, inline fix)

---

**Total deviations:** 1 auto-fixed (1 bug — unused variable)
**Impact on plan:** Trivial inline fix. No scope change.

## Issues Encountered

None.

## User Setup Required

- Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local` — without it, LiveTrackingMap renders a fallback message instead of the map
- Apply Phase 4 migration (already documented in Plan 01 setup) before testing tracking features end-to-end

## Next Phase Readiness

- Live tracking map and status timeline are complete — customer-facing "watch your car arrive" experience fully implemented
- Plan 03 (admin dashboard) can proceed: extended booking status values (confirmed/car_on_the_way/car_delivered) are available, and admin can now update booking status to trigger real-time customer updates
- No blockers from this plan — all tracking components ready for integration testing once Mapbox token and DB migration are applied

---
*Phase: 04-tracking-admin*
*Completed: 2026-02-20*

## Self-Check: PASSED

All artifacts verified:
- FOUND: `components/tracking/LiveTrackingMap.tsx`
- FOUND: `components/tracking/BookingStatusTimeline.tsx`
- FOUND: `app/(protected)/bookings/[bookingId]/page.tsx`
- FOUND: `app/actions/bookings.ts`
- FOUND: `.planning/phases/04-tracking-admin/04-02-SUMMARY.md`
- FOUND commit: `5209edc` (Task 1)
- FOUND commit: `4f947ea` (Task 2)
