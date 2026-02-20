# Phase 1: Foundation + Auth Gate - Research

**Researched:** 2026-02-20
**Domain:** Next.js 16 App Router + Supabase Auth (email/password + phone OTP MFA) + Tailwind CSS v4 dark luxury UI
**Confidence:** HIGH (stack verified via npm registry, official Next.js docs, official Supabase docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Landing page aesthetic
- "Secret service" exclusive feel — dark, minimal, mysterious
- Match luxeclubrentals.com: black background, cyan (#09f) accents
- Typography: Playfair Display for headings, Inter/Poppins for body
- Login and signup on the same page (toggle between them)

#### Auth flow
- Email + password for account creation
- Phone OTP verification during signup (not deferred)
- Session persists across browser refresh
- Logout available from any page, returns to login gate
- No social login for v1 — email/password only

#### Post-login shell
- All routes protected behind auth middleware
- User can browse car catalogue after login (verification deferred to booking)
- Mobile-responsive from day one (80% tourists on phones)

### Claude's Discretion
- Exact landing page animation/motion design
- Navigation layout (sidebar vs top nav vs minimal)
- Loading states and error message design
- Exact spacing, padding, component sizing
- Auth error UX (invalid password, OTP expiry, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

This phase stands up the full Next.js 16 App Router project with Supabase as the auth backend. The auth model uses email/password for the primary credential and Supabase Phone MFA (mfa.enroll + mfa.challenge + mfa.verify) to enforce phone OTP verification during the signup flow — this is the correct Supabase pattern for phone verification alongside email/password, not `signInWithOtp` (which is passwordless-only). Route protection is implemented via `middleware.ts` using `@supabase/ssr`, with `supabase.auth.getClaims()` as the secure session check.

The UI is built with Tailwind CSS v4 using its CSS-first `@theme` directive for design tokens. Google Fonts (Playfair Display + Inter) are self-hosted via Next.js `next/font/google` — zero external network requests, no layout shift. The dark luxury aesthetic uses black background (#000 or #0a0a0a), cyan accent (#0099ff), radial gradients, and Playfair Display headings. All motion/animation decisions are Claude's discretion.

Two critical security risks discovered: (1) Next.js middleware had a critical auth bypass vulnerability (CVE-2025-29927) patched in Next.js 15.2.3+ / 16.x; current latest (16.1.6) is patched. (2) The UAE requires **registered Sender IDs** for all SMS via Twilio — the project must register an alphanumeric Sender ID before phone OTP works in production. OTP transactional messages are not restricted by UAE's promotional time-window rule, but Sender ID registration is mandatory.

**Primary recommendation:** Scaffold with `npx create-next-app@latest` (defaults: TypeScript, Tailwind v4, App Router, Turbopack), connect Supabase with `@supabase/ssr@0.8.0`, implement phone as MFA via `supabase.auth.mfa.*` API (not `signInWithOtp`), and register a Twilio Sender ID for UAE before any production SMS.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | Framework — App Router, middleware, SSR, image/font optimization | Latest stable (Dec 2025); Turbopack default; all security CVEs patched |
| react + react-dom | 19.2.x (bundled) | UI runtime | Shipped with Next.js 16; includes Server Components, Actions |
| typescript | 5.1+ | Type safety | Default in `create-next-app`; Next.js has first-class TS support |
| @supabase/supabase-js | 2.97.0 | Supabase client — auth, DB queries | Official client; used in all Supabase docs |
| @supabase/ssr | 0.8.0 | SSR-safe Supabase client for Next.js | Official replacement for deprecated `@supabase/auth-helpers-nextjs`; handles cookie-based sessions for App Router |
| tailwindcss | 4.2.0 | Utility-first CSS | v4 is current stable; CSS-first config; built-in radial gradients |
| @tailwindcss/postcss | 4.2.0 | PostCSS plugin for Tailwind v4 | Required v4 integration (replaces v3's `tailwindcss` PostCSS plugin) |
| postcss | latest | CSS processing pipeline | Required peer of `@tailwindcss/postcss` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/font/google | (bundled with next) | Self-hosted Google Fonts with zero layout shift | Use for Playfair Display + Inter — avoids external requests to Google |
| react-hook-form | ^7 | Form state, validation | Auth forms (login/signup toggles) — avoids uncontrolled re-renders |
| zod | ^3 | Schema validation | Validate email format, password strength, phone number format before calling Supabase |
| clsx or tailwind-merge | latest | Conditional class merging | Managing auth state classes, error/loading variants without conflicts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated — bugs/features will not be backported |
| Tailwind CSS v4 | Tailwind CSS v3 | v3 requires `tailwind.config.js`; v4 CSS-first is simpler for design tokens |
| next/font/google | @fontsource/* | next/font gives automatic self-hosting + display swap; fontsource requires manual config |
| Phone MFA via mfa.* API | signInWithOtp (phone) | signInWithOtp is passwordless-only; mfa.* is the correct path for phone verification on top of email/password |

**Installation:**
```bash
npx create-next-app@latest luxeclub --typescript --app --yes
# (enables TypeScript, Tailwind v4, ESLint, App Router, Turbopack by default)

cd luxeclub
npm install @supabase/supabase-js@latest @supabase/ssr@latest
npm install react-hook-form zod @hookform/resolvers
npm install clsx tailwind-merge
```

---

## Architecture Patterns

### Recommended Project Structure
```
luxeclub/
├── app/
│   ├── layout.tsx              # Root layout: fonts, global CSS, auth provider
│   ├── page.tsx                # Login/Signup gate (public — redirects if authed)
│   ├── (auth)/
│   │   └── page.tsx            # Alias for login gate if needed
│   └── (protected)/
│       ├── layout.tsx          # Auth check — redirects to / if no session
│       ├── catalogue/
│       │   └── page.tsx        # Car browse (Phase 2+)
│       └── dashboard/
│           └── page.tsx        # Post-login landing
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx       # Email + password form
│   │   ├── SignupForm.tsx      # Email + password form
│   │   └── OTPForm.tsx         # Phone OTP entry (MFA step)
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createBrowserClient (Client Components)
│   │   ├── server.ts           # createServerClient (Server Components, Actions)
│   │   └── middleware.ts       # updateSession helper for middleware.ts
│   └── validations/
│       └── auth.ts             # Zod schemas for email, password, phone
├── app/
│   └── actions/
│       └── auth.ts             # Server Actions: signUp, logIn, logOut, enrollPhone, verifyOTP
├── middleware.ts               # Session refresh + route protection (project root)
└── app/globals.css             # Tailwind @import + @theme design tokens
```

### Pattern 1: Middleware Route Protection with @supabase/ssr

**What:** `middleware.ts` at project root intercepts every request, refreshes the Supabase auth token, and redirects unauthenticated users to `/`.

**When to use:** Always — this is the single auth enforcement point. Protects against stale cookies by re-validating on every request.

**Security note:** Use `supabase.auth.getClaims()` (validates JWT signatures against public keys) not `supabase.auth.getSession()` (only checks format/expiry, can be spoofed).

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// middleware.ts (project root)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ALWAYS use getClaims() on the server — validates JWT signature.
  // getSession() is insecure server-side (does not revalidate token).
  const { data: { user } } = await supabase.auth.getClaims()

  const isAuthRoute = request.nextUrl.pathname === '/'
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/(protected)')
    || !isAuthRoute

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Skip static assets, images, favicon
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 2: Email + Password Signup with Phone MFA Enrollment

**What:** Two-step signup: (1) `supabase.auth.signUp()` with email+password, (2) immediately after, enroll phone via `supabase.auth.mfa.enroll()` and verify via `mfa.challenge()` + `mfa.verify()`.

**When to use:** This is the correct Supabase pattern for "phone OTP during signup alongside email/password." `signInWithOtp({ phone })` is passwordless-only and creates a phone-only account — do NOT use it here.

```typescript
// Source: https://supabase.com/docs/guides/auth/auth-mfa/phone
// app/actions/auth.ts — Server Actions

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Step 1: Create account
export async function signUp(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }
  return { userId: data.user?.id }
}

// Step 2: Enroll phone as MFA factor (called after signUp succeeds)
export async function enrollPhone(phone: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(/* ... same config ... */)

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'phone',
    phone, // E.164 format: +971501234567
  })

  if (error) return { error: error.message }
  // Returns: { id: factorId, ... }
  return { factorId: data.id }
}

// Step 3: Send OTP challenge
export async function challengePhone(factorId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(/* ... */)

  const { data, error } = await supabase.auth.mfa.challenge({ factorId })
  if (error) return { error: error.message }
  return { challengeId: data.id }
}

// Step 4: Verify the OTP code
export async function verifyPhone(factorId: string, challengeId: string, code: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(/* ... */)

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  })

  if (error) return { error: error.message }
  return { success: true }
}
```

### Pattern 3: Dark Luxury Design Tokens with Tailwind v4

**What:** CSS-first design system using `@theme` in `globals.css`. Defines brand colors, fonts, and custom utilities as CSS variables that Tailwind auto-generates utility classes from.

**When to use:** Phase 1 only — establish these tokens once. All future phases inherit them.

```css
/* Source: https://tailwindcss.com/docs/theme */
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Brand Colors */
  --color-brand-black: #000000;
  --color-brand-surface: #0a0a0a;
  --color-brand-border: rgba(255, 255, 255, 0.15);  /* 15% opacity borders */
  --color-brand-cyan: #0099ff;     /* #09f = #0099ff */
  --color-brand-cyan-hover: #0077cc;
  --color-brand-text: #ffffff;
  --color-brand-muted: rgba(255, 255, 255, 0.6);

  /* Typography */
  --font-display: "Playfair Display", Georgia, serif;
  --font-body: "Inter", "Poppins", system-ui, sans-serif;

  /* Spacing & Radii */
  --radius-card: 0.75rem;
}

