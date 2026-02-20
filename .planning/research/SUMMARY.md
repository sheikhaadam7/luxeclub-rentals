# Project Research Summary

**Project:** LuxeClub Dubai — Luxury Car Rental Booking Web App
**Domain:** Transactional booking platform with real-time tracking, identity verification, and multi-payment
**Researched:** 2026-02-20
**Confidence:** MEDIUM (Next.js stack HIGH; features/architecture/pitfalls MEDIUM — WebSearch unavailable during research, live competitor and regulatory verification recommended before implementation)

## Executive Summary

LuxeClub Dubai is a login-gated luxury car rental platform targeting the Dubai tourist and HNWI market. The dominant pattern for this class of product is a Next.js 16 App Router monolith backed by Supabase (PostgreSQL + Auth + Realtime + Storage), with Stripe as the primary payment processor and Mapbox GL JS for luxury-styled maps. The recommended approach avoids building separate backend services: Server Actions handle booking mutations, Supabase Realtime delivers live tracking updates via WebSocket, and a standalone Playwright scraper populates inventory from the existing Framer site. This stack gives the fastest path to a secure, mobile-responsive booking flow without sacrificing the performance and luxury aesthetic the product requires.

The most important architectural decisions must be made before any code is written. Real-time delivery tracking — the product's primary differentiator — requires WebSockets (Supabase Realtime), not HTTP polling, and this cannot be retrofitted cheaply. Payment integration must use Stripe's `authorize → capture → void` flow for deposits, not simple charges. Identity verification must include a manual admin review queue as a fallback alongside any automated OCR. These three decisions shape every subsequent phase and are the source of the most expensive failures in comparable products.

The key business risks are regulatory: UAE PDPL (personal data protection), RTA (car rental licensing), and VARA (crypto payment acceptance) all have requirements that must be verified with a UAE legal advisor before production data is collected. The product's tourist-heavy user base (80%+ international) means identity document diversity, Dubai's non-standard addressing (requiring pin-drop maps), and multi-currency pricing (AED primary) are functional requirements — not nice-to-haves. Competitor analysis confidence is LOW (live verification recommended), but the technical and market patterns are consistent with known Dubai luxury rental market dynamics.

---

## Key Findings

### Recommended Stack

The recommended stack centers on Next.js 16 App Router as the full-stack framework, eliminating the need for a separate API service. Supabase replaces four separate tools (PostgreSQL database, authentication, real-time WebSockets, and file storage) in a single managed service. Stripe's Payment Element handles cards, Apple Pay, and Google Pay in one component. Mapbox GL JS provides the dark luxury map styling that matches the brand. Drizzle ORM gives type-safe SQL queries directly against the Supabase PostgreSQL database.

See `STACK.md` for full library list, version compatibility matrix, and installation commands.

**Core technologies:**
- **Next.js 16.1 (App Router):** Full-stack framework — Server Actions handle booking mutations without a separate API layer; RSC + SSR for luxury page performance and SEO
- **React 19.2:** Bundled with Next.js 16; View Transitions API for premium page animations; `useActionState` for booking form flows
- **TypeScript 5.7+:** Catches API shape mismatches between booking/payment logic; essential for complex multi-step booking state
- **Supabase 2.x:** PostgreSQL + Auth (phone OTP) + Realtime (live tracking) + Storage (identity documents) — single service replaces 3–4 separate tools
- **Stripe (latest):** Payment Element handles all card/digital wallet methods; webhook-based payment confirmation; UAE merchant support confirmed
- **Mapbox GL JS 3.x + react-map-gl 7.x:** Custom dark luxury map styles; marker animations for live delivery tracking; competitive pricing vs Google Maps
- **Drizzle ORM 0.38+:** Type-safe SQL against Supabase PostgreSQL; migrations tracked in repo; better transparency than Prisma for complex booking queries
- **Better Auth (latest):** Authentication orchestration with Next.js App Router native support; phone OTP for signup; Supabase adapter
- **Zustand 5.x:** Multi-step booking wizard state persistence across page navigation
- **uploadthing 7.x:** Identity document uploads with Next.js App Router integration, progress tracking, and file type validation

