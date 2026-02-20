# Architecture Research

**Domain:** Luxury car rental booking system with real-time delivery tracking
**Researched:** 2026-02-20
**Confidence:** MEDIUM (training data, August 2025 cutoff — WebSearch/WebFetch unavailable in this environment)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                        │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Public Site │  Auth Portal │  Customer    │  Admin Dashboard       │
│  (login-     │  (login,     │  Dashboard   │  (fleet, bookings,     │
│   first gate)│   face ID)   │  (booking,   │   verifications,       │
│              │              │   tracking)  │   payments)            │
└──────────────┴──────────────┴──────┬───────┴────────────────────────┘
                                     │  HTTPS / WebSocket
┌────────────────────────────────────▼────────────────────────────────┐
│                        API LAYER (Next.js App Router)                │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Auth Routes │  Booking     │  Payment     │  Admin Routes          │
│  /api/auth   │  Routes      │  Routes      │  /api/admin            │
│              │  /api/book   │  /api/pay    │                        │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│                     REAL-TIME LAYER (Supabase Realtime)              │
│              Booking status updates · Driver location · Alerts       │
└──────────────┬──────────────┬──────────────┬────────────────────────┘
               │              │              │
┌──────────────▼──┐  ┌────────▼──────┐  ┌───▼────────────────────────┐
│  Database        │  │  File Storage │  │  External Services         │
│  (Supabase /     │  │  (Supabase    │  │  - Payment gateway         │
│   PostgreSQL)    │  │   Storage)    │  │  - Stripe / crypto         │
│                  │  │  Passports,   │  │  - SMS / email             │
│  - users         │  │  licenses,    │  │  - KYC / face ID           │
│  - bookings      │  │  face photos  │  │  - GPS tracker API         │
│  - vehicles      │  │               │  │  - Scraper (Framer site)   │
│  - payments      │  │               │  │                            │
│  - tracking_log  │  │               │  │                            │
└──────────────────┘  └───────────────┘  └────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Public gate (login-first) | Blocks unauthenticated access to all inventory/pricing | Next.js middleware with Supabase session check |
| Auth portal | Login, registration, identity verification (passport, license, face ID upload) | Next.js pages + Supabase Auth + file upload to Supabase Storage |
| Car inventory browser | Display available cars with real-time availability and instant pricing | Next.js Server Components pulling from DB; cache invalidation on booking |
| Booking flow | Multi-step form: car selection → dates → add-ons → ID verification → payment | Client-side wizard state + server-side mutations via API routes |
| Payment processor | Accept card, Apple/Google Pay, crypto, bank transfer, COD | Stripe (cards, wallets) + crypto gateway + webhook handlers |
| Customer tracking view | Show live driver position on map during delivery window | Supabase Realtime subscription + Mapbox/Google Maps embed |
| Booking status tracker | Show booking lifecycle: confirmed → preparing → en route → delivered → active → return | Supabase Realtime postgres changes subscription |
| Admin dashboard | Manage fleet, approve bookings, handle verifications, view payments | Protected Next.js routes with role-based access (Supabase RLS) |
| Web scraper | Extract car inventory from luxeclubrentals.com (Framer site) | Standalone Node.js script (Playwright or Cheerio) run on demand or cron |
| GPS integration layer | Receive position updates from hardware GPS trackers, write to tracking_log | Webhook receiver or polling adapter; future phase |

---

## Recommended Project Structure