/* Radial gradient background (dark to black) */
.bg-luxury {
  background: radial-gradient(
    ellipse at center top,
    #1a1a1a 0%,
    #000000 70%
  );
}
```

### Pattern 4: Google Fonts via next/font (Multiple Fonts)

**What:** Import Playfair Display and Inter from `next/font/google` with CSS variables, apply both to `<html>`. Self-hosted, zero layout shift, no Google network requests from browser.

```typescript
// Source: https://nextjs.org/docs/app/getting-started/fonts
// app/layout.tsx
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="bg-brand-black font-body text-brand-text antialiased">
        {children}
      </body>
    </html>
  )
}
```

### Pattern 5: Login/Signup Toggle (Same Page)

**What:** Single page at `/` with client-side toggle between login and signup views. No page navigation — React state switches the displayed form.

**When to use:** Matches user decision: "login and signup on the same page."

```typescript
// components/auth/AuthGate.tsx
'use client'
import { useState } from 'react'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

type AuthView = 'login' | 'signup' | 'otp'

export function AuthGate() {
  const [view, setView] = useState<AuthView>('login')
  const [pendingMFA, setPendingMFA] = useState<{
    factorId: string
    challengeId: string
  } | null>(null)

  if (view === 'otp' && pendingMFA) {
    return <OTPForm {...pendingMFA} onSuccess={() => window.location.href = '/dashboard'} />
  }

  return view === 'login'
    ? <LoginForm onSwitch={() => setView('signup')} />
    : <SignupForm onPhoneStep={(mfa) => { setPendingMFA(mfa); setView('otp') }} onSwitch={() => setView('login')} />
}
```

### Anti-Patterns to Avoid

- **Using `supabase.auth.getSession()` on the server:** Insecure — does not validate JWT signature. Use `getClaims()` in middleware and Server Components.
- **Using `signInWithOtp({ phone })` for phone verification during signup:** This creates a separate phone-only account, not an MFA factor. Use `mfa.enroll()` instead.
- **Protecting routes only in Server Component layouts:** Middleware runs before RSC rendering. Double-checking in layout is defense-in-depth, but middleware is the authoritative gate.
- **Blocking ALL routes in middleware including static assets:** Always use the provided `matcher` pattern to skip `_next/static`, `_next/image`, and image files, or dev server slows to a crawl.
- **Using `@supabase/auth-helpers-nextjs`:** Deprecated as of January 2026. Use `@supabase/ssr` only.
- **Storing phone numbers in Supabase before UAE legal review:** Prior decision flags that UAE PDPL and RTA licensing must be verified with legal counsel before storing PII in production.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management across SSR/CSR | Custom cookie/JWT logic | `@supabase/ssr` createServerClient + createBrowserClient | Cookie synchronization between server and browser has subtle race conditions; Supabase SSR handles the cookie adapter pattern correctly |
| Token refresh on navigation | Custom refresh polling | Supabase middleware (`updateSession` / `getClaims()` on every request) | Middleware runs on every request; Supabase auto-refreshes the token in place and writes the updated cookie |
| Phone OTP delivery | Custom SMS integration | Supabase MFA + Twilio (configured in Supabase dashboard) | Supabase abstracts Twilio API, rate limiting, retry logic, and OTP expiry |
| Font optimization | Self-download and host fonts | `next/font/google` | Automatic subsetting, preloading, display swap, zero layout shift — eliminates a class of CLS bugs |
| Route protection per-page | Auth checks in every Server Component | Single `middleware.ts` | Middleware runs before rendering; per-page checks are defense-in-depth only, never the primary gate |
| Form state management | Controlled input state in React | `react-hook-form` | Uncontrolled inputs, built-in validation integration, error state, loading state without extra boilerplate |
| CSS design tokens | CSS custom properties in `:root` only | Tailwind v4 `@theme` | `@theme` auto-generates utility classes; `:root` alone doesn't |

**Key insight:** The Supabase + Next.js App Router combination has specific integration requirements (cookie adapters, server/browser client split) that are easy to get wrong and cause session loss on refresh. The `@supabase/ssr` package encapsulates all of this correctly — any custom session management will miss edge cases.

---

## Common Pitfalls

### Pitfall 1: Using `getSession()` Instead of `getClaims()` in Middleware

**What goes wrong:** Session appears valid but can be spoofed via crafted cookies. Security auditors will flag this. Supabase explicitly documents this as a vulnerability.

**Why it happens:** `getSession()` only checks JWT format and expiry. `getClaims()` validates the JWT signature against Supabase's public keys on every call.

**How to avoid:** In `middleware.ts` and any Server Component that gates access, always call `supabase.auth.getClaims()`. On the client side, `getSession()` is acceptable for performance (already validated server-side).

**Warning signs:** Docs or tutorials older than mid-2024 use `getSession()` in middleware — these are outdated.

### Pitfall 2: Phone OTP Uses Wrong Supabase API

**What goes wrong:** `signInWithOtp({ phone })` creates a new phone-only user account, not a phone verification step for an email/password user. User ends up with two separate accounts.

**Why it happens:** Supabase has two separate phone systems: `signInWithOtp` (passwordless login) and `mfa.enroll` (phone as a second factor on an existing account). The distinction is not obvious from the function names.

**How to avoid:** After `signUp()` succeeds, call `mfa.enroll({ factorType: 'phone', phone })` then `mfa.challenge()` then `mfa.verify()`. Do not call `signInWithOtp`.

**Warning signs:** After signup, `auth.users` shows two separate rows for the same person.

### Pitfall 3: Twilio UAE Sender ID Not Registered

**What goes wrong:** SMS messages to UAE (+971) numbers are silently blocked by UAE carriers. The Supabase/Twilio call succeeds with 200, but the user never receives the SMS.

**Why it happens:** UAE requires all SMS senders to use a pre-registered Alphanumeric Sender ID. Unregistered IDs are blocked at the carrier level — Twilio does not surface this as an error.

**How to avoid:** Register an Alphanumeric Sender ID with Twilio for the UAE (`AE`) region before any production testing. Requires business documentation. Budget 1-2 weeks for approval.

**Warning signs:** OTP flow works in development (no UAE SIM), fails on real UAE numbers in production.

### Pitfall 4: Next.js Middleware Security Bypass (CVE-2025-29927)

**What goes wrong:** Attackers can bypass middleware entirely by sending the `x-middleware-subrequest` header, accessing protected routes without authentication.

**Why it happens:** Was a vulnerability in Next.js ≤15.2.2. Patched in 15.2.3 and all 16.x versions.

**How to avoid:** Use Next.js 16.1.6 (current latest as of 2026-02-20). Always `npm install next@latest` before deploying. Add defense-in-depth auth checks in layout.tsx for critical pages (not just middleware).

**Warning signs:** Running Next.js <15.2.3 in production with middleware-based auth.

### Pitfall 5: Route Group Naming Causes Middleware Matcher Miss

**What goes wrong:** Routes inside `(protected)/` are not matched by the middleware `matcher` config, leaving them unprotected.

**Why it happens:** Next.js route groups (parentheses folders) are stripped from the URL. The URL `/dashboard` is not `/\(protected\)/dashboard`. Middleware matcher patterns match the URL, not the filesystem path.

**How to avoid:** Match on URL patterns (`/dashboard`, `/catalogue`, etc.) not filesystem paths. Or use a negative matcher that protects all routes except the login gate at `/`.

**Warning signs:** Typing `/dashboard` directly in the browser redirects you, but `/catalogue` does not.

### Pitfall 6: Tailwind v4 vs v3 Config Mismatch

**What goes wrong:** `tailwind.config.js` from a v3 project doesn't work in v4. The `theme.extend.colors` pattern from v3 is replaced by `@theme` in globals.css.

**Why it happens:** Tailwind v4 is a breaking change from v3. `create-next-app` now scaffolds v4 by default.

**How to avoid:** Use `@theme` in `globals.css` for all custom design tokens. Do not create `tailwind.config.js` unless specifically needed for plugins. PostCSS config uses `@tailwindcss/postcss` not `tailwindcss`.

**Warning signs:** `module.exports = { theme: { extend: { colors: { ... } } } }` in project root.

---

## Code Examples

Verified patterns from official sources:

### Supabase Browser Client (for Client Components)

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Supabase Server Client (for Server Components and Actions)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — cookies() is read-only.
            // The middleware handles writes. This try/catch is intentional.
          }
        },
      },
    }
  )
}
```

