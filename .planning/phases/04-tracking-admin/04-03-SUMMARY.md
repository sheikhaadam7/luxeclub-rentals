---
phase: 04-tracking-admin
plan: 03
subsystem: ui, api
tags: [react, nextjs, server-actions, supabase, admin, typescript]

# Dependency graph
requires:
  - phase: 04-tracking-admin
    provides: "04-01: vehicle_availability_blocks table, extended booking status (6 values), is_active on vehicles, gps_device_id on vehicles"

provides:
  - "Multi-tab admin operations dashboard at /admin with URL ?tab= routing"
  - "AdminTabs client component with 5-tab navigation (fleet, bookings, kyc, payments, analytics)"
  - "FleetTab: vehicle CRUD (add/edit pricing/deactivate), availability block management, scraper status preservation"
  - "BookingsTab: all-bookings view with 6-status pipeline dropdown + status/text search filters"
  - "Extended app/actions/admin.ts: 8 new Server Actions for fleet + booking management"

affects:
  - 04-04 (KYC/payments/analytics tabs — builds on this tab infrastructure)
  - Any admin workflow touching fleet or booking management

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client components fetch their own data via Server Actions in useEffect (not Server Component data injection)"
    - "useTransition for all mutations — consistent with existing VehicleOverrideForm pattern"
    - "Optimistic status update pattern in BookingsTab: setLocalStatus immediately, revert on error"
    - "Partial update pattern in updateVehicle: only include fields in payload if !== undefined"

key-files:
  created:
    - components/admin/AdminTabs.tsx
    - components/admin/FleetTab.tsx
    - components/admin/BookingsTab.tsx
  modified:
    - app/actions/admin.ts
    - app/(protected)/admin/page.tsx

key-decisions:
  - "FleetTab is client component that fetches its own data — server component passing data would prevent useTransition mutations without page reload"
  - "Supabase join on vehicles returns array type — cast via Array.isArray check before accessing properties"
  - "getAllBookings fetches profiles separately (not via join) — admin client bypasses RLS but join return types are cleaner to handle independently"
  - "Optimistic booking status update with revert on error — avoids blocking UX for network latency"
  - "AddBlockForm uses crypto.randomUUID() for optimistic block ID — actual ID assigned by DB, refetch on next load would update it"

patterns-established:
  - "Admin tab content as 'use client' component with self-fetching via useEffect: enables useTransition mutations without needing page-level Server Action data"
  - "useCallback for fetch functions — prevents useEffect dependency warnings and allows explicit refetch on mutation success"

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 4 Plan 03: Admin Operations Dashboard Summary

**Multi-tab admin dashboard at /admin with Fleet CRUD (add/edit/deactivate vehicles, availability blocks, pricing), full 6-status booking pipeline dropdown with Realtime trigger, and URL ?tab= routing for all 5 tabs.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-20T22:59:03Z
- **Completed:** 2026-02-20T23:07:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Extended `app/actions/admin.ts` with 8 new Server Actions: `getFleetData`, `addVehicle`, `updateVehicle`, `toggleVehicleActive`, `addAvailabilityBlock`, `removeAvailabilityBlock`, `getAllBookings`, `updateBookingStatus` — all auth-gated via `verifyAdmin()`
- Built `FleetTab` client component with scraper status preservation, collapsible add-vehicle form with auto-slug generation, vehicle cards with is_active/is_available toggles, inline pricing/GPS edit form, and per-vehicle availability block management
- Built `BookingsTab` client component with all-bookings list, 6-status dropdown with optimistic update + Realtime trigger, and filter/search by status, vehicle name, booking ref, or email
- Rebuilt admin page as tabbed Operations Dashboard with URL ?tab= routing, defaulting to fleet, KYC/payments/analytics tabs show "coming soon" placeholders pending Plan 04

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin Server Actions — fleet CRUD, availability blocks, booking management** - `d9d0324` (feat)
2. **Task 2: Admin page rebuild with tab routing, AdminTabs, FleetTab, BookingsTab** - `76739db` (feat)

## Files Created/Modified

- `app/actions/admin.ts` — Extended with 8 new Server Actions; existing 3 actions preserved unchanged
- `app/(protected)/admin/page.tsx` — Rebuilt as tabbed Operations Dashboard; auth check preserved
- `components/admin/AdminTabs.tsx` — 5-tab nav with URL-based active state via `?tab=` param
- `components/admin/FleetTab.tsx` — Vehicle CRUD, availability blocks, scraper status card
- `components/admin/BookingsTab.tsx` — All-bookings list with 6-status pipeline + filters

## Decisions Made

- **Client component data fetching pattern:** FleetTab and BookingsTab fetch their own data via `useEffect` → Server Action rather than receiving data from the Server Component parent. This is necessary because the components also perform mutations via `useTransition`, and the pattern allows `refetch()` after mutations without a full page reload.
- **Supabase join type casting:** The `vehicles` join in `getAllBookings` returns `{ name: any; slug: any }[]` (array) from the Supabase TypeScript types. Fixed with an `Array.isArray` check before accessing properties.
- **Separate profiles query in getAllBookings:** User emails are fetched via a separate admin client query (not joined) for cleaner TypeScript typing. The join approach caused a type error during build.
- **Optimistic booking status:** BookingsTab immediately updates the dropdown display on selection, then reverts to previous status if the Server Action returns an error. Avoids blocking UX during status transitions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in getAllBookings — Supabase join returns array not single object**
- **Found during:** Task 1 verification (build check)
- **Issue:** `b.vehicles as { name: string; slug: string }` — TypeScript infers `vehicles` join as `{ name: any; slug: any }[]` (array type), causing conversion error: "neither type sufficiently overlaps with the other"
- **Fix:** Added `Array.isArray(rawVehicle) ? rawVehicle[0] : rawVehicle` to handle both array and single-object return from Supabase join
- **Files modified:** `app/actions/admin.ts`
- **Verification:** `npx tsc --noEmit` returns zero errors
- **Committed in:** `d9d0324` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix, no scope creep.

## Issues Encountered

- The pre-existing Stripe webhook route (`/api/webhooks/stripe`) causes `npx next build` to fail with "Neither apiKey nor config.authenticator provided" due to missing env vars. This is not related to Plan 03 changes and was present before this plan. TypeScript (`npx tsc --noEmit`) passes cleanly with zero errors.

## User Setup Required

None — no new external service configuration required. All new Server Actions use the existing admin client pattern.

## Next Phase Readiness

- Admin tab infrastructure is in place — Plan 04 can replace "coming soon" placeholders with KYC, Payments, and Analytics tab content
- `updateBookingStatus` triggers Supabase Realtime on bookings table — customer tracking pages (Plan 02) will receive live updates when admin changes status from Bookings tab
- `addAvailabilityBlock` / `removeAvailabilityBlock` integrate with the `vehicle_availability_blocks` table from Plan 01
- All 11 admin Server Actions are auth-gated — safe to extend in Plan 04 without re-auditing

---
*Phase: 04-tracking-admin*
*Completed: 2026-02-20*

## Self-Check: PASSED

Files verified:
- FOUND: app/actions/admin.ts
- FOUND: app/(protected)/admin/page.tsx
- FOUND: components/admin/AdminTabs.tsx
- FOUND: components/admin/FleetTab.tsx
- FOUND: components/admin/BookingsTab.tsx

Commits verified:
- FOUND: d9d0324 (Task 1: Admin Server Actions)
- FOUND: 76739db (Task 2: Admin page rebuild)
