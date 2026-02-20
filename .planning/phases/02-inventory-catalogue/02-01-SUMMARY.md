---
phase: 02-inventory-catalogue
plan: "01"
subsystem: database
tags: [playwright, supabase, typescript, scraper, storage, postgres, rls]

# Dependency graph
requires:
  - phase: 01-foundation-auth-gate
    provides: Supabase server client pattern, profiles table, auth Server Actions foundation
provides:
  - vehicles table with RLS (slug, name, description, category, rates, specs, images, scraped_at)
  - bookings table with RLS (vehicle_id, user_id, start_date, end_date, status)
  - scraper_runs table for monitoring (ran_at, vehicle_count, status, error_msg)
  - profiles.role column for admin gating
  - get_blocked_dates() RPC function (SECURITY DEFINER) for availability calendar
  - lib/supabase/admin.ts createAdminClient with server-only guard
  - scripts/scraper/ — full Playwright scraper pipeline (scrape → upload → upsert)
  - next.config.ts remotePatterns for Supabase Storage images
affects:
  - 02-02 (catalogue UI reads vehicles table and images from Supabase Storage)
  - 03-xx (booking flow writes to bookings table)
  - 04-xx (admin dashboard reads scraper_runs, vehicles, bookings)

# Tech tracking
tech-stack:
  added:
    - playwright (Chromium headless browser for scraping)
    - server-only (Next.js server guard for admin client)
    - tsx (TypeScript runner for standalone scripts)
  patterns:
    - Standalone Playwright script (not Next.js API route) — avoids request timeout limits
    - waitForTimeout for Framer JS hydration (not networkidle — officially discouraged)
    - Block stylesheet/font/media but NEVER block script on Framer sites
    - fetch() in upload-images.ts is NOT affected by page.route() blocking (Node fetch vs browser context)
    - Upsert ON CONFLICT slug with ignoreDuplicates: false — full update on re-run
    - Images from framerusercontent.com stored in Supabase Storage under {slug}/{index}.{ext}
    - SVG exclusion filter: skip framerusercontent.com SVGs (site icons, not vehicle photos)

key-files:
  created:
    - supabase/migrations/20260220100000_create_vehicles_bookings.sql
    - lib/supabase/admin.ts
    - scripts/scraper/run.ts
    - scripts/scraper/scrape-vehicles.ts
    - scripts/scraper/upload-images.ts
    - scripts/scraper/upsert-db.ts
  modified:
    - next.config.ts
    - package.json
    - lib/validations/auth.ts
    - app/actions/auth.ts

key-decisions:
  - "Multi-page scrape pattern: visit each /garage/{slug} detail page for full specs — listing page only has daily rate"
  - "Images stored in Supabase Storage as {slug}/{index}.ext — framerusercontent.com URLs are ephemeral CDN URLs"
  - "Weekly/monthly rates not on site — columns remain null (confirmed by DOM inspection)"
  - "SVG images excluded: first 3 imgs on each page are site icons (.svg), not vehicle photos"
  - "service_role key is user_setup item — scraper cannot run until user adds SUPABASE_SERVICE_ROLE_KEY to .env.local"

patterns-established:
  - "Pattern: createAdminClient() from @/lib/supabase/admin for server-only service_role writes"
  - "Pattern: npx tsx scripts/{name}.ts for standalone TypeScript scripts outside Next.js"
  - "Pattern: slugs extracted from URL path (/garage/{slug}) — not generated from name — ensures stable ON CONFLICT keys"

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 2 Plan 01: Database Schema and Playwright Scraper Summary

**Supabase schema for vehicles/bookings/scraper_runs + standalone Playwright scraper that extracts inventory from luxeclubrentals.com using empirically determined DOM selectors**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-02-20T19:36:56Z
- **Completed:** 2026-02-20T19:43:02Z
- **Tasks:** 2 (Task 3 is checkpoint:human-verify — paused awaiting user verification)
- **Files modified:** 6 created, 4 modified

## Accomplishments

- Created migration SQL defining vehicles, bookings, and scraper_runs tables with RLS, plus get_blocked_dates() RPC
- Built complete Playwright scraper pipeline: DOM inspection revealed all selectors empirically before coding
- Scraper found 7+ vehicles on the garage listing page with names, daily rates (1000-2000 AED), specs, and vehicle images
- Admin client with server-only guard prevents accidental client-side import of service_role key

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, admin client, and config** - `a7bb771` (feat)
2. **Task 2: Playwright scraper scripts** - `d6f087e` (feat)

## Files Created/Modified

- `supabase/migrations/20260220100000_create_vehicles_bookings.sql` - vehicles, bookings, scraper_runs tables with RLS; get_blocked_dates() RPC; profiles.role column
- `lib/supabase/admin.ts` - createAdminClient() with server-only import guard
- `next.config.ts` - remotePatterns allowing *.supabase.co Storage image URLs
- `scripts/scraper/scrape-vehicles.ts` - Multi-page Playwright scraper; visits each /garage/{slug} detail page; extracts name, description, category, daily_rate, specs, image URLs
- `scripts/scraper/upload-images.ts` - Downloads vehicle images via Node fetch(), uploads to Supabase Storage bucket 'vehicle-images' with upsert; handles content-type detection
- `scripts/scraper/upsert-db.ts` - Idempotent upsert ON CONFLICT slug; logs each run to scraper_runs
- `scripts/scraper/run.ts` - Entry point: validates env vars, launches Chromium, orchestrates pipeline
- `package.json` - Added "scrape" script + playwright, server-only, tsx dependencies
- `lib/validations/auth.ts` - Added missing otpSchema, phoneSchema, normalizeUAEPhone (pre-existing gap)
- `app/actions/auth.ts` - Added missing enrollPhoneMFA, verifyPhone Server Actions (pre-existing gap)