### Login Server Action

```typescript
// Source: https://supabase.com/docs/guides/auth/quickstarts/nextjs
// app/actions/auth.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
```

### Phone MFA Enrollment (Post-Signup)

```typescript
// Source: https://supabase.com/docs/guides/auth/auth-mfa/phone
// app/actions/auth.ts (continued)

export async function enrollPhoneMFA(phone: string) {
  const supabase = await createClient()

  // Enroll phone as MFA factor
  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'phone',
    phone, // Must be E.164 format: +971501234567
  })
  if (enrollError) return { error: enrollError.message }

  // Immediately send challenge (SMS OTP)
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: enrollData.id,
  })
  if (challengeError) return { error: challengeError.message }

  return {
    factorId: enrollData.id,
    challengeId: challengeData.id,
  }
}

export async function verifyPhoneMFA(factorId: string, challengeId: string, code: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  })

  if (error) return { error: error.message }
  redirect('/dashboard')
}
```

### Protected Layout (Defense-in-Depth)

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// app/(protected)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getClaims()

  if (!user) {
    redirect('/')
  }

  return <>{children}</>
}
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Note: Supabase docs now reference SUPABASE_PUBLISHABLE_KEY (not ANON_KEY)
# Check your project dashboard for the exact variable name expected
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Jan 2026 (deprecated) | Must migrate — auth-helpers will not receive security fixes |
| `supabase.auth.getSession()` in middleware | `supabase.auth.getClaims()` | 2024-2025 | getSession is insecure server-side; getClaims validates JWT signature |
| `tailwind.config.js` (v3) | `@theme` in `globals.css` (v4) | Tailwind v4 (stable 2025) | CSS-first config; no JS config file needed |
| Webpack (Next.js default bundler) | Turbopack (new default) | Next.js 16 | Turbopack is now default for dev AND build; significantly faster |
| `next/font` with `tailwind.config.js` fontFamily | `next/font` with `@theme --font-*` CSS variables | Tailwind v4 | Font variables defined in @theme auto-generate `font-display`, `font-body` utilities |
| `auth-helpers` cookie handling | `@supabase/ssr` cookie adapter | 2024 | New pattern requires explicit `getAll`/`setAll` cookie methods |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated Jan 2026. Use `@supabase/ssr`.
- `supabase.auth.getSession()` on server: Insecure. Use `getClaims()`.
- Tailwind `tailwind.config.js` for custom colors/fonts: Replaced by CSS `@theme` in v4.
- Next.js Webpack dev bundler: Turbopack is now the default (`next dev` uses Turbopack automatically).