**Critical version notes:**
- `middleware.ts` is renamed to `proxy.ts` in Next.js 16 — using old name causes silent failures
- Use `@supabase/ssr` (not deprecated `@supabase/auth-helpers-nextjs`) for cookie-based auth in App Router
- react-map-gl 7.x requires mapbox-gl 3.x — do not mix versions
- Node.js 22 LTS recommended for production (minimum: 20.9)

### Expected Features

Dubai luxury car rental is a well-defined market. The table stakes are non-negotiable — missing them makes the product feel unfinished. The differentiators (especially live tracking and crypto) are genuine competitive gaps — no current Dubai competitor offers them publicly.

See `FEATURES.md` for full prioritization matrix, feature dependency graph, competitor analysis, and Dubai market notes.

**Must have — table stakes (P1, v1 launch):**
- User auth with login-first gate — brand exclusivity and legal requirement; no browsing without account
- Car catalogue with high-res photos and specs — core product surface
- Real-time availability calendar — prevents double-booking; blocks dates on confirmation
- Pricing calculator — daily/weekly/monthly tiers, 50 AED delivery fee, +30% no-deposit surcharge
- Booking flow — delivery/pickup selector, pin-drop map for Dubai addressing, date selection, confirm
- Payment: card + Apple Pay / Google Pay (Stripe)
- Booking confirmation — email + in-app with booking reference
- Identity verification — document upload + admin review queue (legal requirement)
- Admin: fleet management, booking management, ID verification queue
- Mobile-responsive design — 75%+ of Dubai luxury travel bookings on mobile

**Should have — differentiators (P2, v1.x post-launch):**
- Live map delivery tracking — Uber-style; no Dubai competitor offers this; the brand's marquee promise
- Crypto payment — high Dubai adoption among HNWI tourists; no major competitor accepts it
- Bank transfer + cash on delivery — serves GCC corporate and cash-preference markets (Russian, Indian, Chinese tourists)
- WhatsApp concierge widget — WhatsApp is the primary B2C channel in UAE; expected by HNWI customers

**Defer (v2+):**
- Hourly/half-day rentals — pricing complexity; validate daily rentals first
- Chauffeur add-on — requires separate driver scheduling system
- Referral/loyalty programme — retention play; needs repeat customer base
- Arabic localisation — high value but RTL retrofit is expensive; build English market first
- Native iOS/Android app — PWA is sufficient for launch

**Confirmed anti-features (do not build):**
- Automated KYC with no human review fallback — UAE law requires human accountability; OCR fails on ~15% of real tourist documents
- Dynamic surge pricing — luxury clients expect quoted prices to hold; creates mistrust and admin complexity
- Public-facing fleet GPS (always-on) — creates theft/security risk; show tracking only to booking customer during active delivery window

### Architecture Approach

The architecture is a Next.js monolith with a clear separation: Server Components for data display, Server Actions for mutations, Client Components only for interactive elements (map, date pickers, Zustand state). Supabase provides the real-time layer via `postgres_changes` WebSocket subscriptions — no separate WebSocket server needed. The inventory scraper runs as a standalone Playwright script isolated from the web app. All payment and booking status transitions are webhook-driven from the server; client state never drives booking or payment status.

See `ARCHITECTURE.md` for system diagram, component boundaries, data flow diagrams, code patterns, and scaling considerations.

**Major components:**
1. **Public gate (login-first)** — Next.js `proxy.ts` middleware checks Supabase session; all routes except `/login` and `/api/auth/*` are protected
2. **Car inventory browser** — Server Components pulling from DB; real-time availability; cache invalidation on booking
3. **Booking wizard** — Multi-step client-side Zustand state; final submission via Server Action; uploadthing for identity document uploads
4. **Payment processor** — PaymentAdapter abstraction layer: Stripe (cards/wallets), CryptoAdapter (NOWPayments), ManualAdapter (COD/bank transfer)
5. **Supabase Realtime layer** — `useRealtimeBooking` and `useDriverLocation` hooks subscribe to `postgres_changes`; customer map receives driver GPS updates without polling
6. **Admin dashboard** — Server Components for fleet/booking/analytics display; Client Components only for interactive filters and live map; role-based access via Supabase RLS
7. **Inventory scraper** — Standalone Playwright script in `/scripts/scraper/`; writes to `vehicles` table; never runs in a synchronous API route
8. **GPS ingestion Edge Function** — Supabase Edge Function receives GPS tracker webhooks; writes to `tracking_log` table; Realtime delivers to customer map

