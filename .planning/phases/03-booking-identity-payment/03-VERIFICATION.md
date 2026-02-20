---
phase: 03-booking-identity-payment
verified: 2026-02-20T22:30:00Z
status: gaps_found
score: 18/19 must-haves verified
re_verification: false
gaps:
  - truth: Stripe webhook idempotency prevents double-processing
    status: failed
    reason: Column name mismatch between code and migration schema
    artifacts:
      - path: app/api/webhooks/stripe/route.ts
        issue: Line 54 inserts event_id but migration defines stripe_event_id as primary key - INSERT fails with HTTP 500 on every webhook delivery
    missing:
      - Change event_id to stripe_event_id in the .insert() call on line 54
---

# Phase 3: Booking, Identity, Payment - Verification Report

**Phase Goal:** Users can select a car, configure a rental with live pricing, verify their identity, and complete payment - the business can take its first real booking.
**Verified:** 2026-02-20T22:30:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Stripe server SDK is only importable server-side | VERIFIED | lib/stripe/server.ts has import server-only guard |
| 2 | calculateBookingTotal produces correct fee breakdown | VERIFIED | lib/pricing/calculator.ts 131 lines, all fee types computed |
| 3 | Resend email helper is server-only and sends via Resend | VERIFIED | lib/email/send.ts has import server-only, Resend client |
| 4 | BookingWizard renders the 5-step flow end-to-end | VERIFIED | components/booking/BookingWizard.tsx 275 lines, all 5 steps wired |
| 5 | Duration step uses real date picker with blocked dates | VERIFIED | StepDuration.tsx 181 lines, DayPicker v9 mode=range with disabledMatchers |
| 6 | Delivery step conditionally shows address autofill | VERIFIED | StepDelivery.tsx 296 lines, AddressAutofill + AddressMinimap conditional |
| 7 | Deposit choice step previews surcharge dynamically | VERIFIED | StepDepositChoice.tsx 148 lines, useWatch + differenceInDays surcharge preview |
| 8 | PriceSummary is live-reactive to form field changes | VERIFIED | PriceSummary.tsx 145 lines, useWatch all pricing fields + calculateBookingTotal |
| 9 | Book page fetches vehicle and blocked dates | VERIFIED | app/(protected)/book/[slug]/page.tsx 67 lines, get_blocked_dates RPC |
| 10 | KYC flow covers all 5 status states with polling | VERIFIED | StepIdentity.tsx 268 lines, all 5 branches, 5-second polling |
| 11 | Veriff sessions are created and status fetched server-side | VERIFIED | app/actions/identity.ts 127 lines, createVeriffSession + getVerificationStatus |
| 12 | Veriff webhook validates HMAC and updates profile | VERIFIED | app/api/webhooks/veriff/route.ts 85 lines, node:crypto HMAC-SHA256 |
| 13 | Payment step supports deposit, rental, and COD paths | VERIFIED | StepPayment.tsx 298 lines, all 3 payment paths present |
| 14 | Payment intents created with correct capture_method | VERIFIED | app/actions/payments.ts: rental=automatic, deposit=manual+extended auth |
| 15 | createBooking revalidates price server-side before insert | VERIFIED | app/actions/bookings.ts 357 lines, server-side calculateBookingTotal before insert |
| 16 | Stripe webhook idempotency prevents double-processing | FAILED | route.ts line 54 uses event_id but column is stripe_event_id - INSERT always fails |
| 17 | Booking confirmation email is sent after successful booking | VERIFIED | app/actions/bookings.ts sendEmail in try/catch after insert |
| 18 | My Bookings list shows upcoming and past bookings | VERIFIED | app/(protected)/bookings/page.tsx 244 lines, upcoming/past split |
| 19 | Booking detail page shows full pricing and reference | VERIFIED | app/(protected)/bookings/[bookingId]/page.tsx 290 lines |

