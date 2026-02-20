# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Customers can select a luxury car, book instantly with dynamic pricing, and watch it come to them on a live map
**Current focus:** Phase 2 — Inventory Catalogue

## Current Position

Phase: 2 of 4 (Inventory Catalogue)
Plan: 2 of 3 in current phase (02-02 Tasks 1+2 complete, paused at Task 3 checkpoint:human-verify)
Status: Awaiting checkpoint (human-verify)
Last activity: 2026-02-20 — Plan 02-02 Tasks 1+2 complete: catalogue UI, vehicle cards, detail pages, availability calendar, admin page, vehicle override. Paused at Task 3 checkpoint for end-to-end catalogue and admin verification.

Progress: [████░░░░░░] 33% (4 of 12 total plans — 02-02 Tasks 1+2 complete, awaiting human checkpoints for 01-03, 02-01, and 02-02)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Plans in progress: 3 (01-03, 02-01, 02-02 — all paused at checkpoints)
- Average duration: 8 min
- Total execution time: 0.40 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth-gate | 2/3 | 12 min | 6 min |
| 02-inventory-catalogue | 0/3 | 18 min | — |

**Recent Trend:**
- Last 5 plans: 01-01 (8 min), 01-02 (4 min), 02-01 (6 min), 02-02 (12 min)
- Trend: Consistent 6-12 min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Login-first gate: exclusive feel + legal requirement; proxy.ts middleware protects all routes
- Deferred verification: users can browse, identity verification triggered at first booking only
- No driver app for v1: all cars from Downtown Dubai office
- Scrape inventory from existing Framer site: avoids manual entry
- Phase 1 research flag: UAE PDPL, RTA licensing, and Stripe UAE status must be verified with legal advisor before any production PII is stored
- Use @supabase/ssr (not deprecated @supabase/auth-helpers-nextjs) for all Supabase session handling
- Phone MFA via mfa.enroll/challenge/verify — NOT signInWithOtp (creates separate phone-only account)
- All auth operations via Server Actions — no auth logic in Client Components
- UAE phone accepts local format (0501234567), normalizes to E.164 (+971501234567) before Supabase MFA
- getClaims() returns { claims: JwtPayload } not { user } — Supabase v2.97 API; use claimsData?.claims for auth signal
- Middleware uses inline createServerClient (not async createClient) — required by Next.js middleware constraints
- Defense-in-depth: both middleware and protected layout validate getClaims() — guards against CVE-2025-29927 bypass
- Tailwind v4 @theme block for design tokens — auto-generates utility classes (bg-brand-cyan, font-display, border-brand-border, etc.)
- No motion/animation in Phase 1 — clean static layout for mobile-first (80% tourist devices, variable connections)
- Multi-page scrape pattern: /garage listing has daily rate only; visit each /garage/{slug} detail page for full specs/description/images
- Weekly/monthly rates null in DB: confirmed by DOM inspection — site only shows daily rates
- Vehicle images uploaded to Supabase Storage as {slug}/{index}.ext — framerusercontent.com CDN URLs are not stable
- Slugs extracted from URL path (/garage/{slug}) — more stable than generating from name for ON CONFLICT upsert
- react-day-picker v9 classNames keys verified from TypeScript types — differ from v8 (month_caption, caption_label, button_previous/next, day_button — NOT nav_button, caption)
- VehicleOverrideForm as Client Component island in /admin — keeps Server Component data fetching while isolating interactivity
- verifyAdmin() shared helper in admin.ts — reused across all admin Server Actions for DRY auth guard

### Pending Todos

- User must configure Supabase in .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) — DONE
- User must run supabase/migrations/20260220000000_create_profiles.sql in Supabase SQL Editor
- User must enable Phone provider + Twilio credentials in Supabase Dashboard
- User must register UAE Twilio Sender ID (required before production SMS to +971 numbers)
- User must complete end-to-end auth flow verification (Plan 01-03 checkpoint:human-verify)
- **User must add SUPABASE_SERVICE_ROLE_KEY to .env.local** (placeholder added)
- **User must run migration SQL: supabase/migrations/20260220100000_create_vehicles_bookings.sql**
- **User must create 'vehicle-images' storage bucket (public) in Supabase Dashboard**
- **User must run `npm run scrape` and verify output in Supabase Dashboard (Plan 02-01 checkpoint)**
- **User must verify catalogue UI and admin page (Plan 02-02 checkpoint:human-verify)**
- **To test /admin: UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';**

### Blockers/Concerns

- UAE legal review required before production PII storage (PDPL, RTA, VARA) — do not go live without this
- GPS tracker hardware vendor not yet selected — needed before Phase 4 tracking implementation
- KYC provider not yet selected (Onfido vs Jumio vs Persona) — needed before Phase 3 IDV build
- UAE Twilio Sender ID registration must be started in parallel (1-2 week approval timeline)

## Session Continuity

Last session: 2026-02-20
Stopped at: Plan 02-02 Tasks 1+2 committed (0797735, fc9e978) — paused at Task 3 checkpoint:human-verify for catalogue and admin page verification
Resume file: None