---

## Open Questions

1. **Phone OTP flow UX: client-side or server-side MFA calls?**
   - What we know: `mfa.enroll()` and `mfa.verify()` can be called from Server Actions or Client Components. Challenge/verify need the factorId and challengeId to be passed between steps.
   - What's unclear: Whether Server Actions or a client-side flow is simpler for the multi-step signup (signUp → enrollPhone → enterOTP).
   - Recommendation: Use Client Component for the OTP step (real-time OTP entry with resend timer) backed by Server Actions for the actual Supabase calls. Factor IDs passed via component state, not URL.

2. **UAE Sender ID registration timeline**
   - What we know: UAE requires pre-registered Alphanumeric Sender ID for all SMS. Twilio provides the registration path.
   - What's unclear: How long UAE Sender ID approval takes in 2026, and whether a development fallback (non-UAE test numbers) is sufficient until production.
   - Recommendation: Start Twilio UAE Sender ID registration in parallel with Phase 1 development. Use non-UAE test numbers during development. Do NOT launch to UAE users until Sender ID is approved.

3. **Supabase env var name: ANON_KEY vs PUBLISHABLE_KEY**
   - What we know: Official docs now reference `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Older projects used `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - What's unclear: Whether the Supabase dashboard has migrated to using "Publishable Key" terminology or still shows "Anon Key" in the UI.
   - Recommendation: Check the project's Supabase dashboard at project creation. The key value is the same; only the name differs. Use whatever label the dashboard shows.