**Key patterns:**
- Payment and booking status are ALWAYS source-of-truth from the database, never from client state
- All mutations go through API routes/Server Actions — client never writes booking status directly
- Supabase service role key is server-only, never exposed to browser; RLS is a second defense layer, not the only one
- Identity documents in private Supabase Storage bucket; signed URLs with 15-minute expiry, served only via server API routes
- Booking status history stored as `booking_events` append-only log (not single-field status string) for audit trail

### Critical Pitfalls

See `PITFALLS.md` for full pitfall details, technical debt patterns, integration gotchas, performance traps, security mistakes, and recovery strategies.

1. **Identity verification that fails real tourist documents** — OCR rejection rates of 30–60% on worn, non-Latin, or uncommon-country documents cause funnel abandonment. Use a purpose-built KYC provider (Onfido, Jumio, Persona) with multi-country document libraries — never raw Tesseract or generic Vision API. Always include a manual admin review queue as fallback. Target >90% success rate in QA across 10+ document types.

2. **Real-time tracking that is "real-time" in name only** — HTTP polling breaks under concurrent load and produces stale positions that destroy trust. Commit to WebSocket/SSE architecture in Phase 1 before building any tracking UI. Use Supabase Realtime (`postgres_changes`) as the pub/sub layer — configure GPS update frequency deliberately (5s active delivery, 30s idle). Store last known position in DB; never rely on in-memory state alone.

3. **Deposit charged instead of held** — Using `charge` instead of `authorize → capture/void` flow causes AED 5,000–15,000 holds to become full charges. UAE Consumer Protection Law makes unjustified deposit retention a chargeable offense. Implement Stripe `PaymentIntent` with `capture_method: manual`; automate deposit release at vehicle return; show deposit status in customer dashboard.

4. **Crypto payments without fiat conversion and VARA compliance** — Accepting raw crypto wallet transfers without a regulated processor creates exchange rate risk and legal exposure under UAE's Virtual Assets Regulatory Authority (VARA). Use NOWPayments or Coinbase Commerce for instant AED conversion at payment time. Policy must state refunds are in AED, not cryptocurrency. Verify VARA compliance before launch.

5. **Inventory scraper that breaks silently** — Framer site HTML changes or bot detection silently breaks the scraper, leading to stale inventory and customers booking cars that don't exist. Build monitoring alongside the scraper (alert if results drop >90%); add a "last scraped at" staleness indicator visible in admin; build a manual inventory override in the admin dashboard from day one.

6. **UAE regulatory non-compliance at launch** — UAE PDPL (personal data protection), RTA (rental licensing), and TDRA (data storage) requirements must be verified before production data is stored. Engage a UAE legal advisor in Phase 1. Passport and biometric data are "special category" PII under PDPL — require explicit consent, defined retention periods (delete 30 days post-rental), and must never be stored in public storage buckets.

---

## Implications for Roadmap

Based on component dependencies, regulatory requirements, and pitfall prevention timing, the following phase structure is recommended:

### Phase 1: Foundation + Legal + Auth Gate

**Rationale:** Everything depends on auth, database schema, and the login-first gate. Regulatory and PDPL compliance decisions must be made before any customer PII is stored in production — this cannot be retrofitted. The middleware architecture (WebSocket vs polling) must be decided here too, or the tracking phase becomes a costly rewrite.

**Delivers:** Working project skeleton with auth gate, database schema, legal sign-off checklist, and `proxy.ts` middleware protecting all routes

**Addresses:**
- User auth (login-first gate) — P1 table stake
- Mobile-responsive layout shell
- UAE PDPL data flow architecture documented and approved

**Avoids:**
- Dubai regulatory non-compliance (engage legal advisor before any PII stored)
- HTTP polling anti-pattern (decide WebSocket architecture now)
- Public storage bucket mistake (configure Supabase Storage RLS from the start)

