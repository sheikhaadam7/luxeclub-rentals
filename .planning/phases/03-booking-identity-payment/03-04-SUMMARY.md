---
phase: 03-booking-identity-payment
plan: "04"
subsystem: api, ui, payments, webhooks
tags: [stripe, payment-intents, webhooks, server-actions, booking, apple-pay, google-pay, cash-on-delivery, deposit, idempotency]

# Dependency graph
requires:
  - phase: 03-booking-identity-payment
    plan: "02"
    provides: BookingWizard shell + StepDuration + StepDelivery + StepDepositChoice + PriceSummary
  - phase: 03-booking-identity-payment
    plan: "03"
    provides: StepIdentity component + Veriff KYC flow
provides:
  - app/actions/payments.ts — createRentalPaymentIntent, createDepositPaymentIntent, captureDeposit, voidDeposit
  - app/actions/bookings.ts — createBooking Server Action with server-side price revalidation
  - app/api/webhooks/stripe/route.ts — Stripe webhook handler with signature verification and idempotency
  - components/booking/StepPayment.tsx — payment step with PaymentElement, ExpressCheckoutElement, COD, cancellation policy
  - components/booking/BookingWizard.tsx — fully wired 5-step wizard with booking creation between identity and payment
affects: [03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server-side price revalidation: calculateBookingTotal called in Server Action before any PaymentIntent creation
    - Separate PaymentIntents for rental (automatic) and deposit (manual capture with extended auth)
    - Stripe webhook idempotency via stripe_webhook_events unique constraint (code 23505 = already processed)
    - Raw body req.text() for webhook signature verification before JSON.parse
    - loadStripe() called outside component to avoid re-initialization on re-renders
    - Sequential PI confirmation: rental first, then deposit via stripe.confirmCardPayment

key-files:
  created:
    - app/actions/payments.ts
    - app/actions/bookings.ts
    - app/api/webhooks/stripe/route.ts
    - components/booking/StepPayment.tsx
  modified:
    - components/booking/BookingWizard.tsx

key-decisions:
  - "Server-side price revalidation: vehicle rates fetched fresh from DB in createBooking — client-side prices never trusted"
  - "Separate PaymentIntents: rental uses capture_method:automatic, deposit uses capture_method:manual with request_extended_authorization:if_available"
  - "Cash bookings created with payment_status:pending_cash — no Stripe involvement"
  - "Idempotency via stripe_webhook_events unique constraint — duplicate events return 200 without reprocessing"
  - "payment_intent.requires_capture handled via string comparison — not in all Stripe SDK typed event unions"
  - "Back-from-payment guard: booking already created state preserved, warns user and skips recreation"
  - "PAY-04 (crypto payments) explicitly deferred — Stripe stablecoin US-only, NOWPayments for future phase"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 3 Plan 04: Payment Step and Booking Creation Summary

**Stripe PaymentElement + ExpressCheckoutElement payment step, server-side booking creation with price revalidation, separate rental/deposit PaymentIntents, and idempotent Stripe webhook handler**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T21:46:11Z
- **Completed:** 2026-02-20T21:50:31Z
- **Tasks:** 2
- **Files modified:** 5 (3 created new, 1 new + 1 updated)

## Accomplishments

- `createBooking` Server Action fetches vehicle rates server-side, calls `calculateBookingTotal` for authoritative pricing, inserts complete booking row, creates rental PaymentIntent (automatic capture) and deposit PaymentIntent (manual capture + extended auth) for card/wallet paths, sets `payment_status: 'pending_cash'` for cash path — no Stripe involvement on cash
- `createRentalPaymentIntent` / `createDepositPaymentIntent` create Stripe PaymentIntents with correct `capture_method`, metadata (`booking_id`, `user_id`, `type`), and persist PI ID to booking row
- `captureDeposit` / `voidDeposit` admin-only actions: call `stripe.paymentIntents.capture/cancel` and update `deposit_status`
- Stripe webhook at `/api/webhooks/stripe`: reads raw body via `req.text()`, verifies signature with `STRIPE_WEBHOOK_SECRET`, inserts into `stripe_webhook_events` for idempotency (code 23505 = skip), handles `succeeded` / `requires_capture` / `canceled` / `payment_failed` events to update `payment_status` / `deposit_status`
- `StepPayment`: dark luxury theme (`theme: 'night'`, `colorPrimary: #0099ff`), ExpressCheckoutElement at top for Apple/Google Pay auto-detection, PaymentElement for card input, deposit hold notice, cancellation policy card before pay button, cash on delivery confirmation path
- `BookingWizard` fully wired: `StepIdentity` with `vehicleSlug` and `onNext`, `createBooking` call between identity and payment steps, bookingId/clientSecrets in state, `router.push('/bookings/{id}')` on payment success, back-from-payment guard with warning notice, inline error display for booking creation failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Booking creation and payment Server Actions + Stripe webhook handler** - `b5c82d1` (feat)
2. **Task 2: Payment step component and wizard finalization** - `22fd568` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `app/actions/payments.ts` — createRentalPaymentIntent (automatic), createDepositPaymentIntent (manual + extended auth), captureDeposit/voidDeposit (admin-only)
- `app/actions/bookings.ts` — createBooking with server-side price revalidation, cash/card path branching, dual PaymentIntent creation
- `app/api/webhooks/stripe/route.ts` — POST handler with req.text(), signature verification, stripe_webhook_events idempotency, 4 event type handlers
- `components/booking/StepPayment.tsx` — Client component with Stripe Elements, ExpressCheckoutElement, PaymentElement, COD path, cancellation policy, deposit notice
- `components/booking/BookingWizard.tsx` — Fully wired 5-step wizard: StepIdentity + StepPayment integrated, createBooking between steps, router.push on success, back-from-payment guard

## Decisions Made

- Server-side price revalidation: `calculateBookingTotal` called with freshly-fetched vehicle rates prevents price manipulation from client side
- Separate PaymentIntents for rental vs deposit: enables independent capture/void lifecycle for the deposit hold
- Manual capture + extended auth: `capture_method: 'manual'` with `request_extended_authorization: 'if_available'` supports deposits held beyond Stripe's default 7-day window
- `payment_intent.requires_capture` handled via string comparison: not present in all Stripe TypeScript SDK event unions (version-dependent) — cast to `Stripe.PaymentIntent` via type assertion
- `loadStripe()` outside component: Stripe docs requirement to avoid re-initialization on re-renders
- Back-from-payment guard: once `bookingId` is set, going back to identity step shows informational notice and `advanceToPayment` skips re-creation on next call
- PAY-04 cryptocurrency payments: explicitly deferred — Stripe stablecoin is US-only, third-party processor (NOWPayments) deferred to future phase when demand validated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `payment_intent.requires_capture` not in Stripe SDK typed event union**
- **Found during:** Task 1
- **Issue:** Stripe SDK v20.3.1 TypeScript types don't include `payment_intent.requires_capture` in the `Stripe.Event` union, causing TS2678 error when used in `switch(event.type)`
- **Fix:** Converted switch to if/else string comparisons on `event.type as string`, cast event data to `Stripe.Event & { data: { object: Stripe.PaymentIntent } }` for all payment_intent handlers
- **Files modified:** `app/api/webhooks/stripe/route.ts`
- **Commit:** b5c82d1

## Issues Encountered

Pre-existing modified files in `components/auth/` (AuthGate.tsx, OTPForm.tsx, SignupForm.tsx) were present before this plan and were not staged or committed.

## User Setup Required

The following env vars must be set before end-to-end testing:

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys (Secret key) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard -> Developers -> API keys (Publishable key) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard -> Developers -> Webhooks -> Add endpoint -> Signing secret |

Stripe webhook URL to register: `{NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`

Events to enable: `payment_intent.succeeded`, `payment_intent.requires_capture`, `payment_intent.canceled`, `payment_intent.payment_failed`

## Next Phase Readiness

- Plan 03-05 can build `/bookings/{id}` confirmation page using `bookingId` from `createBooking`
- `captureDeposit` / `voidDeposit` ready for admin booking management UI
- Booking wizard is fully end-to-end: dates -> delivery -> deposit -> identity -> payment -> confirmation redirect

## Self-Check: PASSED

All expected files exist and all commits verified:
- FOUND: app/actions/payments.ts
- FOUND: app/actions/bookings.ts
- FOUND: app/api/webhooks/stripe/route.ts
- FOUND: components/booking/StepPayment.tsx
- FOUND: components/booking/BookingWizard.tsx (modified)
- FOUND: b5c82d1 (Task 1 commit)
- FOUND: 22fd568 (Task 2 commit)

---
*Phase: 03-booking-identity-payment*
*Completed: 2026-02-20*
