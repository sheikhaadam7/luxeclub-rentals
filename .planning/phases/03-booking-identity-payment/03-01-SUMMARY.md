---
phase: 03-booking-identity-payment
plan: "01"
subsystem: database, payments, api
tags: [stripe, resend, mapbox, veriff, zod, date-fns, supabase, migrations]

# Dependency graph
requires:
  - phase: 02-inventory-catalogue
    provides: vehicles table with daily_rate/weekly_rate/monthly_rate columns, bookings table base schema, profiles table with role column
provides:
  - Extended bookings schema with 20+ Phase 3 columns (pricing, payment, delivery, deposit, Stripe PI IDs)
  - vehicles.deposit_amount column for per-vehicle deposit configuration
  - profiles KYC columns (kyc_status, kyc_provider, kyc_session_id, kyc_verified_at)
  - stripe_webhook_events table for idempotent webhook processing
  - lib/stripe/server.ts — server-only Stripe singleton
  - lib/email/send.ts — server-only Resend sendEmail helper
  - lib/pricing/calculator.ts — pure calculateBookingTotal function with BookingPriceBreakdown
  - lib/validations/booking.ts — Zod schemas for all 4 booking wizard steps
affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added:
    - stripe (server SDK)
    - "@stripe/stripe-js (client SDK)"
    - "@stripe/react-stripe-js (React hooks)"
    - resend (transactional email)
    - "@react-email/components"
    - "@mapbox/search-js-react (address autocomplete)"
    - mapbox-gl
    - "@veriff/js-sdk (KYC identity verification)"
  patterns:
    - server-only guard on all server-side SDK singletons (stripe, resend)
    - Pure pricing calculator — no side effects, no network calls, returns full breakdown
    - Zod v4 API: use 'error' param (not 'required_error') for date/required field errors
    - Migration idempotency: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS

key-files:
  created:
    - supabase/migrations/20260220200000_extend_bookings_phase3.sql
    - lib/stripe/server.ts
    - lib/email/send.ts
    - lib/pricing/calculator.ts
    - lib/validations/booking.ts
  modified:
    - package.json (8 new dependencies added)
    - components/ui/AvailabilityCalendar.tsx (pre-existing bug fix)

key-decisions:
  - "payment_status CHECK includes 'pending_cash' — required for Plan 04 cash booking INSERT support"
  - "deposit amount falls back to 5000 AED when vehicles.deposit_amount is null"
  - "totalDue excludes deposit — deposit is authorized separately via Stripe hold"
  - "noDepositSurcharge = daily_rate * 0.30 * rentalDays (not weekly/monthly rate)"
  - "Zod v4 uses 'error' not 'required_error' for date field error customization"

patterns-established:
  - "Pricing pattern: calculateBookingTotal(vehicle, formValues) -> BookingPriceBreakdown — all Plans import from lib/pricing/calculator.ts"
  - "Server SDK pattern: import 'server-only' at top of all server-only lib files"
  - "Validation pattern: per-step schemas + combined bookingSchema + BookingFormValues type"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 3 Plan 01: Foundation — DB Migration, Dependencies, Pricing Calculator, and Validation Schemas Summary

**Postgres migration extending bookings/vehicles/profiles with 20+ Phase 3 columns, 8 npm packages installed (Stripe, Resend, Mapbox, Veriff), pure pricing calculator with AED breakdown, and Zod v4 schemas for all 4 booking wizard steps**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T21:31:19Z
- **Completed:** 2026-02-20T21:34:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Migration SQL ready with all Phase 3 columns: duration_type, pickup_method, delivery address fields, deposit_choice, full pricing breakdown columns, payment_method/payment_status (with pending_cash), Stripe PI ID columns, deposit_status, updated_at — plus vehicles.deposit_amount, profiles KYC columns, and stripe_webhook_events table
- Pure pricing calculator correctly handles daily/weekly/monthly rates, 50 AED delivery/return fees, 30% no-deposit surcharge, per-vehicle deposit (fallback 5000 AED), and correctly excludes deposit from totalDue
- Zod validation schemas for all 4 wizard steps with cross-field refinements: deliveryAddress required when delivery selected, endDate must be >= startDate

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, create migration SQL, and server client singletons** - `f693743` (feat)
2. **Task 2: Pricing calculator and booking validation schemas** - `58385fc` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `supabase/migrations/20260220200000_extend_bookings_phase3.sql` — Extends bookings (20+ columns), vehicles (deposit_amount), profiles (KYC), creates stripe_webhook_events, adds RLS policies for INSERT/UPDATE, enables realtime
- `lib/stripe/server.ts` — Server-only Stripe singleton with server-only guard
- `lib/email/send.ts` — Server-only Resend sendEmail helper, sends from bookings@luxeclubrentals.com
- `lib/pricing/calculator.ts` — Pure calculateBookingTotal(vehicle, formValues) returning BookingPriceBreakdown; handles all duration types, fees, and deposit logic
- `lib/validations/booking.ts` — durationStepSchema, deliveryStepSchema, depositStepSchema, paymentStepSchema, bookingSchema, BookingFormValues type
- `package.json` — 8 new dependencies: stripe, @stripe/stripe-js, @stripe/react-stripe-js, resend, @react-email/components, @mapbox/search-js-react, mapbox-gl, @veriff/js-sdk
- `components/ui/AvailabilityCalendar.tsx` — Pre-existing bug fix (see Deviations)