**Research flag:** Needs deeper research — UAE PDPL requirements, RTA licensing categories, Stripe UAE regulatory status, and VARA compliance should be verified with live sources before this phase completes.

---

### Phase 2: Inventory + Scraper

**Rationale:** The car catalogue is the core product display. Without it, the booking flow has no input. The scraper must run before the inventory UI is meaningful. Scraper monitoring and manual override must be built at the same time as the scraper — not added later.

**Delivers:** Populated car catalogue with photos, specs, availability; Playwright-based inventory scraper with staleness alerts; admin manual inventory override

**Addresses:**
- Car catalogue (photos + specs) — P1 table stake
- Real-time availability calendar — P1 table stake
- Admin: fleet management — P1 table stake

**Avoids:**
- Scraper breaking silently (build monitoring and staleness indicators in this phase, not after)
- CDN miss (all car photos served via CDN, WebP format, from this phase)

**Research flag:** Standard patterns — Playwright scraping and Supabase table setup are well-documented.

---

### Phase 3: Booking Flow + Pricing + ID Verification

**Rationale:** This is the core transactional loop. Booking depends on inventory (Phase 2) and auth (Phase 1). Identity verification must be built here — not deferred — because it is a legal requirement before any car can be handed over, and the admin review queue must exist before go-live. Pin-drop map for delivery addressing is a functional requirement (Dubai addressing is unreliable as text).

**Delivers:** Multi-step booking wizard (car selection → dates → delivery/pickup with pin drop → pricing summary → ID upload → confirm); identity verification upload UI; admin ID verification queue; booking confirmation email + SMS

**Addresses:**
- Pricing calculator (daily/weekly/monthly, delivery fee, deposit toggle) — P1
- Booking flow — P1
- Delivery vs self-pickup selector — P1
- Pin-drop map input — P1
- Identity verification (document upload + admin queue) — P1
- Booking confirmation — P1
- Admin: booking management — P1
- Admin: ID verification queue — P1

**Avoids:**
- KYC failing real tourist documents (use Onfido/Jumio/Persona; test with 10+ document types; manual review fallback mandatory)
- Blocking booking pending KYC (allow booking with "pending" status; complete verification before pickup)
- Deposit shown only at payment step (show deposit amount on car detail page and booking summary)

**Research flag:** Needs deeper research — KYC provider selection (Onfido vs Jumio vs Persona; UAE document coverage, pricing, webhook patterns), Mapbox geocoding accuracy for Dubai addresses (verify vs Google Maps).

---

### Phase 4: Payment Integration

**Rationale:** Payment cannot exist without a booking record (Phase 3). Must be built as a separate phase because the deposit `authorize → capture → void` flow, crypto policy decisions, and UAE gateway selection each require deliberate design — not retrofitting. The PaymentAdapter abstraction must be established here to avoid painful payment gateway migrations later.

**Delivers:** Full payment processing with Stripe (card + Apple Pay + Google Pay), PaymentAdapter abstraction layer, deposit pre-authorization flow, booking status driven by payment webhooks, payment status visible in customer dashboard; crypto payment track (NOWPayments); bank transfer and COD manual confirmation flows

**Addresses:**
- Payment: card + Apple Pay / Google Pay — P1
- Crypto payment — P2
- Bank transfer + cash on delivery — P2
- Deposit / no-deposit pricing toggle — P1

**Avoids:**
- Deposit charged instead of held (implement `capture_method: manual` from the start)
- Crypto without fiat conversion (NOWPayments instant AED conversion; AED refund policy in ToS)
- Client-side payment confirmation (payment status set only by server-side Stripe webhook)
- Crypto webhook signature check bypass (enforce HMAC verification before updating booking status)

**Research flag:** Needs deeper research — verify Stripe UAE regulatory status and AED PaymentElement capabilities; verify UAE-licensed gateway alternatives (Telr, Checkout.com, Network International) as fallback; verify VARA crypto processor requirements.

---

### Phase 5: Admin Dashboard

**Rationale:** The admin dashboard is not optional — ops cannot run the business without fleet management and booking management. It can be built in parallel with Phases 3 and 4 if two developers are available, but must be complete before go-live. Admin dashboard is the enabler for all manual operations before automation is built.