**Score:** 18/19 truths verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| lib/stripe/server.ts | VERIFIED | 9 lines, server-only guard, imported by actions/payments.ts |
| lib/pricing/calculator.ts | VERIFIED | 131 lines, exports calculateBookingTotal + BookingPriceBreakdown |
| lib/email/send.ts | VERIFIED | 32 lines, server-only, Resend client, sendEmail export |
| lib/validations/booking.ts | VERIFIED | 108 lines, all step schemas + bookingSchema + BookingFormValues |
| supabase/migrations/20260220200000_extend_bookings_phase3.sql | VERIFIED | 115 lines, 20+ columns, stripe_webhook_events table |
| components/booking/BookingWizard.tsx | VERIFIED | 275 lines, all 5 steps, createBooking wired |
| components/booking/StepDuration.tsx | VERIFIED | 181 lines, DayPicker v9 mode=range |
| components/booking/StepDelivery.tsx | VERIFIED | 296 lines, Mapbox AddressAutofill |
| components/booking/StepDepositChoice.tsx | VERIFIED | 148 lines, dynamic surcharge preview |
| components/booking/PriceSummary.tsx | VERIFIED | 145 lines, live useWatch reactive |
| app/(protected)/book/[slug]/page.tsx | VERIFIED | 67 lines, get_blocked_dates RPC |
| app/actions/identity.ts | VERIFIED | 127 lines, createVeriffSession + getVerificationStatus |
| components/booking/StepIdentity.tsx | VERIFIED | 268 lines, all 5 KYC status branches |
| components/identity/VeriffWidget.tsx | VERIFIED | 60 lines, redirect flow |
| app/api/webhooks/veriff/route.ts | VERIFIED | 85 lines, HMAC-SHA256 validation |
| app/(protected)/book/verify-callback/page.tsx | VERIFIED | 36 lines, sessionStorage handoff |
| app/actions/payments.ts | VERIFIED | 222 lines, 4 payment actions, correct capture_method |
| app/actions/bookings.ts | VERIFIED | 357 lines, createBooking + getUserBookings + getBookingDetail |
| app/api/webhooks/stripe/route.ts | WIRING BROKEN | 134 lines, exists+substantive but idempotency insert uses wrong column name |
| components/booking/StepPayment.tsx | VERIFIED | 298 lines, all payment paths present |
| components/email/BookingConfirmationEmail.tsx | VERIFIED | 505 lines, full template with pricing breakdown |
| app/(protected)/bookings/page.tsx | VERIFIED | 244 lines, upcoming/past split, booking cards |
| app/(protected)/bookings/[bookingId]/page.tsx | VERIFIED | 290 lines, full details + pricing + cancellation |
| app/(protected)/dashboard/page.tsx | VERIFIED | My Bookings card present at lines 65-86 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| BookingWizard.tsx | createBooking | import + call | WIRED | Calls createBooking between identity and payment steps |
| BookingWizard.tsx | All 5 step components | render per STEPS array | WIRED | STEPS = [duration, delivery, deposit, identity, payment] |
| PriceSummary.tsx | calculateBookingTotal | import + useWatch | WIRED | Reactive call on every form field change |
| StepDelivery.tsx | Mapbox AddressAutofill | @mapbox/search-js-react | WIRED | Conditional render on delivery method |
| StepIdentity.tsx | createVeriffSession | import + call on mount | WIRED | Called when no existing session |
| StepIdentity.tsx | getVerificationStatus | import + 5s polling | WIRED | setInterval polling in submitted/pending states |
| app/actions/identity.ts | supabase admin client | createAdminClient | WIRED | Profile writes use admin client |
| app/api/webhooks/veriff/route.ts | admin client profile update | createAdminClient + .update() | WIRED | HMAC verified then profile updated |
| app/actions/payments.ts | stripe.paymentIntents.create | lib/stripe/server | WIRED | All payment intents use server SDK |
| app/actions/bookings.ts | calculateBookingTotal | import + server-side call | WIRED | Price revalidation before DB insert |
| app/actions/bookings.ts | sendEmail + BookingConfirmationEmail | import + try/catch | WIRED | Email sent after successful insert |
| app/api/webhooks/stripe/route.ts | stripe_webhook_events insert | .insert({ event_id }) | NOT WIRED | event_id should be stripe_event_id - INSERT fails every time |
| app/(protected)/book/[slug]/page.tsx | BookingWizard | import + render with props | WIRED | Vehicle and blocked dates passed as props |
| app/(protected)/dashboard/page.tsx | /bookings | Link href=/bookings | WIRED | My Bookings card lines 65-86 |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| User can select dates and see live price calculation | SATISFIED | All supporting truths verified |
| User can specify delivery or self-pickup with address | SATISFIED | All supporting truths verified |
| User can choose deposit hold or no-deposit surcharge | SATISFIED | All supporting truths verified |
| User must pass identity verification before paying | SATISFIED | All supporting truths verified |
| User can pay via card, express checkout, or COD | SATISFIED | All supporting truths verified |
| Booking created with server-side price revalidation | SATISFIED | All supporting truths verified |
| Stripe webhooks update booking/deposit status reliably | BLOCKED | stripe_webhook_events INSERT fails due to wrong column name |
| User receives confirmation email after booking | SATISFIED | All supporting truths verified |
| User can view booking history and detail page | SATISFIED | All supporting truths verified |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| app/api/webhooks/stripe/route.ts | 54 | Wrong column name in INSERT | BLOCKER | Every webhook returns 500; payment and deposit statuses never update via webhook |

