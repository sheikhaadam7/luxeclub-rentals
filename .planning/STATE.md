# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Customers can select a luxury car, book instantly with dynamic pricing, and watch it come to them on a live map
**Current focus:** Phase 1 — Foundation + Auth Gate

## Current Position

Phase: 1 of 4 (Foundation + Auth Gate)
Plan: 3 of 3 in current phase
Status: Awaiting checkpoint (human-verify)
Last activity: 2026-02-20 — Plan 03 Task 1 complete: dark luxury design tokens + landing page. Paused at Task 2 checkpoint for end-to-end auth flow verification.

Progress: [██░░░░░░░░] 17% (2 of 12 total plans complete, Plan 03 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 6 min
- Total execution time: 0.20 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth-gate | 2/3 | 12 min | 6 min |

**Recent Trend:**
- Last 5 plans: 01-01 (8 min), 01-02 (4 min)
- Trend: Accelerating

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

### Pending Todos

- User must configure Supabase in .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
- User must run supabase/migrations/20260220000000_create_profiles.sql in Supabase SQL Editor
- User must enable Phone provider + Twilio credentials in Supabase Dashboard
- User must register UAE Twilio Sender ID (required before production SMS to +971 numbers)
- User must complete end-to-end auth flow verification (Plan 03 checkpoint:human-verify)

### Blockers/Concerns

- UAE legal review required before production PII storage (PDPL, RTA, VARA) — do not go live without this
- GPS tracker hardware vendor not yet selected — needed before Phase 4 tracking implementation
- KYC provider not yet selected (Onfido vs Jumio vs Persona) — needed before Phase 3 IDV build
- UAE Twilio Sender ID registration must be started in parallel (1-2 week approval timeline)

## Session Continuity

Last session: 2026-02-20
Stopped at: Plan 03 Task 1 committed (d492d6f) — paused at Task 2 checkpoint:human-verify for end-to-end auth flow and visual verification
Resume file: None