```
newProj1/
├── app/                        # Next.js App Router
│   ├── (public)/               # Routes behind auth gate
│   │   ├── layout.tsx          # Auth middleware check
│   │   ├── inventory/          # Car browser
│   │   ├── book/               # Booking wizard
│   │   └── dashboard/          # Customer bookings + tracking
│   ├── (admin)/                # Admin-only routes
│   │   ├── layout.tsx          # Admin role check
│   │   ├── fleet/              # Vehicle management
│   │   ├── bookings/           # Booking management
│   │   ├── verifications/      # KYC review queue
│   │   └── payments/           # Payment records
│   ├── login/                  # Public-facing login page
│   └── api/                    # Route handlers
│       ├── auth/               # Auth callbacks
│       ├── bookings/           # Booking CRUD
│       ├── payments/           # Payment intents + webhooks
│       ├── tracking/           # GPS location ingestion
│       └── admin/              # Admin operations
│
├── components/
│   ├── ui/                     # Shared UI primitives (shadcn/ui)
│   ├── inventory/              # Car cards, filters, pricing display
│   ├── booking/                # Wizard steps, date picker, summary
│   ├── tracking/               # Map component, status timeline
│   ├── payment/                # Payment method selector, forms
│   └── admin/                  # Admin tables, verification UI
│
├── lib/
│   ├── supabase/               # Client + server Supabase instances
│   ├── stripe/                 # Stripe server helpers
│   ├── crypto-payments/        # Crypto gateway adapter
│   └── gps/                    # GPS tracker adapter (future)
│
├── hooks/
│   ├── useRealtimeBooking.ts   # Supabase Realtime booking status
│   └── useDriverLocation.ts   # Supabase Realtime GPS position
│
├── scripts/
│   └── scraper/                # Framer site inventory scraper
│       ├── scrape.ts           # Main scraper entry point
│       └── transform.ts        # Raw HTML → DB schema
│
└── supabase/
    ├── migrations/             # Database schema migrations
    ├── functions/              # Edge Functions (webhook handlers)
    └── seed.sql                # Initial data
```

### Structure Rationale