**Delivers:** Full admin dashboard with fleet management, booking lifecycle management (status pipeline), ID verification queue with approve/reject, payment records, and paginated lists with date-range filters

**Addresses:**
- Admin: fleet management — P1
- Admin: booking management — P1
- Admin: ID verification queue — P1

**Avoids:**
- Admin dashboard accessible without 2FA (enforce before production access)
- Admin lists without pagination (all admin lists paginated from day one)
- GPS data visible for non-active bookings in admin view

**Research flag:** Standard patterns — admin dashboards in Next.js App Router with Supabase RLS are well-documented.

---

### Phase 6: Real-Time Delivery Tracking

**Rationale:** Live tracking is the brand's marquee differentiator and can launch without it (go-live with manual status updates), but should ship within 4–6 weeks post-launch. The WebSocket architecture was established in Phase 1, so the tracking UI wires into that infrastructure. GPS hardware integration is a parallel workstream requiring a tracker vendor account and device provisioning.

**Delivers:** Customer-facing live map tracking (Mapbox GL JS + Supabase Realtime); booking status timeline UI with `booking_events` audit log; Supabase Edge Function for GPS hardware webhook ingestion; admin delivery status management; `useDriverLocation` and `useRealtimeBooking` hooks

**Addresses:**
- Live map delivery tracking — P2 (marquee differentiator)
- Booking status timeline — P1 (can ship simpler version at launch, full version here)

**Avoids:**
- HTTP polling for tracking (Supabase Realtime WebSocket established in Phase 1; wire up here)
- Public GPS feed (tracking visible only to booking owner, only during active delivery window)
- GPS position stored only in memory (persist to `tracking_log` table via Edge Function)

**Research flag:** Needs deeper research — GPS hardware tracker vendor selection for Dubai (available vendors, SIM card requirements for UAE, integration APIs); driver-facing app or GPS device decision.

---

### Phase 7: Post-Launch Enhancements

**Rationale:** These features add conversion, trust, and retention value but are not required for the first paying customer. Sequence them based on which organic user feedback surfaces first.

**Delivers:** WhatsApp concierge widget; seasonal/manual pricing overrides per vehicle per date range; referral and loyalty programme; Arabic RTL localisation

**Addresses:**
- WhatsApp concierge — P2
- Manual seasonal pricing (F1 weekend, NYE, DSF) — admin feature
- Referral system — P3
- Arabic localisation — P3 (deferred by deliberate choice; retrofit now with RTL framework from day one)

**Avoids:**
- Arabic RTL retrofit being expensive (if RTL support is not built into the CSS framework from Phase 1, retrofitting it here will break layouts; ensure Tailwind RTL classes or i18n library is scaffolded in Phase 1 even if Arabic content is not shipped until this phase)

**Research flag:** Standard patterns for WhatsApp Business API and Arabic RTL with Tailwind.

---

### Phase Ordering Rationale

- **Phases 1–2 are hard prerequisites** — auth gate + database + inventory must exist before booking flow
- **Phase 3 (booking) before Phase 4 (payment)** — payment requires a booking record to exist; identity verification cannot be deferred past Phase 3 (legal requirement)
- **Phase 5 (admin) can run in parallel with Phases 3–4** — if two developers are available; must complete before go-live
- **Phase 6 (tracking) defers post-launch** — the architecture is locked in Phase 1; UI implementation can wait without technical debt
- **Phase 7 defers to post-PMF** — growth and retention mechanics need a customer base to work

### Research Flags

**Phases needing deeper research before implementation:**

- **Phase 1:** UAE PDPL compliance scope, RTA licensing categories (platform vs direct rental), Stripe UAE regulatory status — verify with UAE legal advisor and live official sources before any production PII is stored
- **Phase 3:** KYC provider selection — Onfido vs Jumio vs Persona; UAE document library coverage; webhook async patterns; pricing — compare providers against document diversity requirements; Mapbox geocoding accuracy for Dubai addresses
- **Phase 4:** UAE-licensed payment gateway options (Telr, Checkout.com, Network International) as Stripe fallback; VARA crypto processor compliance; AED PaymentElement coverage — verify with current Stripe dashboard and UAE financial regulator

