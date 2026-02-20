---
phase: 01-foundation-auth-gate
plan: "02"
subsystem: auth
tags: [nextjs, supabase, middleware, react-hook-form, zod, mfa, phone-otp, route-protection]

# Dependency graph
requires:
  - phase: 01-01
    provides: Five auth Server Actions (signUp, enrollPhoneMFA, verifyPhoneMFA, login, logout), Supabase server client, Zod validation schemas
provides:
  - middleware.ts at project root — JWT-validated route protection via getClaims() on every request
  - app/(protected)/layout.tsx — defense-in-depth getClaims() check against CVE-2025-29927 middleware bypass
  - app/(protected)/dashboard/page.tsx — post-login shell displaying user email with logout button
  - components/auth/AuthGate.tsx — client-side login/signup/otp view toggler
  - components/auth/LoginForm.tsx — email + password form calling login Server Action
  - components/auth/SignupForm.tsx — two-step account + phone form calling signUp + enrollPhoneMFA
  - components/auth/OTPForm.tsx — 6-digit code form calling verifyPhoneMFA
  - components/ui/Button.tsx — shared button with variant (primary/ghost) and loading state
  - components/ui/Input.tsx — shared labeled input with error display
affects:
  - 01-03 (home page / gate UI will use AuthGate component and UI primitives)
  - All subsequent phases (route protection is live, all routes now require auth)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getClaims() for JWT validation in middleware (not getSession() which is unspoofable)
    - Inline createServerClient in middleware.ts (cannot use async createClient() in middleware)
    - Defense-in-depth: middleware + protected layout both validate session
    - startTransition + Server Action pattern for form submission with redirect
    - react-hook-form with zodResolver for all form validation
    - Two-step form state (account -> phone) managed with useState in SignupForm

key-files:
  created:
    - middleware.ts
    - app/(protected)/layout.tsx
    - app/(protected)/dashboard/page.tsx
    - components/auth/AuthGate.tsx
    - components/auth/LoginForm.tsx
    - components/auth/SignupForm.tsx
    - components/auth/OTPForm.tsx
    - components/ui/Button.tsx
    - components/ui/Input.tsx
  modified: []

key-decisions:
  - "getClaims() returns { claims: JwtPayload } not { user } — adapted all destructuring to use claims.email and claims presence as auth signal"
  - "Middleware uses inline createServerClient (not async createClient) — required by Next.js middleware constraints"
  - "Defense-in-depth: both middleware and protected layout check getClaims() — middleware is primary gate, layout catches CVE-2025-29927 bypass pattern"

patterns-established:
  - "Pattern: middleware uses inline createServerClient with request/response cookie adapter"
  - "Pattern: auth check = getClaims().data.claims presence (not getUser() or getSession())"
  - "Pattern: client forms use startTransition + Server Action (not form action prop) to handle server-side redirect"
  - "Pattern: AuthGate manages view state as 'login' | 'signup' | 'otp' with pendingMFA object"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 1 Plan 02: Middleware + Auth Form Components Summary

**Next.js middleware enforcing JWT-validated route protection via getClaims(), with LoginForm/SignupForm/OTPForm/AuthGate components wired to Server Actions via react-hook-form and startTransition**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-20T17:52:49Z
- **Completed:** 2026-02-20T17:56:49Z
- **Tasks:** 2
- **Files modified:** 9 created, 0 modified

## Accomplishments

- Middleware at project root protects all routes with JWT-validated getClaims() check — unauthenticated users hit / (login gate), authenticated users skip to /dashboard
- Defense-in-depth protected layout validates session independently of middleware (guards against CVE-2025-29927 middleware bypass)
- Complete auth form tree: AuthGate toggles between LoginForm, SignupForm (two-step: account + phone), and OTPForm — all connected to Server Actions from Plan 01
- Reusable Button and Input primitives with variant support, error states, and loading state

## Task Commits

Each task was committed atomically:

1. **Task 1: Middleware route protection and protected layout** - `9e063ec` (feat)
2. **Task 2: Auth form components (LoginForm, SignupForm, OTPForm, AuthGate)** - `8dac2fd` (feat)

## Files Created/Modified

- `middleware.ts` — Route protection using getClaims(); unauthenticated users redirected to /, authenticated users at / redirected to /dashboard
- `app/(protected)/layout.tsx` — Defense-in-depth getClaims() check; redirects to / if no valid JWT
- `app/(protected)/dashboard/page.tsx` — Post-login shell showing user email (from JWT claims) and logout button
- `components/auth/AuthGate.tsx` — Client-side view toggler: login (default) → signup → otp
- `components/auth/LoginForm.tsx` — Email + password form using react-hook-form + zodResolver, calls login() Server Action
- `components/auth/SignupForm.tsx` — Two-step form: email/password step then phone step, calls signUp() + enrollPhoneMFA()
- `components/auth/OTPForm.tsx` — 6-digit code entry calling verifyPhoneMFA(); redirect handled server-side
- `components/ui/Button.tsx` — Shared button with primary/ghost variants and loading state
- `components/ui/Input.tsx` — Labeled input with error display, implemented as forwardRef

## Decisions Made

- Adapted `getClaims()` destructuring to use `claimsData?.claims` (not `{ user }`) — the Supabase v2.97 API returns `{ claims: JwtPayload }`, not a user object. Email is at `claims.email`, auth presence is detected via `claims` being non-null.
- Middleware must use inline `createServerClient` (not the async `createClient` from lib/supabase/server) because middleware cannot await cookies().

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getClaims() return type mismatch**
- **Found during:** Task 1 (Middleware route protection)
- **Issue:** Plan code destructured `{ data: { user } }` from `getClaims()`, but Supabase v2.97 getClaims() returns `{ data: { claims: JwtPayload, header, signature } }` — there is no `user` property. TypeScript compilation failed with TS2339 errors in all three files (middleware.ts, layout.tsx, dashboard/page.tsx).
- **Fix:** Changed destructuring pattern to `const { data: claimsData } = await supabase.auth.getClaims()` and used `claimsData?.claims` as the auth signal. For dashboard user email, read `claims.email` directly from JwtPayload.
- **Files modified:** `middleware.ts`, `app/(protected)/layout.tsx`, `app/(protected)/dashboard/page.tsx`
- **Verification:** `npx tsc --noEmit` returns zero errors
- **Committed in:** `9e063ec` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for correctness — plan code referenced incorrect Supabase API response shape. Security intent preserved (getClaims() validates JWT signature, claims.email gives user info without extra network call). No scope creep.

## Issues Encountered

None beyond the getClaims() API mismatch documented above.

## User Setup Required

No additional user setup required beyond what was documented in Plan 01 (Supabase environment variables, profiles migration, phone MFA configuration).

## Next Phase Readiness

- Auth gate is fully functional: middleware + layout protection live, form components wired to Server Actions
- AuthGate is ready to be embedded in the home page (app/page.tsx) in Plan 03
- UI primitives (Button, Input) are ready for use in catalog and booking UI
- Design tokens (Tailwind @theme) planned for Plan 03 will extend the existing primitive components

---
*Phase: 01-foundation-auth-gate*
*Completed: 2026-02-20*

## Self-Check: PASSED

All claimed files exist on disk and all task commits verified in git log.
