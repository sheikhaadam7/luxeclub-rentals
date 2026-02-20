# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Customers can select a luxury car, book instantly with dynamic pricing, and watch it come to them on a live map
**Current focus:** Phase 4 (tracking/admin) — Plans 01-03 complete. Plan 04 remaining.

## Current Position

Phase: 4 of 4 (Tracking + Admin) — IN PROGRESS
Plan: 04-03 complete. 04-04 remaining.
Status: Phase 4 Plan 03 complete — multi-tab admin operations dashboard (Fleet, Bookings) with full vehicle CRUD, availability blocks, and 6-status booking pipeline
Last activity: 2026-02-20 — Phase 4 Plan 03 complete. Multi-tab admin dashboard at /admin with URL ?tab= routing. FleetTab: scraper status, add vehicle, edit pricing/GPS/notes, is_active/is_available toggles, per-vehicle availability blocks. BookingsTab: all bookings with 6-status dropdown (including car_on_the_way/car_delivered), filters by status/vehicle/email/ref. 8 new admin Server Actions, all auth-gated.

Progress: [█████████░] 96% (Phase 1 + 2 + 3 complete, Phase 4 Plans 01-03 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 13 (01-01, 01-02, 01-03, 02-01, 02-02, 03-01, 03-02, 03-03, 03-04, 03-05, 04-01, 04-02, 04-03)
- Average duration: 5.2 min
- Total execution time: ~1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth-gate | 3/3 | 18 min | 6 min |
| 02-inventory-catalogue | 2/2 | 18 min | 9 min |
| 03-booking-identity-payment | 5/5 | 20 min | 4 min |
| 04-tracking-admin | 3/? | 15 min | 5 min |

*Updated after each plan completion*
| Phase 04-tracking-admin P01 | 3 | 3 tasks | 4 files |
| Phase 04-tracking-admin P02 | 4 | 2 tasks | 4 files |
| Phase 04-tracking-admin P03 | 8 | 2 tasks | 5 files |

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
- [Phase 04-tracking-admin]: vehicle_locations upsert-only — onConflict vehicle_id keeps one row per vehicle, prevents unbounded growth at GPS ping intervals
- [Phase 04-tracking-admin]: Upsert on PK triggers UPDATE Realtime event (not INSERT) — useVehicleLocation uses event '*' to catch both INSERT (first ping) and UPDATE (subsequent)
- [Phase 04-tracking-admin]: Unknown GPS device IDs return 200 with warning — prevents hardware retry storm on 4xx/5xx
- [Phase 04-tracking-admin]: is_active (admin permanent deactivation) distinct from is_available (scraper-managed) — both columns needed, different semantics
- [Phase 04-tracking-admin]: GPS ingest auth via x-gps-secret shared secret header validated against GPS_INGEST_SECRET env var
- [Phase 04-tracking-admin]: LiveTrackingMap uses useRef<mapboxgl.Map> (never useState) — prevents React reconciliation destroying map instance
- [Phase 04-tracking-admin]: showMap gated on pickup_method === 'delivery' + delivery_lat/delivery_lng — office pickup bookings don't get map (no coordinates)
- [Phase 04-tracking-admin]: Server-side vehicle_locations fetch in booking detail page is non-fatal (try/catch) — map degrades gracefully to destination-pin-only until GPS data arrives
- [Phase 04-tracking-admin]: FleetTab/BookingsTab are 'use client' components that self-fetch via useEffect — enables useTransition mutations + explicit refetch after mutation without full page reload
- [Phase 04-tracking-admin]: getAllBookings fetches profiles separately (not joined) — avoids Supabase join array type issues, cleaner TypeScript
- [Phase 04-tracking-admin]: Optimistic booking status update in BookingsTab — immediate setLocalStatus with revert on Server Action error

### Pending Todos

- User must register UAE Twilio Sender ID (required before production SMS)
- Phone verification to be re-added after Supabase MFA/phone setup resolved
- Apply migration 20260220200000_extend_bookings_phase3.sql to Supabase (supabase db push) before Plan 02+ can be tested
- Apply migration 20260220300000_tracking_admin_phase4.sql to Supabase (supabase db push) before Phase 4 features can be tested
- Add Stripe, Veriff, Mapbox, and Resend env vars to .env.local before Phase 3 end-to-end testing
- Add GPS_INGEST_SECRET env var to .env.local and production for GPS ingest route
- Register Veriff webhook URL: {NEXT_PUBLIC_APP_URL}/api/webhooks/veriff in Veriff Dashboard
- Register Stripe webhook URL: {NEXT_PUBLIC_APP_URL}/api/webhooks/stripe with events: payment_intent.succeeded, payment_intent.requires_capture, payment_intent.canceled, payment_intent.payment_failed
- Configure GPS hardware to POST to {NEXT_PUBLIC_APP_URL}/api/gps with x-gps-secret header

### Blockers/Concerns

- UAE legal review required before production PII storage (PDPL, RTA, VARA)
- GPS tracker hardware vendor not yet selected — needed before Phase 4 end-to-end GPS testing
- Veriff env vars (VERIFF_API_KEY, VERIFF_SHARED_SECRET, NEXT_PUBLIC_APP_URL) needed before KYC flow can be tested end-to-end
- Stripe env vars (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET) needed before payment flow can be tested end-to-end

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 04-03-PLAN.md — Multi-tab admin operations dashboard. FleetTab with vehicle CRUD (add/edit pricing/GPS/notes, is_active/is_available toggles, per-vehicle availability blocks), BookingsTab with all-bookings list and 6-status pipeline dropdown (triggers Realtime), AdminTabs 5-tab URL navigation, admin page rebuilt with ?tab= routing. 8 new Server Actions in app/actions/admin.ts. Phase 4 Plan 03 complete.
Resume file: None
