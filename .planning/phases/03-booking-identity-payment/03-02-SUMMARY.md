---
phase: "03"
plan: "02"
subsystem: booking-wizard-ui
tags: [booking, wizard, react-hook-form, mapbox, react-day-picker, pricing, ui]
dependency_graph:
  requires: ["03-01"]
  provides: ["booking-wizard-ui", "book-page", "step-duration", "step-delivery", "step-deposit", "price-summary"]
  affects: ["03-03", "03-04"]
tech_stack:
  added: []
  patterns:
    - "Multi-step wizard with single react-hook-form instance and per-step trigger()"
    - "useWatch for reactive price breakdown (Uber-style live pricing)"
    - "Mapbox AddressAutofill + AddressMinimap for delivery address pin-drop"
    - "DayPicker v9 mode=range with bookedRanges disabled matchers"
    - "Two-column desktop layout with sticky sidebar PriceSummary"
key_files:
  created:
    - app/(protected)/book/[slug]/page.tsx
    - components/booking/BookingWizard.tsx
    - components/booking/StepDuration.tsx
    - components/booking/StepDelivery.tsx
    - components/booking/StepDepositChoice.tsx
    - components/booking/PriceSummary.tsx
  modified:
    - app/(protected)/catalogue/[slug]/page.tsx
decisions:
  - "Single useForm instance shared across all steps — trigger() called with step-specific field arrays for progressive validation"
  - "PriceSummary rendered outside step area (sticky sidebar) so price updates are always visible from Step 1 onward"
  - "MinimapFeature typed as GeoJSON.Feature<GeoJSON.Point> from @types/geojson to satisfy Mapbox AddressMinimap prop types"
  - "Fallback plain input rendered when NEXT_PUBLIC_MAPBOX_TOKEN not set — avoids hard crash in development"
  - "Steps 3 (identity) and 4 (payment) are placeholder divs — will be replaced in Plans 03 and 04"
metrics:
  duration_seconds: 341
  completed_date: "2026-02-20"
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase 3 Plan 02: Booking Wizard UI Summary

**One-liner:** Multi-step booking wizard with react-hook-form, Mapbox address pin-drop, DayPicker date range, and Uber-style live price breakdown updating on every form change.

## What Was Built

A complete booking wizard UI covering Steps 1-3 of the 5-step flow:

**Step 1 — Duration (`StepDuration.tsx`):**
- Three radio-style cards for daily/weekly/monthly selection with vehicle rates
- DayPicker v9 in `mode="range"` with `excludeDisabled` and booked date ranges disabled
- Two-month calendar view matching existing AvailabilityCalendar dark styling
- Optional pickup time input (HH:MM, default 10:00)

**Step 2 — Delivery (`StepDelivery.tsx`):**
- Delivery vs Self-Pickup toggle (AED 50 vs Free)
- Conditional Mapbox AddressAutofill when delivery selected — wraps input, fires `onRetrieve`
- AddressMinimap with `canAdjustMarker` and `satelliteToggle` for pinpoint confirmation
- Self Drop-Off vs Collection return method toggle (Free vs AED 50)
- Fallback plain text input when Mapbox token not configured

**Step 3 — Deposit (`StepDepositChoice.tsx`):**
- Pay Deposit vs No Deposit radio cards
- Live surcharge preview computed inline using `useWatch` when dates are selected
- Deposit amount from `vehicle.deposit_amount` with 5000 AED fallback

**Price Summary (`PriceSummary.tsx`):**
- `useWatch({ control })` monitors all pricing fields reactively
- Calls `calculateBookingTotal(vehicle, formValues)` on every change
- Line items: rental subtotal, delivery fee, return fee, no-deposit surcharge
- Deposit hold note shown separately (authorized, not charged)
- "Select dates to see pricing" empty state

**Wizard Shell (`BookingWizard.tsx`):**
- `STEPS = ['duration', 'delivery', 'deposit', 'identity', 'payment']`
- Single `useForm<BookingFormValues>` with `zodResolver(bookingSchema)`
- Step-specific field arrays for `form.trigger()` on advance
- `useTransition` for async validation without blocking UI
- Step indicator: numbered circles with connecting lines, brand-cyan for current/completed
- Two-column desktop layout: steps (flex-1) + sticky PriceSummary sidebar (w-80)
- Steps 4 and 5 are placeholder divs with "Coming soon" messaging

**Book Page (`app/(protected)/book/[slug]/page.tsx`):**
- Server Component with Next.js 16 `params: Promise<{ slug: string }>` pattern
- Fetches vehicle by slug and blocked date ranges via `get_blocked_dates` RPC
- Returns 404 if not found
- Back link to `/catalogue/{slug}`

**Catalogue Detail Page update:**
- Book Now button: `bg-brand-cyan text-black` full-width link to `/book/{slug}`
- Shown only when `vehicle.is_available` is true
- "Currently Unavailable" muted text otherwise

## Verification

- `npx tsc --noEmit` — zero errors
- All 6 new files exceed minimum line count requirements
- All key links from plan verified: `calculateBookingTotal` import, `useForm`, `mode="range"`, `AddressAutofill`, `href.*book`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mapbox AddressAutofill onRetrieve type mismatch**
- **Found during:** Task 1 TypeScript check
- **Issue:** Local `MapboxRetrieveEvent` interface with `coordinates: [number, number]` was not compatible with Mapbox's `Position` type (which can have 2+ elements), causing TS2352 conversion error
- **Fix:** Imported `AddressAutofillRetrieveResponse` from `@mapbox/search-js-core` and `Feature<Point>` from `geojson` for proper typing. Used array index access instead of destructuring for coordinates.
- **Files modified:** `components/booking/StepDelivery.tsx`
- **Commit:** 02e82d2

## Self-Check: PASSED

Files exist:
- FOUND: components/booking/BookingWizard.tsx (217 lines)
- FOUND: components/booking/StepDuration.tsx (180 lines)
- FOUND: components/booking/StepDelivery.tsx (296 lines)
- FOUND: components/booking/StepDepositChoice.tsx (148 lines)
- FOUND: components/booking/PriceSummary.tsx (145 lines)
- FOUND: app/(protected)/book/[slug]/page.tsx (67 lines)
- FOUND: app/(protected)/catalogue/[slug]/page.tsx (modified, 184 lines)

Commits exist:
- FOUND: 02e82d2 (feat(03-02): booking wizard shell, duration step, and delivery step)
- FOUND: 70cebb0 (feat(03-02): deposit choice step, live price summary, and Book Now button)
