# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Customers can select a luxury car, book instantly with dynamic pricing, and watch it come to them on a live map
**Current focus:** Phase 3 COMPLETE — all 5 plans complete. Phase 4 (tracking/admin) next.

## Current Position

Phase: 3 of 4 (Booking, Identity, Payment) — COMPLETE
Plan: 03-01, 03-02, 03-03, 03-04, 03-05 all complete. Phase 4 next.
Status: Phase 3 fully complete — booking confirmation email, /bookings list, /bookings/[id] detail page, dashboard My Bookings card
Last activity: 2026-02-20 — Phase 3 Plan 05 complete. BookingConfirmationEmail + /bookings page + /bookings/[bookingId] detail page + email send in createBooking + dashboard My Bookings card.

Progress: [█████████░] 90% (Phase 1 + 2 + 3 complete, Phase 4 remaining)

## Performance Metrics

**Velocity:**
- Total plans completed: 10 (01-01, 01-02, 01-03, 02-01, 02-02, 03-01, 03-02, 03-03, 03-04, 03-05)
- Average duration: 5.6 min
- Total execution time: 0.95 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth-gate | 3/3 | 18 min | 6 min |
| 02-inventory-catalogue | 2/2 | 18 min | 9 min |
| 03-booking-identity-payment | 5/5 | 20 min | 4 min |

*Updated after each plan completion*
| Phase 03-booking-identity-payment P05 | 4 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Login-first gate: exclusive feel + legal requirement; middleware protects all routes
- Deferred verification: users can browse, identity verification triggered at first booking only
- No driver app for v1: all cars from Downtown Dubai office
- Scrape inventory from existing Framer site: avoids manual entry
- Use @supabase/ssr for all Supabase session handling
- Phone verification deferred for dev — email/password only currently active
- All auth operations via Server Actions — no auth logic in Client Components
- getClaims() returns { claims: JwtPayload } — use claimsData?.claims for auth signal
- Middleware uses inline createServerClient — required by Next.js middleware constraints
- Defense-in-depth: both middleware and protected layout validate getClaims()
- Tailwind v4 @theme block for design tokens
- Multi-page scrape pattern: click each brand filter, visit each /garage/{slug} detail page
- Scraper cycles 9 brand filters (Audi, Porsche, Bentley, Maserati, Aston Martin, Range Rover, Cadillac, Rolls Royce, Mercedes) — 26 vehicles total
- Weekly/monthly rates null in DB: site only shows daily rates
- Vehicle images uploaded to Supabase Storage — framerusercontent.com URLs not stable
- react-day-picker v9: removed deprecated mode="default" — use no-mode for view-only calendar
- Image gallery: stacked prefetched images, sharp arrows, progress bar indicator
- Admin role via profiles.role column, admin page gated by getClaims() + role check
- payment_status CHECK includes 'pending_cash' — required for cash booking INSERT support (Plan 04)
- Deposit excluded from totalDue — deposit is Stripe authorization hold, charged separately
- noDepositSurcharge uses daily_rate not weekly/monthly rate — consistent pricing incentive regardless of duration type
- vehicles.deposit_amount falls back to 5000 AED when NULL — matches current LuxeClub deposit pricing
- Zod v4 API: use 'error' not 'required_error' for date/required field error customization
- Veriff redirect flow chosen over iframe — mobile-first for UAE tourist demographic (80% mobile)
- sessionStorage used for booking context across Veriff redirect — preserves vehicle slug for return routing
- Admin client used in Veriff webhook handler — webhook has no user session, RLS bypass required
- 5-second polling interval in StepIdentity for submitted/pending KYC status auto-advancement
- Single useForm instance shared across all wizard steps — form.trigger() with step-specific field arrays
- PriceSummary rendered outside step area as sticky sidebar — price always visible from Step 1 onward
- MinimapFeature typed as GeoJSON.Feature<Point> — satisfies Mapbox AddressMinimap prop type requirements
- Fallback plain input rendered when NEXT_PUBLIC_MAPBOX_TOKEN not set — avoids crash in dev without token
- Server-side price revalidation in createBooking — vehicle rates fetched fresh, calculateBookingTotal called server-side, client-side prices never trusted
- Separate PaymentIntents for rental (automatic) and deposit (manual + extended auth) — independent capture/void lifecycle
- Stripe webhook idempotency via stripe_webhook_events unique constraint — code 23505 = already processed, return 200
- payment_intent.requires_capture handled via string comparison — not in all Stripe SDK typed event unions
- Back-from-payment guard in BookingWizard — bookingId preserved in state, advanceToPayment skips recreation on re-call
- PAY-04 (crypto payments) explicitly deferred — Stripe stablecoin US-only, NOWPayments for future phase
- [Phase 03-booking-identity-payment]: Email failure never fails the booking — sendEmail wrapped in try/catch, error logged only
- [Phase 03-booking-identity-payment]: Pickup/return method types: delivery/self_pickup and collection/self_dropoff (match Zod schema, not office/delivery)
- [Phase 03-booking-identity-payment]: Upcoming/past booking split done at render time via UTC date comparison — no DB filter

### Pending Todos

- User must register UAE Twilio Sender ID (required before production SMS)
- Phone verification to be re-added after Supabase MFA/phone setup resolved
- Apply migration 20260220200000_extend_bookings_phase3.sql to Supabase (supabase db push) before Plan 02+ can be tested
- Add Stripe, Veriff, Mapbox, and Resend env vars to .env.local before Phase 3 end-to-end testing
- Register Veriff webhook URL: {NEXT_PUBLIC_APP_URL}/api/webhooks/veriff in Veriff Dashboard
- Register Stripe webhook URL: {NEXT_PUBLIC_APP_URL}/api/webhooks/stripe with events: payment_intent.succeeded, payment_intent.requires_capture, payment_intent.canceled, payment_intent.payment_failed

### Blockers/Concerns

- UAE legal review required before production PII storage (PDPL, RTA, VARA)
- GPS tracker hardware vendor not yet selected — needed before Phase 4
- Veriff env vars (VERIFF_API_KEY, VERIFF_SHARED_SECRET, NEXT_PUBLIC_APP_URL) needed before KYC flow can be tested end-to-end
- Stripe env vars (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET) needed before payment flow can be tested end-to-end

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 03-05-PLAN.md — BookingConfirmationEmail React Email template, email send wired into createBooking (failure-tolerant), getUserBookings + getBookingDetail Server Actions, /bookings list page, /bookings/[bookingId] detail page, dashboard My Bookings card. Phase 3 COMPLETE.
Resume file: None
