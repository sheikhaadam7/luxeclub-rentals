# Phase 02: Inventory + Catalogue - Research

**Researched:** 2026-02-20
**Domain:** Web scraping (Playwright), catalogue UI (Next.js App Router + Tailwind v4), availability calendar (react-day-picker v9), Supabase Storage + PostgreSQL
**Confidence:** HIGH (core stack), MEDIUM (scraper architecture patterns)

---

## Summary

This phase has two independent sub-systems that must be planned and built separately: a **Playwright scraper** that imports vehicle inventory from luxeclubrentals.com into Supabase, and a **catalogue UI** that lets logged-in users browse those vehicles with real-time availability calendars.

The scraper is a standalone Node.js/TypeScript script — not a Next.js API route or Server Action. It runs outside the Next.js process, uses the Supabase `service_role` key to bypass RLS, upserts vehicle records idempotently, uploads images to Supabase Storage, and writes a `scraped_at` timestamp that the admin dashboard watches for staleness. The most important technical challenge is scraping a Framer (JS-rendered) site: `waitForLoadState('networkidle')` is officially discouraged; the correct pattern is `waitForSelector` targeting a known rendered element, combined with blocking images/CSS/fonts via `page.route()` for speed.

The catalogue UI is a Next.js App Router Server Component page at `/catalogue`. Vehicle cards display photo, name, specs, and rates. Each car has a detail page with a `react-day-picker` v9 calendar that marks booked dates as disabled. Since Supabase image transformations (resizing/WebP conversion) require the Pro Plan, the simpler path is to configure `next/image` `remotePatterns` to allow the Supabase Storage hostname and serve images as-is, relying on Next.js built-in image optimization. Admin override and staleness alerts are thin Server Action + DB query features, not a complex separate system.

**Primary recommendation:** Scraper = standalone `scripts/scraper/` TypeScript files run via `npx tsx`; catalogue UI = Server Component with grid layout + Client Component availability calendar using `react-day-picker` v9; no new libraries needed for admin override (existing Server Actions + Supabase client).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `playwright` | 1.50+ (latest) | Headless browser scraping of JS-rendered Framer site | Only browser-automation tool that handles Framer's client-rendered content; confirmed needed in prior decisions |
| `react-day-picker` | 9.13.2 | Availability calendar with blocked dates | Lightweight, headless-friendly, TypeScript-first, `disabled` prop accepts `Date[]` arrays from DB queries |
| `@supabase/supabase-js` | 2.97.0 (already installed) | Scraper writes data to Supabase using service_role key | Already in project; service_role bypasses RLS for scraper inserts |
| `next/image` | built-in (Next.js 16.1.6) | Serving vehicle photos with optimization | No extra install; `remotePatterns` config allows Supabase Storage hostname |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | latest | Run TypeScript scraper scripts directly without compiling | Avoids separate tsconfig for scraper; `npx tsx scripts/scraper/run.ts` |
| `date-fns` | latest (peer dep of react-day-picker) | Date manipulation utilities | react-day-picker v9 uses date-fns internally; use it in calendar components too |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-day-picker` | `react-datepicker` | react-datepicker is heavier, less TypeScript-native; react-day-picker v9 has cleaner `disabled` + range API |
| `react-day-picker` | Custom calendar | Never hand-roll a calendar; disabled-date edge cases (range spanning blocked dates, timezone offsets) are a maintenance trap |
| Supabase Image Transformations (resize/WebP) | `next/image` built-in optimizer | Supabase transforms require **Pro Plan** — not available on free tier. Use `next/image` with `remotePatterns` instead |
| Standalone script | Next.js API route for scraper | Route handlers have request timeout limits; scraper can run for minutes; keep it as a standalone script |

**Installation:**
```bash
# Install Playwright (in project root — scraper shares the same package.json)
npm install playwright
npx playwright install chromium

# react-day-picker for catalogue
npm install react-day-picker date-fns