4. **Phone number format validation before Supabase**
   - What we know: Supabase MFA requires E.164 format (+971501234567).
   - What's unclear: Whether to accept a bare number (0501234567) and normalize to UAE (+971) or require users to enter full international format.
   - Recommendation: Claude's discretion — accept local UAE format and prepend +971 client-side for UX. Validate with a Zod regex pattern before submitting to Supabase.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (v16.1.6, fetched 2026-02-20) — installation, fonts, middleware, App Router structure — https://nextjs.org/docs/app/getting-started/installation
- Next.js official docs — fonts (next/font/google) — https://nextjs.org/docs/app/getting-started/fonts
- Supabase official docs — Server-side auth with Next.js — https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase official docs — Phone MFA — https://supabase.com/docs/guides/auth/auth-mfa/phone
- Supabase official docs — Phone Login (signInWithOtp) — https://supabase.com/docs/guides/auth/phone-login
- Supabase official docs — Auth quickstart for Next.js — https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Tailwind CSS official docs (v4.2) — Installation with Next.js — https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Tailwind CSS official docs — Theme variables / @theme directive — https://tailwindcss.com/docs/theme
- npm registry — `next@16.1.6`, `@supabase/ssr@0.8.0`, `@supabase/supabase-js@2.97.0`, `tailwindcss@4.2.0` (verified via `npm view` 2026-02-20)