No TODO/FIXME/placeholder comments found in any Phase 3 files. No stub implementations detected in any component or server action.

### Human Verification Required

#### 1. Full Booking Flow End-to-End

**Test:** Log in, navigate to a vehicle, click Book Now, complete all 5 wizard steps (duration, delivery, deposit, identity, payment) with a Stripe test card.
**Expected:** Booking created, confirmation email received, booking appears in /bookings list.
**Why human:** Full multi-step form flow with Stripe test mode and Resend sandbox cannot be verified statically.

#### 2. Veriff Identity Verification Redirect

**Test:** Reach StepIdentity in the wizard, click the verification button, complete Veriff flow in test mode, return to /book/verify-callback.
**Expected:** Status polling detects verified state and wizard advances to payment step.
**Why human:** Veriff redirect + sessionStorage handoff requires browser runtime to test.

#### 3. Stripe Deposit Hold (after bug fix)

**Test:** After fixing stripe_event_id column name, complete a booking with deposit hold selected, verify payment_intent.requires_capture webhook updates deposit_status to held.
**Expected:** Booking shows deposit_status = held after webhook delivery.
**Why human:** Requires live Stripe webhook delivery (or Stripe CLI forwarding) to verify end-to-end.

### Gaps Summary

One blocker gap prevents full goal achievement: the Stripe webhook idempotency mechanism is broken due to a column name mismatch.

**Root cause:** app/api/webhooks/stripe/route.ts line 54 inserts `{ event_id: event.id, event_type: event.type }` but the migration defines stripe_webhook_events with `stripe_event_id TEXT PRIMARY KEY` (not event_id). The INSERT fails with a PostgreSQL column-not-found error. The webhook handler returns HTTP 500 on every delivery, causing Stripe to retry indefinitely. Payment and deposit statuses are never updated via webhook.

**Fix required (1 line):** Change `.insert({ event_id: event.id, event_type: event.type })` to `.insert({ stripe_event_id: event.id, event_type: event.type })` on line 54 of app/api/webhooks/stripe/route.ts.

All other 18 truths are fully verified. The booking wizard, pricing calculator, identity verification flow, payment intent creation, booking creation with server-side price revalidation, email confirmation, and booking history pages are all substantive and correctly wired.

---

_Verified: 2026-02-20T22:30:00Z_
_Verifier: Claude (gsd-verifier)_