# tsx for running scraper TS directly (devDependency)
npm install -D tsx
```

---

## Architecture Patterns

### Recommended Project Structure

```
/
├── scripts/
│   └── scraper/
│       ├── run.ts              # Entry point — launches browser, orchestrates
│       ├── scrape-vehicles.ts  # Page navigation + data extraction logic
│       ├── upload-images.ts    # Downloads images, uploads to Supabase Storage
│       └── upsert-db.ts        # Writes vehicle records to Postgres via service_role
├── app/
│   └── (protected)/
│       ├── catalogue/
│       │   ├── page.tsx            # Server Component — fetches vehicles, renders grid
│       │   └── [id]/
│       │       └── page.tsx        # Server Component — vehicle detail + calendar data
│       ├── admin/
│       │   └── page.tsx            # Admin: staleness alert + manual override UI
│       └── dashboard/
│           └── page.tsx            # Existing (Phase 1)
├── components/
│   ├── catalogue/
│   │   ├── VehicleCard.tsx         # Server Component — photo, name, rates badge
│   │   └── VehicleGrid.tsx         # Server Component — responsive grid wrapper
│   └── ui/
│       └── AvailabilityCalendar.tsx  # Client Component — react-day-picker
├── lib/
│   └── supabase/
│       ├── server.ts               # Existing (Phase 1) — authenticated user client
│       ├── client.ts               # Existing (Phase 1) — browser client
│       └── admin.ts                # NEW — service_role client for server-only admin use
└── supabase/
    └── migrations/
        ├── 20260220000000_create_profiles.sql   # Phase 1
        └── 202602XXXXXX_create_vehicles.sql     # Phase 2 — vehicles + bookings tables
```

### Pattern 1: Scraper as Standalone TypeScript Script

**What:** A `scripts/scraper/run.ts` file that uses Playwright as a library (not a test runner), navigates luxeclubrentals.com, waits for the content to render, extracts vehicle data, uploads images to Supabase Storage, and upserts records to Postgres.

**When to use:** Any time inventory needs refreshing; triggered manually or via cron/GitHub Actions.

**Example:**
```typescript
// Source: https://playwright.dev/docs/library
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service_role bypasses RLS
)

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Block images, CSS, fonts for speed — does NOT affect DOM/JS content
  // Source: https://scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-blocking-images-resources/
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType()
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      route.abort()
    } else {
      route.continue()
    }
  })

  await page.goto('https://www.luxeclubrentals.com', { waitUntil: 'domcontentloaded' })

  // IMPORTANT: 'networkidle' is officially DISCOURAGED by Playwright docs.
  // Instead, wait for a known rendered element — must be determined by manual inspection.
  // Placeholder selector — will need to be updated after manual site inspection.
  await page.waitForSelector('[data-framer-component-type]', { timeout: 15000 })

  // Extract vehicle data ...
  const vehicles = await page.evaluate(() => {
    // DOM extraction code runs in browser context
    return Array.from(document.querySelectorAll('.vehicle-card')).map(el => ({
      name: el.querySelector('.name')?.textContent?.trim(),
      // ... etc
    }))
  })

  await browser.close()

  // Upsert — idempotent, safe to re-run
  const { error } = await supabase
    .from('vehicles')
    .upsert(vehicles, { onConflict: 'slug', ignoreDuplicates: false })

  // Write staleness timestamp
  await supabase.from('scraper_runs').insert({
    ran_at: new Date().toISOString(),
    vehicle_count: vehicles.length,
    status: error ? 'error' : 'success',
  })
}