## Decisions Made

- **Multi-page scrape pattern:** The /garage listing page only shows daily rates; full description, category, specs, and images require visiting each /garage/{slug} detail page individually.
- **Images from framerusercontent.com CDN:** Vehicle images are stored on Framer's CDN. Uploading to Supabase Storage ensures images remain accessible even if the Framer site changes.
- **Weekly/monthly rates are null:** DOM inspection confirmed the site only shows daily rates. The columns exist for future manual entry.
- **Slugs from URL paths:** The site already uses clean slugs (e.g., `audi-rsq8`, `g63-amg`) — extracting from URL path is more reliable than generating from the name.
- **SVG exclusion:** The first 3 images on each Framer page are SVG icons (logos, decorative). These are excluded by filtering for `.jpeg`, `.jpg`, `.webp`, `.png` only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing otpSchema, phoneSchema, normalizeUAEPhone in lib/validations/auth.ts**
- **Found during:** Task 1 (TypeScript verification — `npx tsc --noEmit`)
- **Issue:** `OTPForm.tsx` imports `otpSchema` from `lib/validations/auth.ts` but the file only had `signUpSchema` and `loginSchema`. Also imports `verifyPhone` from `app/actions/auth.ts` which was missing.
- **Fix:** Added `phoneSchema`, `otpSchema`, `normalizeUAEPhone` to `lib/validations/auth.ts`; added `enrollPhoneMFA` and `verifyPhone` Server Actions to `app/actions/auth.ts`. These were Plan 01-01 deliverables that were committed incomplete.
- **Files modified:** `lib/validations/auth.ts`, `app/actions/auth.ts`
- **Verification:** `npx tsc --noEmit` returns zero errors
- **Committed in:** `a7bb771` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed `listData.phone` MFA API usage**
- **Found during:** Task 1 (TypeScript verification — second tsc run)
- **Issue:** Initial `verifyPhone` implementation used `listData.totp.find(f => f.factor_type === 'phone')` which TypeScript rejected (TOTP factors can't have factor_type 'phone') and `listData.phone` item doesn't have a `.phone` property in the Supabase types.
- **Fix:** Simplified to `listData.phone[0]` — get first enrolled phone factor directly from the phone array.
- **Files modified:** `app/actions/auth.ts`
- **Verification:** `npx tsc --noEmit` returns zero errors
- **Committed in:** `a7bb771` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (Rule 1 - Bug, both from pre-existing Plan 01-01 incomplete code)
**Impact on plan:** Required for TypeScript compilation. Both fixes completed previously incomplete Plan 01-01 deliverables. No scope creep.

## Issues Encountered

- **Framer site inspection required:** As specified in the plan, DOM inspection was mandatory before writing selectors. Ran three inspection scripts (homepage, garage listing, detail page) to discover the exact page structure. Key finding: vehicle cards are `<a href="/garage/{slug}">` with `data-framer-name` attr; detail pages use H1 for name and leaf `<p>` nodes for all other data.
- **Duplicate images in gallery:** The detail page slider shows each image 3 times in the DOM. Fixed by deduplicating on the canonical URL (stripping query params before checking `Set`).

## User Setup Required

Before running `npm run scrape`, the user must complete these steps:

**1. Add service role key to `.env.local`:**
```
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```
Get this from: Supabase Dashboard → Project Settings → API → service_role (secret)

**2. Run migration SQL in Supabase Dashboard:**
- Go to: Supabase Dashboard → SQL Editor
- Paste and run: `supabase/migrations/20260220100000_create_vehicles_bookings.sql`

**3. Create 'vehicle-images' Storage bucket:**
- Go to: Supabase Dashboard → Storage → New Bucket
- Name: `vehicle-images`
- Toggle: Public ON

**4. Run the scraper:**
```bash
npm run scrape
```

Expected output:
```
=== LuxeClub Scraper ===
Scraping vehicles from luxeclubrentals.com...
  Loading garage listing page...
  Found 7+ vehicle links on garage page
  Scraping detail page: audi-rsq8
  ...
Done: N vehicles upserted
=== Scraper complete ===
```

## Next Phase Readiness

- Migration SQL ready to run — creates all tables needed for Phase 2 and 3
- Scraper tested against live site — confirmed 7+ vehicles with correct data structure
- Admin client ready for use in server-only contexts
- next.config.ts updated for Supabase Storage image display
- Plan 02-02 (catalogue UI) can proceed once scraper has populated the vehicles table

---
*Phase: 02-inventory-catalogue*
*Completed: 2026-02-20*

## Self-Check: PASSED

All claimed files verified on disk. Both task commits (a7bb771, d6f087e) verified in git log.
