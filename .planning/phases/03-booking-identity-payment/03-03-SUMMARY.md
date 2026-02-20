---
phase: 03-booking-identity-payment
plan: "03"
subsystem: api, ui, identity
tags: [veriff, kyc, identity-verification, server-actions, webhooks, hmac, next-js, supabase]

# Dependency graph
requires:
  - phase: 03-booking-identity-payment
    plan: "01"
    provides: profiles KYC columns (kyc_status, kyc_provider, kyc_session_id, kyc_verified_at), @veriff/js-sdk installed
provides:
  - app/actions/identity.ts — createVeriffSession() and getVerificationStatus() Server Actions
  - app/api/webhooks/veriff/route.ts — POST handler with HMAC-SHA256 signature verification, updates profiles.kyc_status
  - components/booking/StepIdentity.tsx — booking wizard identity step with status-dependent UI and 5s polling
  - components/identity/VeriffWidget.tsx — Veriff redirect-flow button component
  - app/(protected)/book/verify-callback/page.tsx — post-Veriff return page using sessionStorage routing
affects: [03-02, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Veriff redirect flow (not iframe) — mobile-first for UAE tourist demographic
    - sessionStorage booking context preservation across external redirect (booking_vehicle_slug key)
    - HMAC-SHA256 webhook signature verification using node:crypto createHmac
    - 5-second polling interval for submitted/pending KYC status auto-advancement
    - Admin client bypass for webhook profile updates (RLS bypass required — webhook has no user session)

key-files:
  created:
    - app/actions/identity.ts
    - app/api/webhooks/veriff/route.ts
    - components/booking/StepIdentity.tsx
    - components/identity/VeriffWidget.tsx
    - app/(protected)/book/verify-callback/page.tsx

key-decisions:
  - "Veriff redirect flow chosen over iframe — mobile-first UX for UAE tourists, per 03-RESEARCH.md"
  - "sessionStorage used for booking context across Veriff redirect — preserves vehicle slug for return routing"
  - "HMAC-SHA256 signature check using x-hmac-signature header before any profile update"
  - "Admin client used in webhook handler — webhook has no user session, RLS bypass required"
  - "5-second polling for submitted/pending status — balances UX responsiveness with server load"
  - "alreadyVerified early return in createVeriffSession — prevents duplicate sessions for verified users"

patterns-established:
  - "KYC flow pattern: createVeriffSession() -> Veriff redirect -> verify-callback -> StepIdentity polls getVerificationStatus() -> webhook fires -> auto-advance"
  - "Webhook pattern: read raw body -> HMAC verify -> parse JSON -> update via admin client -> return 200"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 3 Plan 03: Identity Verification (Veriff) Summary

**Veriff redirect-flow KYC integration with HMAC-verified webhook handler, status-polling StepIdentity component, and sessionStorage-based booking context restoration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T21:37:53Z
- **Completed:** 2026-02-20T21:40:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `createVeriffSession()` Server Action creates Veriff sessions via REST API, marks profiles.kyc_status='submitted', stores kyc_session_id — returns alreadyVerified:true for repeat calls on verified users
- HMAC-SHA256 webhook handler at `/api/webhooks/veriff` verifies `x-hmac-signature` header using node:crypto, maps approved/resubmission_requested/declined to verified/pending/rejected, updates profiles via admin client
- `StepIdentity` renders status-appropriate UI for all 5 KYC states, polls every 5s when submitted/pending, auto-advances on verified, and saves vehicleSlug to sessionStorage before Veriff redirect
- `verify-callback` page reads sessionStorage on mount, clears the key, and routes user back to `/book/{slug}` (fallback: `/catalogue`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Veriff server actions and webhook handler** - `78a762b` (feat)
2. **Task 2: StepIdentity component, VeriffWidget, and verify-callback page** - `0e3820f` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `app/actions/identity.ts` — createVeriffSession() and getVerificationStatus() Server Actions; uses createAdminClient() for profile writes
- `app/api/webhooks/veriff/route.ts` — POST webhook handler with HMAC-SHA256 verification, maps Veriff action to KYC status, updates profiles via admin client
- `components/booking/StepIdentity.tsx` — Booking wizard Step 4 with 5 status branches, 5s polling, sessionStorage pre-seeding before redirect, VeriffWidget integration
- `components/identity/VeriffWidget.tsx` — Client component with document checklist and "Start Verification" redirect button
- `app/(protected)/book/verify-callback/page.tsx` — Return page reads/clears sessionStorage slug, routes back to booking wizard

## Decisions Made

- Redirect flow over iframe: mobile-first for UAE tourists; iframe imposes cross-origin limitations on mobile WebViews
- sessionStorage for booking context: persists across same-origin redirect cycle, automatically scoped to tab
- HMAC signature check on raw body (before JSON.parse): required by Veriff spec and prevents signature bypass via body re-serialization
- Admin client in webhook handler: webhook POST has no user session cookie; normal supabase client would fail RLS
- 5-second polling interval: fast enough for near-real-time UX, avoids hammering Supabase with concurrent users

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors from Plan 02 (missing BookingWizard step components — StepDelivery Mapbox type, missing PriceSummary) were present before and after our changes. Our 5 new files have zero TypeScript errors. These are Plan 02 forward-declaration issues, not Plan 03 issues.

## User Setup Required

The following env vars must be set in `.env.local` before this flow can be tested end-to-end:

| Variable | Source |
|----------|--------|
| `VERIFF_API_KEY` | Veriff Dashboard -> Settings -> API keys (X-AUTH-CLIENT header) |
| `VERIFF_SHARED_SECRET` | Veriff Dashboard -> Settings -> Shared secret key (HMAC verification) |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL (e.g., https://luxeclubrentals.com) — used for Veriff callback |

Veriff webhook URL to register: `{NEXT_PUBLIC_APP_URL}/api/webhooks/veriff`

## Next Phase Readiness

- Plan 03-02 (booking wizard UI) can integrate StepIdentity as Step 4 — props: `vehicleSlug` and `onNext`
- Webhook endpoint ready for Veriff webhook registration once env vars are set
- KYC flow fully built; all Plans 04 and 05 can check `kyc_status === 'verified'` from profiles

## Self-Check: PASSED

All expected files exist and all commits verified:
- FOUND: app/actions/identity.ts
- FOUND: app/api/webhooks/veriff/route.ts
- FOUND: components/booking/StepIdentity.tsx
- FOUND: components/identity/VeriffWidget.tsx
- FOUND: app/(protected)/book/verify-callback/page.tsx
- FOUND: 78a762b (Task 1 commit)
- FOUND: 0e3820f (Task 2 commit)

---
*Phase: 03-booking-identity-payment*
*Completed: 2026-02-20*
