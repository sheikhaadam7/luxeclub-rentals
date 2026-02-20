# Stack Research

**Domain:** Luxury car rental booking web app (transactional, real-time tracking, identity verification, multi-payment)
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH (Next.js stack HIGH confidence from official docs; third-party services MEDIUM from training data + known good practices)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1 | Full-stack framework | App Router gives SSR/RSC for SEO and fast initial loads; Server Actions handle booking mutations securely server-side without a separate API layer; Turbopack (default, stable) for fast builds; single repo for frontend + backend |
| React | 19.2 | UI rendering | Included with Next.js 16; View Transitions API for luxury page transitions; `useActionState` for form/booking flows; `use()` for streaming data |
| TypeScript | 5.7+ | Type safety | Next.js install default; catches API shape mismatches between frontend/backend; essential for complex booking/payment logic |
| Tailwind CSS | 4.x | Styling | Next.js install default; utility-first makes dark luxury theme maintainable; no CSS-in-JS runtime cost; works cleanly with Server Components |
| Supabase | 2.x | Database + Auth + Realtime + Storage | PostgreSQL with PostGIS for location queries; built-in Auth (phone OTP for signup); Realtime subscriptions for live delivery tracking; Storage for identity document uploads; one service replaces 3-4 separate tools |
| Stripe | latest | Card + Apple Pay + Google Pay + bank transfer | Payment Element supports all digital payment methods in a single UI component; handles PCI compliance; webhook-based payment confirmation is reliable; strong Dubai/UAE merchant support |
| Mapbox GL JS | 3.x | Interactive maps + real-time tracking | Best-in-class customization for dark luxury map styles (matches brand); marker animations for moving vehicles; fly-to animations; geocoding API for address input; competitive pricing vs Google Maps |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-map-gl | 7.x | React wrapper for Mapbox GL JS | Use for all map components — wraps Mapbox GL JS with React lifecycle management, avoids direct DOM manipulation in React |
| Zod | 3.x | Schema validation | Validate all Server Action inputs (booking forms, payment data, identity uploads) before processing — recommended by Next.js docs for Server Actions |
| Jose | 5.x | JWT session encryption/decryption | Stateless session tokens in httpOnly cookies; recommended by Next.js official auth docs; Edge Runtime compatible |
| Better Auth | latest | Authentication orchestration | Recommended by Next.js docs; handles phone OTP (for signup), magic links, session management; simpler than NextAuth for non-OAuth-heavy apps; Supabase adapter available |
| react-hook-form | 7.x | Client form state management | Complex booking form (dates, location, vehicle selection, deposit choice) needs validation state that Server Actions alone don't handle well in real-time |
| Zustand | 5.x | Client-side global state | Booking flow multi-step state (selected car, dates, location, payment method) that must persist across page navigation within the flow |
| date-fns | 3.x | Date manipulation | Rental period calculations (daily/weekly/monthly pricing), date range pickers, duration display |
| react-datepicker | 4.x | Date/time range picker | Rental period selection UI — supports ranges, time selection, min-date constraints |
| Twilio | 5.x (Node SDK) | SMS OTP for phone verification | Phone verification at signup (Server Action calls Twilio); Supabase Auth has built-in phone OTP but Twilio gives more control over UAE SMS delivery |
| NOWPayments or Coinbase Commerce | latest | Crypto payments | Neither Stripe nor most processors handle crypto — NOWPayments supports BTC/ETH/USDT and has a REST API; crypto is a separate checkout flow |
| Resend | 3.x | Transactional email | Booking confirmation emails, admin notifications; simple REST API, Next.js-native, better DX than SendGrid |
| Puppeteer or Playwright | latest | Inventory scraper | Scrape luxeclubrentals.com (Framer site) for car data, pricing, images; run as a standalone Node.js script or serverless cron job |
| Drizzle ORM | 0.38+ | Type-safe SQL queries | Works directly with Supabase PostgreSQL; better TypeScript ergonomics than Prisma for complex booking queries; migrations tracked in repo |
| uploadthing | 7.x | Identity document file uploads | Passport/license/selfie upload to secure storage; handles chunking, progress, file type validation; integrates with Next.js App Router natively |
| Sentry | 8.x | Error tracking + monitoring | Critical for production — payment failures and identity verification errors must be logged; Next.js SDK has App Router support |
| react-hot-toast | 2.x | Toast notifications | Booking confirmations, payment status, verification status; lightweight, zero-config |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Turbopack | Build bundler | Default in Next.js 16, ~94% faster HMR than Webpack — do not opt back to Webpack |
| ESLint + next/eslint-plugin | Linting | Next.js 16 ships with `eslint.config.mjs` format; run separately from build (`next build` no longer runs lint) |
| Prettier | Code formatting | Pair with ESLint; consistent formatting for multi-developer work |
| Vitest | Unit testing | Fast, Vite-based; test Server Actions, pricing calculations, booking logic |
| Playwright | E2E testing | Also doubles as the scraper tool; test booking flow end-to-end |
| pnpm | Package manager | Faster than npm, disk-efficient; works with Next.js turborepo patterns if monorepo needed later |