## Decisions Made

- `payment_status` CHECK constraint includes 'pending_cash' — Plan 04's createBooking sets this status for cash bookings; omitting it would cause all cash booking INSERTs to fail with a Postgres constraint violation
- Deposit amount excluded from `totalDue` — deposit is a Stripe authorization hold, not a charge; including it would double-count the customer's payment obligation
- `noDepositSurcharge` uses `daily_rate` not weekly/monthly rate — surcharge is always based on per-day cost regardless of rental period type, ensuring consistent pricing incentive
- Fall back to 5000 AED when `vehicles.deposit_amount` is NULL — matches existing LuxeClub pricing for vehicles not yet configured with specific deposit amounts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed deprecated mode="default" on react-day-picker DayPicker**
- **Found during:** Task 1 verification (npx tsc --noEmit)
- **Issue:** AvailabilityCalendar.tsx used `mode="default"` which was removed in react-day-picker v9; caused TypeScript error TS2322
- **Fix:** Removed the `mode` prop entirely — v9 defaults to no-selection view mode which is the correct behavior for a read-only availability calendar
- **Files modified:** components/ui/AvailabilityCalendar.tsx
- **Verification:** npx tsc --noEmit passes with zero errors
- **Committed in:** f693743 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Zod v4 API change: required_error -> error**
- **Found during:** Task 2 verification (npx tsc --noEmit)
- **Issue:** Zod v4 (^4.3.6 in package.json) changed the date field error parameter from `required_error` to `error`; caused 4 TypeScript errors TS2353
- **Fix:** Replaced all `required_error` occurrences with `error` in booking.ts
- **Files modified:** lib/validations/booking.ts
- **Verification:** npx tsc --noEmit passes with zero errors
- **Committed in:** 58385fc (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — pre-existing v9 API incompatibility, Zod v4 API change)
**Impact on plan:** Both fixes required for TypeScript to compile. No scope creep. AvailabilityCalendar fix was pre-existing from Phase 2.

## Issues Encountered

None beyond the two auto-fixed TypeScript errors above.

## User Setup Required

**External services require manual configuration before Phase 3 plans can be tested end-to-end.**

Services needed (add to .env.local):

| Service | Environment Variable | Source |
|---------|---------------------|--------|
| Stripe | STRIPE_SECRET_KEY | Stripe Dashboard -> Developers -> API keys -> Secret key |
| Stripe | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe Dashboard -> Developers -> API keys -> Publishable key |
| Stripe | STRIPE_WEBHOOK_SECRET | Stripe Dashboard -> Developers -> Webhooks -> Signing secret |
| Veriff | VERIFF_API_KEY | Veriff Dashboard -> Settings -> API keys |
| Veriff | VERIFF_SHARED_SECRET | Veriff Dashboard -> Settings -> Shared secret key |
| Mapbox | NEXT_PUBLIC_MAPBOX_TOKEN | Mapbox Dashboard -> Account -> Access tokens |
| Resend | RESEND_API_KEY | Resend Dashboard -> API Keys -> Create API Key |

**Migration:** Run `supabase db push` or apply `supabase/migrations/20260220200000_extend_bookings_phase3.sql` against your Supabase project to add all Phase 3 columns.

## Next Phase Readiness

- Phase 3 Plan 02 (booking wizard UI) can begin immediately — all schemas, calculator, and Stripe client are ready
- Migration must be applied to Supabase before any booking form submissions will succeed
- External service env vars needed before payment (Plan 04) and KYC (Plan 03) steps can be tested end-to-end

## Self-Check: PASSED

All expected files exist and all commits verified:
- FOUND: supabase/migrations/20260220200000_extend_bookings_phase3.sql
- FOUND: lib/stripe/server.ts
- FOUND: lib/email/send.ts
- FOUND: lib/pricing/calculator.ts
- FOUND: lib/validations/booking.ts
- FOUND: .planning/phases/03-booking-identity-payment/03-01-SUMMARY.md
- FOUND: f693743 (Task 1 commit)
- FOUND: 58385fc (Task 2 commit)

---
*Phase: 03-booking-identity-payment*
*Completed: 2026-02-20*