run().catch(console.error)
```

**CRITICAL UNKNOWNS — requires manual inspection of luxeclubrentals.com:**
The actual DOM selectors, element structure, and which CSS classes/attributes identify vehicle cards are unknown until the site is manually inspected in a browser. The `waitForSelector` target selector must be determined empirically. The scraper plan (02-01) must include a task: "manually inspect luxeclubrentals.com in dev browser, document selectors".

### Pattern 2: Resource Blocking for Performance

**What:** `page.route()` intercepts all requests before they're sent and aborts resource types that don't contain data content.

**Result (measured):** Blocking images+CSS+fonts reduces data transfer from ~1.9 MB to ~8.7 KB and cuts load time by 85-87%.

**Example:**
```typescript
// Source: https://scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-blocking-images-resources/
await page.route('**/*', (route) => {
  const type = route.request().resourceType()
  if (['image', 'stylesheet', 'font', 'media', 'other'].includes(type)) {
    route.abort()
  } else {
    route.continue()
  }
})
```

**WARNING:** For a Framer site, JavaScript must NOT be blocked — Framer renders everything via JS. Only block `image`, `stylesheet`, `font`, `media`.

### Pattern 3: Supabase Service Role Admin Client

**What:** A separate Supabase client initialized with `SUPABASE_SERVICE_ROLE_KEY` that bypasses RLS for admin/scraper writes.

**When to use:** Scraper writes, admin override Server Actions. Never in client components. Never exposed to browser.

**Example:**
```typescript
// lib/supabase/admin.ts — SERVER ONLY, never import in client components
import { createClient } from '@supabase/supabase-js'

// Called on-demand, not a singleton, to avoid accidental leaks
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
```

### Pattern 4: Availability Calendar — Client Component

**What:** `react-day-picker` v9 `DayPicker` in read-only display mode with booked date ranges passed as the `disabled` prop.

**Example:**
```typescript
// components/ui/AvailabilityCalendar.tsx
'use client'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

interface Props {
  bookedRanges: Array<{ from: Date; to: Date }>
}

export function AvailabilityCalendar({ bookedRanges }: Props) {
  return (
    <DayPicker
      mode="single"           // read-only display — user can't select
      disabled={[
        { before: new Date() }, // past dates
        ...bookedRanges,        // booked ranges from DB
      ]}
      // Custom class names to match dark luxury theme
      classNames={{
        root: 'text-white',
        day: 'text-white/70 hover:bg-white/10 rounded',
        day_disabled: 'text-white/20 cursor-not-allowed',
        nav_button: 'text-brand-cyan',
        caption: 'text-white font-display',
      }}
    />
  )
}
```

**Source:** https://daypicker.dev/selections/disabling-dates (verified: `disabled` prop accepts `DateRange[]`, `Date[]`, `DateBefore`, and custom functions. `excludeDisabled` prop prevents ranges from spanning blocked dates.)

### Pattern 5: next/image with Supabase Storage

**What:** Configure `remotePatterns` in `next.config.ts` to allow Supabase Storage URLs, then use `<Image>` normally.

**Example:**
```typescript
// next.config.ts — MUST add remotePatterns for Supabase Storage
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',  // covers project-specific subdomains
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
```

**Source:** https://nextjs.org/docs/app/api-reference/config/next-config-js/images (verified — official Next.js 16.1.6 docs, fetched 2026-02-20). The Supabase custom loader example is also in the official Next.js docs.

**Note on Supabase Image Transformations:** The resize/WebP optimization URL endpoint (`/render/image/`) requires Supabase **Pro Plan**. On the free tier, serve images directly from `/storage/v1/object/public/` and rely on Next.js built-in optimization. This is the safe default.

### Pattern 6: Idempotent DB Upsert

**What:** Scraper re-runs without duplicating records using Postgres `ON CONFLICT ... DO UPDATE`.

**Example (via supabase-js):**
```typescript
// Source: https://supabase.com/docs/reference/javascript/start
await supabase
  .from('vehicles')
  .upsert(
    vehicles.map(v => ({
      slug: v.slug,                 // unique constraint — conflict key
      name: v.name,
      daily_rate: v.daily_rate,
      scraped_at: new Date().toISOString(),
      // ...
    })),
    {
      onConflict: 'slug',           // conflict on slug column
      ignoreDuplicates: false,       // DO UPDATE (not DO NOTHING) — refreshes scraped_at
    }
  )
