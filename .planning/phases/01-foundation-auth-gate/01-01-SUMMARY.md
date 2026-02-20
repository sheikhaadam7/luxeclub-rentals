---
phase: 01-foundation-auth-gate
plan: "01"
subsystem: auth
tags: [nextjs, supabase, typescript, tailwind, react-hook-form, zod, mfa, phone-otp]

# Dependency graph
requires: []
provides:
  - Next.js 16.1.6 app scaffolded with TypeScript, App Router, Turbopack, Tailwind v4
  - Supabase browser client (createBrowserClient via @supabase/ssr) for Client Components
  - Supabase server client (createServerClient via @supabase/ssr) for Server Components and Actions
  - Five auth Server Actions: signUp, enrollPhoneMFA, verifyPhoneMFA, login, logout
  - Zod schemas for all auth inputs: signUpSchema, loginSchema, phoneSchema, otpSchema
  - UAE phone normalizer: normalizeUAEPhone (local 0501234567 to E.164 +971501234567)
  - profiles table migration SQL with RLS and auto-create trigger
  - .env.local with Supabase URL and key placeholders
affects:
  - 01-02 (middleware and auth UI need these Server Actions and Supabase clients)
  - 01-03 (Tailwind design tokens build on this foundation globals.css)
  - All subsequent phases (auth is the foundation gate for everything)

# Tech tracking
tech-stack:
  added:
    - next@16.1.6 (App Router, Turbopack, next/font/google)
    - react@19.2.3
    - "@supabase/supabase-js@latest"
    - "@supabase/ssr@latest (replaces deprecated @supabase/auth-helpers-nextjs)"
    - react-hook-form@^7
    - zod@^3
    - "@hookform/resolvers"
    - clsx
    - tailwind-merge
    - tailwindcss@^4
    - "@tailwindcss/postcss@^4"
  patterns:
    - Supabase browser/server client split via @supabase/ssr (not auth-helpers)
    - Server Actions with 'use server' directive for all auth operations
    - Zod safeParse pattern returning { error } or { data } union types
    - UAE phone normalization before Supabase MFA enrollment
    - mfa.enroll + mfa.challenge + mfa.verify flow (NOT signInWithOtp)

key-files:
  created:
    - lib/supabase/client.ts
    - lib/supabase/server.ts
    - app/actions/auth.ts
    - lib/validations/auth.ts
    - supabase/migrations/20260220000000_create_profiles.sql
    - .env.local
  modified:
    - app/layout.tsx
    - app/globals.css
    - package.json

key-decisions:
  - "Use @supabase/ssr (not deprecated @supabase/auth-helpers-nextjs) for cookie-based sessions"
  - "Phone MFA via mfa.enroll/challenge/verify — NOT signInWithOtp which creates a separate phone-only account"
  - "Server Actions for all auth operations — no auth logic in Client Components"
  - "UAE phone validation accepts local format (0501234567) and normalizes to E.164 (+971501234567)"
  - "globals.css kept minimal (Tailwind import only) — design tokens deferred to Plan 03"

patterns-established:
  - "Pattern: createClient() imported from @/lib/supabase/server in Server Actions"
  - "Pattern: createClient() imported from @/lib/supabase/client in Client Components"
  - "Pattern: Zod safeParse with issues[0].message for first-error returns"
  - "Pattern: Server Actions return { error } or success payload (not throw)"

# Metrics
duration: 8min
completed: 2026-02-20
---

# Phase 1 Plan 01: Foundation + Auth Gate Summary

**Next.js 16 + Supabase SSR scaffolded with email/password + phone MFA Server Actions (mfa.enroll/challenge/verify), Zod validation schemas, and profiles RLS migration**

## Performance

- **Duration:** 8 minutes
- **Started:** 2026-02-20T17:41:30Z
- **Completed:** 2026-02-20T17:49:30Z
- **Tasks:** 2
- **Files modified:** 9 created, 2 modified