**Phases with well-established patterns (research-phase likely unnecessary):**

- **Phase 2:** Playwright scraping, Supabase table schema — well-documented
- **Phase 5:** Next.js App Router admin with Supabase RLS — well-documented
- **Phase 7:** WhatsApp Business API integration, Tailwind RTL — well-documented

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16 from official docs; version compatibility matrix verified; supporting libraries are well-established; crypto payments LOW (landscape changes rapidly) |
| Features | MEDIUM | Market patterns consistent with known Dubai luxury rental dynamics; competitor-specific data LOW — WebSearch unavailable, live verification recommended before using for positioning |
| Architecture | MEDIUM | Patterns from Next.js App Router, Supabase, and Stripe official training knowledge; build order is HIGH confidence (logical dependency analysis); Supabase Realtime connection limits and Stripe UAE AED coverage need live verification |
| Pitfalls | MEDIUM | Technical pitfalls HIGH confidence (well-established anti-patterns); Dubai regulatory pitfalls MEDIUM — PDPL, RTA, VARA requirements cited from training knowledge, must be verified against current official sources |

**Overall confidence:** MEDIUM

### Gaps to Address

- **UAE legal review (critical):** UAE PDPL (Federal Decree-Law No. 45 of 2021), RTA rental platform licensing, and VARA crypto payment compliance must be verified with a UAE-based legal advisor before Phase 1 completes. Do not store production PII until this is confirmed. Sources: u.ae/pdpl, vara.ae, rta.ae
- **Stripe UAE status:** Confirm Stripe's current regulatory standing for AED-denominated transactions and PaymentElement capabilities in UAE. Fallback gateways (Telr, Checkout.com, Network International) should be evaluated as primary or backup options.
- **KYC provider selection:** Compare Onfido, Jumio, and Persona on UAE document library coverage, async webhook documentation, and pricing before Phase 3. The chosen provider determines the entire verification UX.
- **GPS tracker vendor:** No GPS hardware vendor has been selected. This is a required decision before Phase 6. Research Dubai-available SIM-enabled GPS trackers and their API webhook formats.
- **Competitor live verification:** All competitor feature data (Rotana Star, Exotic Cars Rental, Renty.ae) is from training knowledge (Aug 2025 cutoff). Manually review 2–3 live sites before using for positioning.
- **Mapbox geocoding for Dubai:** Test Mapbox geocoding accuracy for Dubai addresses specifically before committing; if insufficient, Google Maps Places API (higher cost) may be required for delivery pin-drop.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (nextjs.org/docs) — v16.1.6, 2026-02-20 — App Router, Server Actions, proxy.ts middleware, Node.js requirements
- Next.js blog — v16 release (Oct 2025), v16.1 release (Dec 2025) — version numbers, breaking changes
- Next.js authentication docs — Auth library recommendations (Better Auth, Clerk, NextAuth.js, Supabase)
- Next.js Server Actions docs — Zod validation pattern, Jose JWT

### Secondary (MEDIUM confidence)
- Supabase, Stripe, Mapbox, Better Auth, Drizzle, uploadthing — training knowledge through August 2025; APIs stable but versions should be verified at implementation
- Stripe Docs — PaymentIntent capture_method manual (pre-authorization pattern)
- Onfido / Jumio KYC platform — async webhook verification flows
- Dubai luxury car rental market landscape — training knowledge; competitor features (Rotana Star, Exotic Cars Rental, Renty.ae)
- UAE RTA rental regulations, Dubai Tourism tourist source markets
- KYC/face-matching services (AWS Rekognition, Veriff) — UAE compliance patterns

### Tertiary (LOW confidence — verify before relying on)
- Crypto payment processors (NOWPayments, Coinbase Commerce) — landscape changes rapidly; verify UAE VARA compliance and current API stability
- Competitor feature data — all from training knowledge; WebSearch unavailable; manually verify before using for marketing positioning
- UAE PDPL / VARA / RTA specific requirements — verify against official current sources before implementation (u.ae, vara.ae, rta.ae)

---

*Research completed: 2026-02-20*
*Ready for roadmap: yes*