```

### Pattern 7: Staleness Detection

**What:** A DB table `scraper_runs` records each run's timestamp and vehicle count. Admin page shows a warning if `ran_at < NOW() - INTERVAL '24 hours'` or if `vehicle_count < threshold`.

**Schema:**
```sql
CREATE TABLE scraper_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vehicle_count INT,
  status      TEXT CHECK (status IN ('success', 'error')),
  error_msg   TEXT
);
```

**Admin staleness check (Server Component):**
```typescript
const { data: lastRun } = await supabase
  .from('scraper_runs')
  .select('ran_at, vehicle_count, status')
  .order('ran_at', { ascending: false })
  .limit(1)
  .single()

const isStale = !lastRun ||
  new Date(lastRun.ran_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
```

### Anti-Patterns to Avoid

- **Using `waitForLoadState('networkidle')` as primary wait:** Officially discouraged by Playwright. Use `waitForSelector` targeting a rendered element instead. `networkidle` is unreliable on sites with polling/analytics.
- **Blocking JavaScript on Framer sites:** Framer renders entirely via JS. Only block `image`, `stylesheet`, `font`, `media` resource types.
- **Running scraper as a Next.js API Route:** Route handlers have default timeouts; scraper may run for 30-120 seconds. Keep as standalone script.
- **Using Supabase Image Transformations on free tier:** The `/render/image/` URL requires Pro Plan. Serving from `/storage/v1/object/public/` with `remotePatterns` + Next.js built-in optimization is correct for free tier.
- **Using `getSession()` instead of `getClaims()` in Server Actions:** Already established in Phase 1 — `getClaims()` validates JWT signature. Continue this pattern in all Phase 2 Server Actions.
- **Client component importing `createAdminClient`:** `SUPABASE_SERVICE_ROLE_KEY` must never reach the browser. Admin client import must only appear in Server Actions, server-only lib files, and standalone scripts.

---

## Database Schema

### Vehicles Table
```sql
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,         -- conflict key for upsert
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,                         -- e.g., 'SUV', 'Sports', 'Sedan'
  daily_rate      NUMERIC(10, 2),
  weekly_rate     NUMERIC(10, 2),
  monthly_rate    NUMERIC(10, 2),
  specs           JSONB,                        -- flexible: engine, seats, transmission, etc.
  image_urls      TEXT[],                       -- array of Supabase Storage public URLs
  primary_image_url TEXT,                       -- first/hero image
  is_available    BOOLEAN NOT NULL DEFAULT true, -- admin override flag
  override_notes  TEXT,                         -- admin manual override reason
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all available vehicles
CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);  -- or USING (is_available = true) if hiding admin-disabled