### Secondary (MEDIUM confidence)
- Next.js Security Advisory CVE-2025-29927 — https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass (verified against official Next.js blog)
- Next.js Security Update Dec 2025 (CVE-2025-55183, CVE-2025-55184) — https://nextjs.org/blog/security-update-2025-12-11
- Twilio UAE SMS Guidelines — https://www.twilio.com/en-us/guidelines/ae/sms (verified that UAE requires registered Sender IDs)
- Next.js 16.1 release notes — https://nextjs.org/blog/next-16-1 (Turbopack stable, latest version confirmed Dec 2025)

### Tertiary (LOW confidence — flag for validation)
- Supabase `getClaims()` vs `getUser()` distinction: community discussion https://github.com/orgs/supabase/discussions/28983 — the docs referenced `getClaims()` but some official code samples still show `getUser()`. Verify which method the current `@supabase/ssr@0.8.0` surfaces before finalizing middleware code.

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions): HIGH — verified via npm registry directly (2026-02-20)
- Auth patterns (Supabase): HIGH — verified against official Supabase docs for SSR, MFA, and phone login
- Phone MFA flow: HIGH — confirmed `mfa.enroll/challenge/verify` is the correct path; `signInWithOtp` is passwordless-only (critical distinction verified)
- UAE SMS regulations: HIGH — verified directly from Twilio's UAE SMS guidelines page; Sender ID registration required
- Next.js security CVEs: HIGH — verified from Next.js official security blog
- Tailwind v4 @theme: HIGH — verified from official Tailwind docs
- Google Fonts integration: HIGH — verified from Next.js v16.1.6 official docs
- `getClaims()` vs `getUser()` API surface: MEDIUM — docs reference getClaims but code samples vary; LOW risk as the security principle is verified

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable stack; @supabase/ssr and Next.js release frequently — re-verify before implementation if >2 weeks pass)