- **app/(public)/**: Route group enforces auth at layout level via middleware — one check gates all customer-facing pages
- **app/(admin)/**: Separate route group with role check prevents any customer accidentally accessing admin views
- **app/api/**: All server logic lives here; keeps client components thin and stateless
- **lib/**: Third-party adapters isolated so swapping a payment gateway or GPS vendor only touches one file
- **hooks/**: Realtime subscriptions encapsulated — components just call `useRealtimeBooking(bookingId)` and get live state
- **scripts/scraper/**: Isolated from app; runs independently as a one-off or cron, not part of the web server

---

## Architectural Patterns

### Pattern 1: Login-First Gate via Middleware

**What:** All routes except `/login` and `/api/auth/*` are protected by a single Next.js middleware that checks Supabase session cookie. Unauthenticated visitors see only the login page.
**When to use:** Always — this is a core product requirement, not optional.
**Trade-offs:** Simple to implement; blocks search engine indexing of inventory (acceptable for a club-style luxury rental).

**Example:**
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isPublic = req.nextUrl.pathname.startsWith('/login') ||
                   req.nextUrl.pathname.startsWith('/api/auth')

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

### Pattern 2: Supabase Realtime for Live Booking Status

**What:** Customer dashboard subscribes to `postgres_changes` on the `bookings` table filtered by booking ID. Status transitions (confirmed → en_route → delivered) push to the browser without polling.
**When to use:** Booking status tracking and driver location during delivery window.
**Trade-offs:** Simple to implement with Supabase; no separate WebSocket server needed. Connection limit per project matters at scale (Supabase free tier: 200 concurrent).

**Example:**
```typescript
// hooks/useRealtimeBooking.ts
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useRealtimeBooking(bookingId: string) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const channel = supabase
      .channel(`booking:${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => setBooking(payload.new as Booking)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId])

  return booking
}
```

### Pattern 3: GPS Location Ingestion via Edge Function

**What:** GPS hardware trackers send position pings to a Supabase Edge Function endpoint. The Edge Function writes to `tracking_log` table. The customer map view subscribes to `tracking_log` inserts via Realtime.
**When to use:** When GPS tracker hardware is integrated (future phase). Until then, admin manually updates delivery status.
**Trade-offs:** Keeps GPS webhook logic server-side (protects secrets); Supabase Realtime delivers updates to client in near-real-time. Polling interval from tracker hardware determines location freshness (typically 10-30 seconds for moving vehicles).

**Example:**
```typescript
// supabase/functions/gps-ingest/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { vehicle_id, lat, lng, timestamp } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  await supabase.from('tracking_log').insert({ vehicle_id, lat, lng, timestamp })
  return new Response('OK', { status: 200 })
})
```

### Pattern 4: Multi-Payment Adapter Pattern

**What:** Abstract all payment methods behind a single `PaymentAdapter` interface. Stripe handles card + Apple/Google Pay. A separate crypto gateway adapter handles crypto. Bank transfer and COD are manual confirmation flows with admin approval step.
**When to use:** From the start — retrofitting payment abstraction is painful.
**Trade-offs:** More upfront code; pays off immediately when COD and crypto need different post-payment logic.

**Example:**
```typescript
// lib/payments/adapter.ts
interface PaymentAdapter {
  createIntent(amount: number, currency: string, metadata: BookingMeta): Promise<PaymentResult>
  confirmPayment(intentId: string): Promise<boolean>
  refund(intentId: string, amount?: number): Promise<boolean>
}

// Concrete implementations:
// - StripeAdapter (cards, Apple/Google Pay via Stripe PaymentElement)
// - CryptoAdapter (wraps crypto gateway SDK)
// - ManualAdapter (COD, bank transfer — creates pending record, requires admin confirm)
```

### Pattern 5: Scraper as Isolated Sync Script

**What:** The Framer site scraper runs as a standalone Node.js/Playwright script outside the Next.js app. It writes normalized vehicle records to the Supabase `vehicles` table. The web app reads from the DB — never from the Framer site directly.
**When to use:** Initial inventory seed and periodic refresh (e.g., weekly cron or manual trigger from admin dashboard).
**Trade-offs:** Decoupled from app uptime; Framer site changes can break scraper silently. Admin should be able to trigger a re-sync and review diff before committing.

---

## Data Flow

### Booking Creation Flow

```
Customer selects car + dates
        ↓
Booking wizard (client) builds BookingDraft in local state
        ↓
Step: Upload ID docs (passport, license) → POST /api/bookings/upload-docs
        │   → Supabase Storage (private bucket)
        │   → DB: identity_verification record (status: pending)
        ↓
Step: Payment → POST /api/payments/create-intent
        │   → Stripe/Crypto gateway → returns client_secret or payment URL
        │   → Customer completes payment in browser (Stripe Elements / redirect)
        ↓
Payment webhook → /api/payments/webhook (Stripe signature verified)
        │   → DB: bookings.status = 'confirmed', payments record inserted
        │   → Supabase Realtime pushes status update to customer dashboard
        ↓
Admin notification → email/SMS trigger
        │   → Admin reviews ID docs in dashboard
        │   → Admin approves: bookings.status = 'approved'
        ↓
Delivery day: Admin sets status → 'en_route'
        │   → GPS tracker (or manual location entry) writes to tracking_log
        │   → Customer map view receives Realtime updates
        ↓
Car delivered: Admin sets → 'active'
Return date: Admin sets → 'completed'
```

### Real-Time Location Flow

```
GPS Hardware Tracker (in vehicle)
        ↓ HTTP POST (every 10-30s)
Supabase Edge Function /gps-ingest
        ↓
tracking_log table (INSERT)
        ↓ Supabase Realtime postgres_changes
Customer browser (subscribed channel)
        ↓
useDriverLocation hook → updates map marker position
        ↓
Mapbox/Google Maps GL JS → renders updated pin
```

### Identity Verification Flow

```
Customer → uploads passport + license + face photo
        ↓
POST /api/bookings/upload-docs
        │   → Validate file type/size server-side
        │   → Upload to Supabase Storage private bucket
        │   → DB: identity_verification { status: 'pending', file_paths: [...] }
        ↓
Admin dashboard → verification queue
        │   → Fetch signed URLs for private files (server-side only)
        │   → Admin reviews documents
        ↓
Admin decision:
  APPROVE → identity_verification.status = 'approved'
             booking proceeds to active
  REJECT  → status = 'rejected', rejection_reason set
             customer notified, can re-upload
```

### State Management

```
Server State (Supabase / API):
  - Vehicle availability     → fetched at page load, cached with Next.js
  - Booking records          → Server Components + Realtime subscription
  - Payment state            → webhook-driven, not client-driven

Client State (React / Zustand or useState):
  - Booking wizard progress  → local component state, cleared on submit
  - Map position             → hook-managed, from Realtime subscription
  - UI toggles, modals       → local component state only

Rule: Payment and booking status are ALWAYS source-of-truth from DB,
      never from client-side state alone.
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Server-side Payment Intents + client Stripe Elements; webhook for confirmation | Use Stripe PaymentElement — handles cards + Apple/Google Pay in one component |
| Crypto gateway (e.g., Coinbase Commerce, NOWPayments) | Redirect to hosted payment page or embed widget; webhook for confirmation | NOWPayments or similar supports AED-denominated invoices; verify current UAE regulations |
| Supabase Auth | Email/password + magic link via Supabase Auth; session via HTTP-only cookie | Supabase Auth handles JWT refresh automatically with auth-helpers |
| Supabase Storage | Private bucket for ID documents; signed URLs generated server-side only | Never expose storage bucket as public — documents are sensitive |
| Supabase Realtime | postgres_changes subscription for booking/tracking; broadcast for admin alerts | Monitor connection count — Supabase free tier has limits |
| Mapbox GL JS or Google Maps JS API | Client-side map embed; receives lat/lng from Realtime hook | Mapbox preferred: cheaper at scale, better customization for luxury feel |
| GPS Tracker vendor API | Webhook receiver (Edge Function) ingests position pings | Vendor-specific; structure adapter so swap is painless |
| Email/SMS (e.g., Resend + Twilio) | Server-side calls from API routes and Edge Functions | Triggered on booking confirmation, status changes, admin alerts |
| Framer site scraper (luxeclubrentals.com) | Standalone script (Playwright headless); writes to vehicles table | One-way data flow: Framer → DB only. App never reads Framer site. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Customer app ↔ API routes | HTTPS REST (JSON) | All mutations go through API routes, not direct DB from client |
| Admin app ↔ API routes | HTTPS REST (JSON) with admin role header check | Supabase RLS enforces role at DB level as second line of defense |
| API routes ↔ Supabase | Supabase server client (service role key for mutations, anon key for public reads) | Service role key is server-only, never exposed to browser |
| Customer app ↔ Supabase Realtime | WebSocket subscription via anon key + RLS | RLS ensures customer only sees their own booking row changes |
| Scraper ↔ DB | Direct Supabase client with service role key | Scraper runs in trusted environment (local or CI), not exposed via API |
| Admin ↔ Storage | Signed URL generation via server API route | Admin fetches `/api/admin/verification/:id/docs` → server generates signed URL → returns to admin browser |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–500 users | Monolith Next.js app on Vercel + Supabase is sufficient. No queue needed. Admin manually approves bookings. |
| 500–5,000 users | Add job queue (e.g., Inngest or Trigger.dev) for async tasks: email sending, payment webhook processing, scraper runs. Move heavy admin notifications off the request path. |
| 5,000+ users | Supabase Realtime connection limits become relevant. Consider upgrading Supabase tier or migrating Realtime to a dedicated WebSocket service (Ably, Pusher). Split admin into a separate Next.js app to isolate load. |

### Scaling Priorities

1. **First bottleneck:** Supabase Realtime concurrent connections (free tier: ~200). Fix: upgrade Supabase plan or throttle tracking updates to only active deliveries.
2. **Second bottleneck:** Payment webhook handling under load. Fix: move webhook processing to an async queue (Inngest); return 200 immediately, process in background.

---

## Anti-Patterns

### Anti-Pattern 1: Client-Side Payment Confirmation

**What people do:** Trust the client to report "payment succeeded" and create bookings based on that.
**Why it's wrong:** Trivially bypassable — any user can POST "payment_status: success" and get a booking.
**Do this instead:** Payment status is ONLY set by the server-side webhook from Stripe/crypto gateway. Client never writes booking status directly.

### Anti-Pattern 2: Public Storage Bucket for Identity Documents

**What people do:** Upload passports/licenses to a public Supabase Storage bucket for easy access.
**Why it's wrong:** Exposes sensitive personal documents to anyone with the URL. GDPR/UAE PDPL compliance violation.
**Do this instead:** Private bucket + server-generated signed URLs with short expiry (e.g., 15 minutes), served only to authenticated admins via a server API route.

### Anti-Pattern 3: Direct DB Access from Client for Sensitive Operations

**What people do:** Use Supabase client directly in browser components with service role key, or rely only on RLS for all security.
**Why it's wrong:** RLS is powerful but complex; mistakes silently expose data. Service role key in browser is catastrophic.
**Do this instead:** All mutations and sensitive reads go through API routes (server-side). RLS is a second defense layer, not the only one. Never ship service role key to browser.

### Anti-Pattern 4: Polling for Location Updates

**What people do:** Poll `/api/tracking?bookingId=X` every 5 seconds to check driver position.
**Why it's wrong:** Hammers the DB, adds latency, scales poorly.
**Do this instead:** Supabase Realtime subscription. One persistent WebSocket connection delivers updates as they happen.

### Anti-Pattern 5: Embedding Scraper Logic in the Web App

**What people do:** Add a `/api/scrape` route that scrapes the Framer site on demand.
**Why it's wrong:** Scraping is slow (5-60 seconds), can fail, and blocks the request thread. Also exposes scraping to abuse.
**Do this instead:** Scraper is a standalone script triggered by admin action (button → fire-and-forget job) or scheduled cron. Never in a synchronous API route.

### Anti-Pattern 6: Single "bookings" Status as a Simple String

**What people do:** Use `status: "confirmed" | "active" | "completed"` with no history.
**Why it's wrong:** No audit trail, admin can't see who changed status when, disputes are unresolvable.
**Do this instead:** `booking_events` table (append-only log): `{booking_id, from_status, to_status, changed_by, changed_at, note}`. Current status is derived from the latest event or denormalized to `bookings.status` for query performance.

---

## Build Order Implications (for Roadmap)

The component dependencies create a clear build sequence:

```
Phase 1 — Foundation
  Supabase project setup → DB schema (vehicles, users, bookings, payments, tracking_log)
  → Auth (login gate, session middleware)
  → This MUST come first: everything depends on auth + DB

Phase 2 — Inventory
  Scraper (Playwright) → populates vehicles table
  → Car browser UI (reads vehicles from DB)
  → Scraper must run before inventory UI is meaningful

Phase 3 — Booking Flow
  Booking wizard (depends on: auth, vehicles, inventory)
  → Identity upload (depends on: Supabase Storage setup)
  → Payment integration (depends on: booking record existing)
  → Payment webhooks (depends on: Stripe/gateway account)

Phase 4 — Admin Dashboard
  Verification queue (depends on: identity upload)
  → Booking management (depends on: bookings existing)
  → Fleet management (depends on: vehicles table)
  → Can be built in parallel with booking flow if two devs

Phase 5 — Real-Time Tracking
  Supabase Realtime subscription (depends on: bookings table + auth)
  → Booking status timeline UI (depends on: booking_events table)
  → Map embed + driver location (depends on: tracking_log table)
  → GPS hardware integration (depends on: Edge Function + tracker vendor account)
  → This phase is independent enough to defer post-launch
```

**Critical dependency:** Admin dashboard needs to exist before GPS tracking is useful — admin sets delivery status manually until GPS hardware is integrated.

---

## Sources

- Architecture patterns derived from training data (Next.js App Router, Supabase architecture docs, Stripe integration patterns) — MEDIUM confidence
- Supabase Realtime postgres_changes pattern: documented in Supabase Realtime docs (training data, cutoff August 2025) — MEDIUM confidence
- Stripe PaymentElement multi-method support: Stripe official docs (training data) — MEDIUM confidence
- GPS tracker webhook ingestion pattern: standard IoT pattern, widely documented — MEDIUM confidence
- Build order derived from dependency analysis of stated requirements — HIGH confidence (logical, not empirical)

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings are from training data (cutoff August 2025). Recommend verifying Supabase Realtime connection limits, current Stripe PaymentElement capabilities for UAE/AED, and UAE crypto payment regulations before implementation.

---
*Architecture research for: Luxury car rental booking system with real-time delivery tracking (LuxeClub Dubai)*
*Researched: 2026-02-20*