-- Only service_role (scraper + admin Server Actions) can write
-- service_role bypasses RLS automatically — no insert policy needed
```

### Bookings Table (for availability calendar — Phase 2 scope)
```sql
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users see only their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Catalogue page needs to show booked dates for all vehicles — needs separate policy
-- Option A: public read of just vehicle_id + date range (no PII)
-- Option B: use a DB function that returns blocked dates for a vehicle_id
```

**NOTE:** The availability calendar only needs blocked date ranges, not booking details. A Postgres RPC function returning `[{ from, to }]` for a given `vehicle_id` is cleaner than a policy exposing full booking rows.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Availability calendar with blocked dates | Custom calendar component | `react-day-picker` v9 | Timezone handling, leap years, range edge cases, accessibility — all solved |
| Image serving + optimization | Custom image proxy | `next/image` with `remotePatterns` | Lazy loading, blur placeholder, WebP, responsive sizes — built-in |
| Idempotent scraper writes | Custom INSERT with SELECT first | Postgres `ON CONFLICT ... DO UPDATE` | Atomic, no race conditions, no duplicate rows |
| Admin role gating | Custom session role checks | Supabase custom claims + `auth.jwt()` in RLS | Database-level enforcement, not just UI gating |
| Scraper scheduling | Custom Node.js cron daemon | GitHub Actions scheduled workflow | No server required; runs on push or schedule; free |

**Key insight:** The calendar's blocked-date logic looks simple but has real edge cases: ranges that partially overlap disabled dates, month boundary navigation, timezone midnight cutoffs. `react-day-picker` handles all of them. Build the data layer (DB query returning booked ranges) — don't build the UI logic.

---

## Common Pitfalls

### Pitfall 1: Framer Site — waitForSelector Target Unknown Until Manual Inspection

**What goes wrong:** Scraper uses wrong selector or relies on `networkidle`; gets empty data or times out.

**Why it happens:** Framer sites use generated class names that may change on redeploy. Content is injected client-side after several hydration passes.

**How to avoid:** Manually open `www.luxeclubrentals.com` in Chrome DevTools, find a stable attribute (data attributes, ARIA roles, structural elements) that definitively signals content has rendered. Prefer `[data-framer-component-type]`, `[role="main"]`, or the first vehicle card's container.

**Warning signs:** `page.evaluate()` returns empty arrays; `waitForSelector` times out at 15s.

### Pitfall 2: Blocking JS Breaks Framer Rendering

**What goes wrong:** Developer adds `'script'` to the blocked resource types list; Framer fails to render, scraper gets empty page.

**Why it happens:** Natural extension of "block everything we don't need."

**How to avoid:** Only block `['image', 'stylesheet', 'font', 'media']`. Never block `'script'` or `'xhr'`/`'fetch'` on Framer sites.

**Warning signs:** `page.evaluate()` returns empty DOM; page title present but no vehicle content.

### Pitfall 3: next/image Fails with Supabase Storage Without remotePatterns

**What goes wrong:** `<Image src="https://xyz.supabase.co/storage/...">` throws error: `INVALID_IMAGE_OPTIMIZE_REQUEST`.

**Why it happens:** Next.js blocks external image optimization by default for security.

**How to avoid:** Add `remotePatterns` to `next.config.ts` before wiring up any `<Image>` components. Do this as the first task in the catalogue UI plan.

**Warning signs:** Runtime error in development: `Error: Invalid src prop... hostname "xyz.supabase.co" is not configured under images.remotePatterns`.

### Pitfall 4: service_role Key in Client Component

**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` appears in browser network tab; full database access exposed.

**Why it happens:** `lib/supabase/admin.ts` imported in a Client Component or passed as a prop.

**How to avoid:** `admin.ts` must only be imported in files that are guaranteed server-only: `'use server'` Server Actions, standalone scripts, or files in `lib/` that are never imported by client components. Add `import 'server-only'` at the top of `lib/supabase/admin.ts`.

**Warning signs:** Next.js build warning about exposing server-only modules; secret appears in browser DevTools network response.

### Pitfall 5: Availability Calendar Timezone Mismatch

**What goes wrong:** A vehicle shows available on Dec 31 on the calendar, but booking is actually Dec 31 23:59 UTC which is Jan 1 in Dubai (UTC+4).

**Why it happens:** Dates stored as UTC `TIMESTAMPTZ`, displayed in user's local timezone; off-by-one on day boundaries.

**How to avoid:** Store booking dates as `DATE` (not `TIMESTAMPTZ`) — a date-only type has no timezone ambiguity. When querying blocked dates for the calendar, return them as `DATE` strings (YYYY-MM-DD) and convert to local `Date` objects on the client.

**Warning signs:** Calendar shows wrong dates as blocked compared to what's in the DB.

### Pitfall 6: Admin Role — No User Is Admin by Default

**What goes wrong:** Admin page loads for all authenticated users with no protection.

**Why it happens:** No role system was set up in Phase 1.

**How to avoid:** Use Supabase Custom Claims (Auth Hook) to set `user_role: 'admin'` in the JWT for admin users. Check `claims.user_role === 'admin'` in admin Server Actions and the admin page Server Component. Document the manual process for granting admin to the first user (run SQL directly: `UPDATE auth.users SET raw_app_meta_data = '{"role": "admin"}' WHERE email = '...'` — or use the Supabase dashboard).

**Warning signs:** Any logged-in user can access `/admin`; admin actions succeed for non-admin users.

---

## Code Examples

Verified patterns from official sources:

### Playwright — Standalone Script Entry Point
```typescript
// Source: https://playwright.dev/docs/library
import { chromium } from 'playwright'

(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Block non-data resources — verified performance improvement
  // Source: https://scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-blocking-images-resources/
  await page.route('**/*', (route) => {
    const type = route.request().resourceType()
    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
      route.abort()
    } else {
      route.continue()
    }
  })

  await page.goto('https://www.luxeclubrentals.com', { waitUntil: 'domcontentloaded' })

  // Wait for JS-rendered content — selector TBD via manual inspection
  await page.waitForSelector('SELECTOR_FROM_MANUAL_INSPECTION', { timeout: 20000 })

  const data = await page.evaluate(() => {
    // extraction logic
  })

  await browser.close()
})()
```

### react-day-picker v9 — Disabled Date Ranges
```typescript
// Source: https://daypicker.dev/selections/disabling-dates (verified)
import { DayPicker } from 'react-day-picker'

// disabled prop accepts: Date, Date[], DateRange, DateBefore, DateAfter, (date) => boolean
// DateRange = { from: Date; to: Date }

<DayPicker
  mode="single"
  disabled={[
    { before: new Date() },                          // past dates
    { from: new Date('2026-03-01'), to: new Date('2026-03-07') }, // booked range
  ]}
  excludeDisabled  // prevents range selection from spanning disabled dates
/>
```

### Supabase — Service Role Client (Server Only)
```typescript
// Source: https://supabase.com/docs/guides/api/api-keys (service_role usage)
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypasses RLS — server only
  )
}
```

### Supabase — Upsert with ON CONFLICT
```typescript
// Source: https://supabase.com/docs/reference/javascript/start
const { error } = await adminClient
  .from('vehicles')
  .upsert(
    vehicleRows,
    { onConflict: 'slug', ignoreDuplicates: false }
  )
```

### next.config.ts — remotePatterns for Supabase Storage
```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/images (verified 2026-02-20)
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
```