## Accomplishments

- Scaffolded Next.js 16.1.6 with Turbopack, TypeScript, Tailwind v4, App Router — dev server starts cleanly
- Wired Supabase browser and server clients via @supabase/ssr with correct cookie adapter pattern
- Implemented all five auth Server Actions with Zod validation and correct MFA API usage
- Created profiles table migration SQL with Row Level Security and auto-create trigger

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 app and wire Supabase clients** - `b4288c1` (feat)
2. **Task 2: Database schema, Zod validation, and auth Server Actions** - `e8ca927` (feat)

## Files Created/Modified

- `lib/supabase/client.ts` - createBrowserClient wrapper for Client Components
- `lib/supabase/server.ts` - createServerClient async wrapper for Server Components and Actions
- `app/layout.tsx` - Playfair Display + Inter fonts via next/font/google, LuxeClub metadata
- `app/globals.css` - Tailwind v4 import only (tokens deferred to Plan 03)
- `.env.local` - Supabase URL and publishable key placeholders
- `app/actions/auth.ts` - Five auth Server Actions (signUp, enrollPhoneMFA, verifyPhoneMFA, login, logout)
- `lib/validations/auth.ts` - Zod schemas: signUpSchema, loginSchema, phoneSchema, otpSchema, normalizeUAEPhone
- `supabase/migrations/20260220000000_create_profiles.sql` - profiles table, RLS policies, auto-create trigger
- `package.json` - All dependencies added

## Decisions Made

- Used `@supabase/ssr` instead of deprecated `@supabase/auth-helpers-nextjs` (deprecated Jan 2026)
- Used `mfa.enroll/challenge/verify` for phone MFA — `signInWithOtp({ phone })` creates a separate phone-only account (wrong)
- Server Actions for all auth — no client-side auth logic
- globals.css kept minimal — Plan 03 will add `@theme` Tailwind design tokens

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ZodError.errors → ZodError.issues API**
- **Found during:** Task 2 (auth Server Actions)
- **Issue:** Plan code used `parsed.error.errors[0].message` but Zod v3 uses `.issues` not `.errors` — TypeScript compilation failed with TS2339 errors on all four `safeParse` calls
- **Fix:** Replaced `.errors` with `.issues` in all four Zod error access patterns in `app/actions/auth.ts`
- **Files modified:** `app/actions/auth.ts`
- **Verification:** `npx tsc --noEmit` returns zero errors
- **Committed in:** `e8ca927` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for correctness — plan code referenced incorrect Zod API property. No scope creep.

## Issues Encountered

- `create-next-app` rejected directory name `newProj1` (capital letters in npm package names are forbidden). Scaffolded into `luxeclub-rentals` subdirectory and moved files to project root. Package name is `luxeclub-rentals` (valid).

## User Setup Required

The Supabase integration requires manual configuration before auth will function. The user must:

1. **Set environment variables** in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard > Project Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from Supabase Dashboard > Project Settings > API > Publishable (anon) key

2. **Run the profiles migration** in Supabase Dashboard > SQL Editor:
   - Paste and run `supabase/migrations/20260220000000_create_profiles.sql`

3. **Enable Phone MFA** in Supabase Dashboard:
   - Authentication > Providers > Phone > Enable, set provider to Twilio
   - Add Twilio Account SID, Auth Token, and Message Service SID
   - Authentication > Multi-Factor Authentication > Enable phone MFA

4. **Register UAE Twilio Sender ID** (required for production — UAE carriers block unregistered senders)

## Next Phase Readiness

- Auth Server Actions are ready to be called from UI forms (Plan 02)
- Supabase clients are ready for middleware (Plan 02)
- Tailwind foundation is in place for design tokens (Plan 03)
- Zero TypeScript errors, dev server starts cleanly

---
*Phase: 01-foundation-auth-gate*
*Completed: 2026-02-20*

## Self-Check: PASSED

All claimed files exist and all commits verified on disk.