---

## Installation

```bash
# Bootstrap Next.js 16 with TypeScript, Tailwind, App Router, Turbopack
pnpm create next-app@latest luxeclub --yes

# Core runtime dependencies
pnpm add @supabase/supabase-js @supabase/ssr \
  stripe @stripe/stripe-js @stripe/react-stripe-js \
  react-map-gl mapbox-gl \
  better-auth \
  jose \
  drizzle-orm postgres \
  zod \
  react-hook-form @hookform/resolvers \
  zustand \
  date-fns \
  react-datepicker \
  uploadthing @uploadthing/react \
  resend \
  react-hot-toast \
  twilio \
  @sentry/nextjs

# Dev dependencies
pnpm add -D \
  drizzle-kit \
  vitest @vitejs/plugin-react \
  playwright \
  @types/mapbox-gl \
  @types/react-datepicker
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Remix | Remix if team is uncomfortable with RSC mental model; both are excellent but Next.js has larger ecosystem and Vercel hosting optimizations |
| Supabase | PlanetScale + Clerk + Cloudinary | If team already has PlanetScale accounts and wants more separation of concerns; adds complexity and cost vs Supabase's all-in-one |
| Supabase Realtime | Pusher / Ably | If Supabase Realtime proves unreliable at scale; Ably is more battle-tested for high-frequency updates but costs more |
| Mapbox GL JS | Google Maps JavaScript API | If budget allows (Google Maps is more expensive at scale); Google has slightly better geocoding for UAE addresses — worth testing Mapbox geocoding for Dubai first |
| Mapbox GL JS | Leaflet + OpenStreetMap | If cost is a primary concern; Leaflet is free but requires more custom work for dark luxury styling and lacks built-in 3D/animation support |
| Better Auth | Clerk | Clerk is more turnkey (hosted UI, phone verification UI built-in); costs ~$25/month at scale; use Clerk if timeline is critical and UI polish matters more than cost control |
| Better Auth | NextAuth.js v5 | NextAuth v5 (Auth.js) is more mature; use if team has existing NextAuth experience; fewer adapters than Better Auth |
| Drizzle ORM | Prisma | Prisma has better DX for teams familiar with it; Drizzle is faster and more SQL-transparent; either works with Supabase |
| NOWPayments | BitPay | BitPay has better enterprise support; NOWPayments has simpler API and lower fees for smaller transaction volumes |
| uploadthing | Supabase Storage direct | Supabase Storage works but uploadthing adds progress indicators, file validation, and Next.js App Router integration out-of-box |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `middleware.ts` (old naming) | Renamed to `proxy.ts` in Next.js 16 — using old name causes silent failures | `proxy.ts` in project root |
| Pages Router | Next.js 16 App Router is the standard; Pages Router loses access to RSC, Server Actions, streaming — critical for this app's performance | App Router (`/app` directory) |
| Redux / Redux Toolkit | Massive boilerplate for what is essentially booking flow state; RSC-incompatible patterns | Zustand for client state, Server Components for server state |
| Axios | Redundant with native `fetch` in Next.js; adds bundle size; Next.js extends `fetch` with caching | Native `fetch` in Server Components, SWR/React Query for client mutations if needed |
| Firebase / Firestore | Google ecosystem lock-in, NoSQL makes complex booking/rental queries painful (joins, date ranges, pricing logic), no PostGIS | Supabase (PostgreSQL) |
| CoinGate or manual crypto | Poor API quality, unreliable webhook delivery | NOWPayments or Coinbase Commerce — both have reliable webhooks |
| express.js custom server | Breaks Next.js deployment adapter compatibility, loses ISR/caching benefits, no Vercel edge support | Next.js Route Handlers + Server Actions |
| Webpack (manual opt-in) | Turbopack is the default and ~94% faster for development; reverting to Webpack (`next dev --webpack`) significantly slows builds | Turbopack (default, no config needed) |
| `getServerSideProps` / `getStaticProps` | Pages Router patterns — don't exist in App Router; teams migrating from Next.js 13-15 must unlearn these | `async` Server Components + `fetch` with cache options |

---

## Stack Patterns by Variant

**For the booking flow (multi-step):**
- Use Zustand to persist step state (vehicle selection, dates, location, payment method) across the multi-step booking wizard
- Each step is a Client Component that reads/writes Zustand; final submission is a Server Action
- Because the booking flow involves file uploads (identity docs), Server Actions alone cannot handle multipart uploads — use uploadthing's client-side upload, then confirm server-side

**For real-time delivery tracking:**
- Use Supabase Realtime with `channel().on('postgres_changes', ...)` to subscribe to booking status updates
- Admin/driver updates the `bookings` table row with GPS coordinates → customer map component receives update via Realtime channel
- Do NOT use polling — Supabase Realtime WebSocket is always-on and low-latency enough for vehicle tracking

**For the admin dashboard:**
- Server Components for all data display (fleet list, booking list, analytics) — no API routes needed
- Client Components only for interactive filters, status updates, and the live map
- Use Drizzle ORM directly in Server Components for admin queries — no need for a separate API layer

**For identity verification:**
- Manual KYC flow: customer uploads passport photo + license photo + selfie via uploadthing
- Admin reviews in dashboard and marks as verified (Server Action updates `users.kyc_status`)
- For automated face matching (face vs ID photo), use a third-party API: **AWS Rekognition** (most reliable) or **Veriff** (purpose-built KYC, UAE-compliant, expensive)
- Do NOT build face-matching logic yourself — it's a compliance liability

**For payment processing:**
- Card + Apple Pay + Google Pay: Stripe Payment Element — single component handles all three
- Bank transfer: Stripe's Payment Element includes bank transfer for UAE (IBAN-based); verify UAE bank coverage in Stripe dashboard
- Cash on delivery: No payment processor needed — booking stored with `payment_method: 'cash'` and `payment_status: 'pending'`
- Crypto: Separate checkout flow using NOWPayments; on payment confirmation webhook, update booking to confirmed

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.1 | React 19.2 | React 19.2 is bundled — do not install a different React version |
| Next.js 16.1 | Node.js 20.9+ | Minimum Node.js version per official docs — use Node 22 LTS for production |
| react-map-gl 7.x | mapbox-gl 3.x | Must match — react-map-gl 7 requires mapbox-gl 3; do not mix versions |
| Drizzle ORM 0.38+ | postgres (pg) driver | Use `postgres` npm package (not `pg`) — Drizzle recommends it for better TypeScript support |
| Better Auth | Next.js 16 App Router | Better Auth has native App Router support; ensure `better-auth/next` adapter is used |
| uploadthing 7.x | Next.js 16 | uploadthing 7 has App Router route handlers built-in — use `createUploadthing()` pattern |
| Stripe Payment Element | Next.js 16 | Use `@stripe/react-stripe-js` client-side + Stripe SDK server-side in Server Actions |
| Supabase SSR | Next.js 16 | Use `@supabase/ssr` (not the deprecated `@supabase/auth-helpers-nextjs`) for cookie-based auth in App Router |

---

## Critical Configuration Notes

**Security (Dubai/UAE context):**
- Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for multi-server deployments (required for Server Actions with encrypted closures)
- All identity documents stored in Supabase Storage with Row Level Security (RLS) — only the uploading user + admins can read
- Stripe in live mode requires UAE business registration details; test mode works immediately

**Next.js 16 Breaking Changes to Know:**
- `middleware.ts` → `proxy.ts` (rename file, rename export function from `middleware` to `proxy`)
- `next build` no longer runs linting automatically — add lint to CI separately
- `revalidatePath` and `revalidateTag` behavior updated — `updateTag()` is the new preferred API

**Mapbox in Dubai:**
- Mapbox has full UAE/Dubai coverage including street-level detail
- Use Mapbox Styles API to create a custom dark luxury style matching brand (black background, cyan road highlights)
- Mapbox token must be restricted to your domain in production (avoid token theft)

**Supabase Realtime for tracking:**
- Enable Realtime on the `bookings` table specifically — do not enable on all tables (performance)
- Use row-level filters: `filter: 'booking_id=eq.{bookingId}'` so each customer only receives their own booking updates

---

## Sources

- Next.js official docs (nextjs.org/docs) — @doc-version 16.1.6, last updated 2026-02-20 — **HIGH confidence** for all Next.js-specific recommendations
- Next.js blog (nextjs.org/blog) — Next.js 16.1 release December 18, 2025; Next.js 16 release October 21, 2025 — **HIGH confidence** for version numbers
- Next.js authentication docs — Auth library list (Better Auth, Clerk, NextAuth.js, Supabase, etc.) — **HIGH confidence**
- Next.js Server Actions docs — Zod for validation pattern, Jose for JWT — **HIGH confidence**
- Next.js self-hosting docs — Node.js 20.9 minimum, caching, proxy configuration — **HIGH confidence**
- Supabase, Stripe, Mapbox, Better Auth, Drizzle, uploadthing — **MEDIUM confidence** (training data through August 2025; APIs unlikely to have broken changes but versions should be verified at implementation time)
- KYC/face-matching services (AWS Rekognition, Veriff) — **MEDIUM confidence** (well-established services; UAE compliance requirements should be verified independently)
- Crypto payment processors (NOWPayments) — **LOW confidence** (crypto payments landscape changes rapidly; verify current API stability and UAE regulatory compliance before committing)

---

*Stack research for: LuxeClub Dubai — luxury car rental booking web app*
*Researched: 2026-02-20*