### Supabase Realtime — Postgres Changes (Client Component)
```typescript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes (verified)
// Use only if real-time availability updates are needed — Phase 2 likely doesn't need this
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

const supabase = createClient()

useEffect(() => {
  const channel = supabase
    .channel('vehicles-availability')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      (payload) => {
        // refresh availability display
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

**NOTE:** Realtime subscription requires enabling replication for the `bookings` table in Supabase dashboard (Realtime > Tables). This is optional for Phase 2 — the availability calendar is a read-only display that can be pre-rendered at request time.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `waitForLoadState('networkidle')` for JS-rendered content | `waitForSelector(knownElement)` | Playwright 1.x+ (discouraged since 2023) | More reliable, faster |
| Separate `domains` config for `next/image` | `remotePatterns` (stricter) | Next.js 13+ | `domains` deprecated; `remotePatterns` required in Next.js 16 |
| Supabase `getSession()` for auth | `getClaims()` (JWT signature validated) | 2025 (CVE-2025-29927) | Already in Phase 1 — continue using |
| react-day-picker v7/v8 API | v9 API (`mode`, `disabled` as Matcher array) | react-day-picker v9 (2024) | Breaking change from v8; v9 has better TypeScript types |

**Deprecated/outdated:**
- `domains` in `next/image` config: replaced by `remotePatterns`; still works but deprecated
- `getSession()` on server: established as unsafe in Phase 1; use `getClaims()`
- react-day-picker v7/v8 docs: many Google results still show old API; use only v9 docs at daypicker.dev

---

## Open Questions

1. **What is the actual DOM structure of luxeclubrentals.com?**
   - What we know: It's a Framer/JS-rendered site; WebFetch cannot scrape it
   - What's unclear: Which CSS selectors or data attributes identify vehicle cards, names, prices, images, specs
   - Recommendation: Plan 02-01 MUST include a manual inspection task before writing any scraper code. Open the site in Chrome DevTools, document the structure, then code. Expect Framer-generated class names to be volatile; prefer data attributes and structural hierarchy.

2. **Does luxeclubrentals.com have rate information (daily/weekly/monthly) on the page, or only on vehicle detail pages?**
   - What we know: Phase requirements say all three rate types are needed
   - What's unclear: Whether one scrape pass is enough or whether the scraper needs to visit each vehicle detail page individually
   - Recommendation: Assume multi-page scrape (list + each detail) to be safe. Document after manual inspection.

3. **How should admin role be bootstrapped for the first user?**
   - What we know: Supabase custom claims via Auth Hook is the standard approach; no admin user exists yet
   - What's unclear: Whether the project will use Supabase Auth Hooks or a simpler `profiles.role` column
   - Recommendation: For Phase 2, use the simpler `profiles.role TEXT` column approach (just add `role` to the existing `profiles` table). Reserve Supabase Auth Hooks for a later phase when JWT-level RBAC is needed. Admin check = `SELECT role FROM profiles WHERE id = auth.uid()` in Server Actions.

4. **Should the catalogue support real-time availability updates, or is server-rendered sufficient?**
   - What we know: Supabase Realtime Postgres Changes works in Next.js App Router via Client Components; adds complexity; requires enabling replication on tables
   - What's unclear: Whether users will have multiple tabs open simultaneously or see stale data
   - Recommendation: For Phase 2, pre-render availability at page request time (Server Component). Add realtime only if it becomes a user complaint. The requirement says "real-time availability calendar that blocks dates already booked" — this is satisfied by a fresh server-rendered DB query on each page load.

5. **Where does the scraper run? Local machine or CI?**
   - What we know: It's a standalone Node.js script; can be triggered manually or via GitHub Actions cron
   - What's unclear: Whether Playwright will be installed in the deployment environment
   - Recommendation: For Phase 2, manual run is sufficient. Document `npx playwright install chromium` as a setup step. GitHub Actions cron is a Phase 3+ concern (referenced in CAT-05 "monitoring" requirement).

---

## Sources

### Primary (HIGH confidence)
- `playwright.dev/docs/library` — Playwright standalone script pattern, TypeScript imports, browser lifecycle
- `playwright.dev/docs/api/class-page#page-route` — `page.route()` and `route.abort()` API
- `playwright.dev/docs/api/class-page#page-wait-for-load-state` — `networkidle` officially discouraged, confirmed
- `daypicker.dev/selections/disabling-dates` — react-day-picker v9 `disabled` prop, Matcher types, `excludeDisabled`
- `nextjs.org/docs/app/api-reference/config/next-config-js/images` — `remotePatterns` config, official Supabase loader example (fetched 2026-02-20, version-tagged as Next.js 16.1.6)
- `supabase.com/docs/guides/realtime/postgres-changes` — Realtime subscription pattern, limitations
- `supabase.com/docs/guides/storage/security/access-control` — service_role bypasses RLS entirely
- `supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac` — Auth Hook custom claims pattern

### Secondary (MEDIUM confidence)
- `scrapeops.io/playwright-web-scraping-playbook/nodejs-playwright-blocking-images-resources/` — resource blocking performance measurements (99.5% bandwidth reduction verified across multiple sources)
- `supabase.com/docs/guides/storage/serving/image-transformations` — Image transformation URL parameters, Pro Plan requirement (critical: confirmed free tier limitation)
- WebSearch + official docs cross-verify: `ON CONFLICT` upsert is standard Postgres since v9.5, works via supabase-js `upsert()` method

### Tertiary (LOW confidence)
- Specific Framer site selectors: NONE — requires manual empirical inspection; cannot be determined from research
- `luxeclubrentals.com` inventory structure: NONE — WebFetch confirmed it cannot render the Framer site

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against official docs + Context7 equivalent sources
- Architecture: HIGH for patterns; MEDIUM for scraper (selector strategy unknown until manual inspection)
- Pitfalls: HIGH — all cross-verified with official documentation
- Framer site structure: LOW — requires manual inspection; no automated research can substitute

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable libraries); scraper selectors valid until luxeclubrentals.com redesigns

**Key constraint for planning:** Plan 02-01 (scraper) MUST begin with a manual site inspection task. No selector code should be written until the DOM structure is documented. This is not optional — it is the only unknown that cannot be resolved through research.
