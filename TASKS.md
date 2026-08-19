# Tasks

## Status

| Task / item | Status | Priority | Effort | Commit |
|---|---|---|---|---|
| Restore memory from `luxeclub-memory.zip` | ✅ | 🟡 | S | — (local `.claude/` only) |
| Create `TASKS.md` scaffold | ✅ | 🔵 | S | — (uncommitted) |
| Audit site for major SEO issues | ✅ | 🔴 | M | — (audit only, no code change) |
| Write SEO punch list into `TASKS.md` | ✅ | 🟡 | S | — (uncommitted) |
| 1. Flesh out `rent-sports-car-in-dubai` + `rent-convertible-in-dubai` | ⏳ | 🔴 | L | — |
| 2. Migrate `<img>` → `next/image` on money pages + brand pills | ⏳ | 🔴 | M | — |
| 3. Add `Vehicle` schema to `catalogue/[slug]` | ⏳ | 🟡 | M | — |
| 4. Per-vehicle meta descriptions from `vehicleContentMap` | ⏳ | 🟡 | S | — |
| 5. `Organization` schema + `sameAs` social links | ⏳ | 🔵 | S | — (needs social URLs) |
| 6. `dateModified` / `datePublished` on money-page JSON-LD | ⏳ | 🔵 | S | — |
| Weekly guide cadence — next due **2026-06-08** | ⏳ | 🟡 | M | — (ongoing; topics in queue below) |
| Standardize 4 no-deposit-themed FAQs with bespoke wording | ✅ | 🟡 | S | — (uncommitted) |
| Sweep "24/7" claims sitewide — replace with plain "WhatsApp Support" / "support" | ⏳ | 🟡 | S | — (user will pick up later) |
| Sweep "case by case" / "case-by-case" sitewide (~30 mentions, mostly pricing) — replace with softer phrasings | ⏳ | 🔵 | S | — (user dislikes phrasing; no-deposit page fixed; rest pending) |
| AggregateRating via Google Places API | ⚠️ | 🟡 | M | — (blocked on API wiring) |
| Fix `import-fleet.py` un-retire logic — don't publish hide-until-photos cars on subsequent sheet saves | ⏳ | 🟡 | S | — |
| Fix `import-fleet.py` — stop wiping `primary_image_url`/`image_urls` on sheet save when cells are blank | ⏳ | 🔴 | S | — |
| **SEO audit 2026-08-19** — full-site Google-ranking evaluation (~70% coverage) | ✅ | 🔴 | M | — (findings below) |
| A1. Build `/rent-car-dubai-airport-dxb` money page (DXB airport, meet-and-greet differentiator) | ✅ | 🔴 | L | ac513c1 (PR #4, live 2026-08-19) |
| A2. Build `/rent-car-by-month-dubai` money page (conversion target for monthly-cost guide) | ⏳ | 🔴 | L | — |
| A3. Build `/rent-chauffeur-service-dubai` money page (conversion target for Rolls-vs-Bentley chauffeur guide) | ⏳ | 🔴 | L | — |
| A4. Repeat `LocalBusiness` schema on individual money pages (currently root-layout only) | ⏳ | 🔴 | M | — |
| A5. Expand root `sameAs` — add Google Business Profile, TripAdvisor + other verified listings (currently IG only) | ⏳ | 🟡 | S | — |
| A6. Rewrite money-page meta descriptions to include Dubai neighborhoods (Marina, Downtown, DIFC, Palm) | ⏳ | 🟡 | M | — |
| A7. Add `makesOffer` to root `LocalBusiness` schema | ⏳ | 🔵 | S | — |
| A8. Add `BreadcrumbList` to `/faq` page | ⏳ | 🔵 | S | — |
| A9. Pass `articleBody` (not excerpt) in guides' `Article` schema | ⏳ | 🔵 | S | — |
| A10. New money page: **Wedding Car Rental Dubai** (seasonal peak, high-AOV) | ⏳ | 🟡 | L | — |
| A11. New money page: **Business Bay Car Rental** (hyperlocal — we're in Binary Tower) | ⏳ | 🟡 | L | — |
| A12. New money page: **Car Rental for Photoshoot / Film** (high-AOV, low-comp) | ⏳ | 🟡 | L | — |

**Status key:** ✅ done & verified · 🟢 done not tested · ⏳ not started · 🔧 in progress · ⚠️ blocked · 💤 deprioritized
**Priority key:** 🔴 critical · 🟡 important · 🔵 nice-to-have
**Effort key:** S <15 min · M 15–60 min · L >1 hr

## Task detail

### Active

- **1. Flesh out two thin money pages** — `rent-sports-car-in-dubai` and `rent-convertible-in-dubai` are 1-paragraph stubs with no `sections`, no FAQs, no in-prose internal links. Both are sitemap-indexed and reachable via the "Browse by Type" nav on every other money page. Bring each up to the Lamborghini-page template: 5–6 H2 sections, 4–5 FAQ items, ≥3 in-prose internal links to brand pages and guides.
- **2. Migrate raw `<img>` → `next/image`** on money-page section images (`app/(public)/[slug]/page.tsx` line ~470) and brand logo pills (line ~344). Sets explicit width/height + lazy + AVIF/WebP delivery. Core Web Vitals win across all 22 money pages.
- **3. Add `Vehicle` schema** to `app/(public)/catalogue/[slug]/page.tsx` (alongside `Product`). Map engine, fuel, transmission, drivetrain, seats from `vehicle.specs`. Unlocks Google car rich results.
- **4. Per-vehicle meta descriptions from `vehicleContentMap`** — current `generateMetadata` falls back to one generic template for ~40 vehicles. Use `vehicleContentMap[slug].metaDescription` when present; only fall back if missing.
- **5. Add `Organization` schema + `sameAs` social links** to root layout. Entity signal for E-E-A-T. Needs Instagram/TikTok/YouTube/X profile URLs from user.
- **6. Add `dateModified` / `datePublished` to money-page JSON-LD** — guides got this in commit 4da091e; money pages didn't. Needs `updatedDate` field added to `MoneyPage` interface.
- **Weekly guide cadence** — publish 1–2 new guides every 7 days to keep `/guides` fresh and build topical authority for AI/search retrieval. Latest batch is 2026-06-01 (IDP, Abu Dhabi road trip, SUV family/honeymoon). **Next due: 2026-06-08.** Pick the next topic from the queue below; mark it ✅ when shipped. Quarterly refresh of the 6 oldest guides also belongs to this cadence — next quarterly refresh due 2026-09-01.
- **Fix `import-fleet.py` — preserve image columns on sheet save** — the spreadsheet has no first-class workflow for editing `primary_image_url` or `image_urls`; those columns are filled by `upload-fleet-images.py`. But when the user adds a row, runs the upload, then saves the sheet again later, the import sees the blank URL cells, computes a delta against the DB, and **PATCHes the URLs back to null** — wiping the image references. Hit on 2026-06-21 with the Audi A3: 8 photos uploaded successfully to Supabase Storage, then a subsequent sheet save blanked the DB columns. Storage objects survived (recoverable via re-PATCH), but the public catalogue showed the car as image-less. **Fix:** in the diff/PATCH builder, never include `primary_image_url` or `image_urls` in the delta when the sheet cell is blank but the DB has a value — treat blank cells as "no change to this column" rather than "clear this column". Or alternatively, re-export the sheet immediately after every successful `upload-fleet-images.py --apply` so the cells reflect the DB. The first option is cleaner. Pairs with the un-retire fix below — both are about the import treating "blank cell = explicit clear" too aggressively.
- **Fix `import-fleet.py` un-retire logic for hide-until-photos rows** — when a new car is inserted with no primary image, the script correctly sets `is_active=false` (hide-until-photos). But on the *next* save of `data/fleet.xlsx`, the watcher fires the import; the script sees the row's `retire?` cell is blank and **un-retires** it (per the plan's "clear retire? = un-retire" rule), pushing the photo-less car onto the live site. Hit this on 2026-06-21 while adding the Mercedes GLE 63 S. **Fix:** in the un-retire branch (search `unretires.append`), only un-retire when `current.primary_image_url` is non-empty. Hide-until-photos rows then stay hidden across sheet saves until `upload-fleet-images.py` runs (which auto-flips `is_active=true` once a real photo lands). Workaround in use until fixed: mark `retire? = X` on photo-less rows, then clear the X after the photo upload finishes.
- **Standardize remaining no-deposit-themed FAQs with bespoke wording** — the canonical 4-paragraph block (memory: `feedback_deposit_canonical_copy.md`) doesn't fit these four because they're specifically about no-deposit, not general deposit info. Need a separate canonical block. Pending FAQs: (1) `car-rental-dubai` → "Can I rent a car in Dubai without a deposit?", (2) `rent-exotic-car-in-dubai` → "Can I get the no-deposit option on an exotic rental?", (3) `rent-luxury-car-in-dubai` → "Can I rent a luxury car with a no-deposit option in Dubai?", (4) `rent-supercar-in-dubai` → "Can I rent a supercar in Dubai with no deposit?".

### SEO audit 2026-08-19 — findings & punch list

Full-site Google-ranking evaluation done 2026-08-19. Verdict: **~70% of what Google looks for is already there.** Delegated research agent + compiled findings in-session; reconstructed from transcript `ae650095…` after unrelated crash. Nothing shipped from this audit yet.

**Baseline confirmed (already working):**
- `robots.txt` + `sitemap.ts` correctly weighted (home 1.0, catalogue 0.9, money 0.8, guides 0.7)
- `LocalBusiness` schema on root layout w/ full NAP, geo (25.1865, 55.2675), hours
- 23 money pages live (14 brand, 7 type, 2 use-case)
- Guides carry `Article` schema + LuxeClub Editorial byline + `datePublished`/`dateModified` + `BreadcrumbList`
- Catalogue cars carry `Product` schema w/ price + availability
- Absolute canonicals; NAP consistent sitewide

**Critical gaps (A1–A5):**
- **A1. `/rent-car-dubai-airport-dxb`** — highest-volume tourist query, no page. Plan already drafted at `C:\Users\lenovo\.claude\plans\ok-lets-start-with-iridescent-sky.md` (10.5 KB). Slug locked. Confirmed meet-and-greet at arrivals is real (driver at exit with name board) → page differentiator. Must include a link to Bentley Bentayga. 7 FAQ answers already approved. **Apply new money-page house rule** (see below).
- **A2. `/rent-car-by-month-dubai`** — need this as the conversion target for the monthly-cost guide shipped 2026-08-18 (`d15a4b0`). Guide currently has nowhere strong to funnel to.
- **A3. `/rent-chauffeur-service-dubai`** — conversion target for the Rolls-vs-Bentley chauffeur guide shipped 2026-08-19 (`8c51d99`). Same issue as A2.
- **A4. Repeat `LocalBusiness` on money pages** — currently only on root layout. Local-pack claims need per-page schema.
- **A5. Expand `sameAs`** — currently just Instagram. Add Google Business Profile URL + TripAdvisor + any other verified listings. 5-minute fix if URLs are known.

**Should-fix (A6–A9):**
- **A6.** Money-page meta descriptions ignore Dubai neighborhoods (Marina, Downtown, DIFC, Palm). Rewrites = CTR uplift.
- **A7.** Add `makesOffer` to root `LocalBusiness` schema.
- **A8.** `/faq` page missing `BreadcrumbList`.
- **A9.** Guides' `Article` schema currently passes the excerpt, not the full `articleBody`.

**Content gaps beyond money pages (A10–A12):**
- **A10.** No **Wedding Car Rental Dubai** page — seasonal peak, high-AOV.
- **A11.** No **Business Bay Car Rental** hyperlocal page — we're literally in Binary Tower on Marasi Drive.
- **A12.** No **Car Rental for Photoshoot / Film** page — high-AOV, low-comp niche.

**Nice-to-have (not queued):** `VideoObject` for hero video, `hreflang` (i18n locales exist but unlinked), `SpecialAnnouncement` for no-deposit promo, `HowTo` on step-by-step money-page sections.

**Recommended build order:** A1 → A2 → A3 → A5 → A4 → A6 → then A10-A12.

### Money-page house rules (added 2026-08-19)

Applies to every NEW money page and to future refreshes of the 23 existing ones:
1. **Funnel flow to reduce bounce** — page must actively route the reader toward a conversion (book / WhatsApp / catalogue) rather than dead-end at footer. Section order should build intent.
2. **Break up the page with relevant imagery** — no walls of text. Photos must be topical (e.g. DXB airport page = terminal / meet-and-greet / car handover, not stock luxury hero).
3. **Keep prose readable** — short paragraphs, clear H2s, scannable.

These are additive to existing rules (internal links ≥3, mobile-first, no ownership disclosure, no "unlimited mileage upgrade", canonical deposit copy, etc.).

### Guide topic queue (next 20)

Ordered by SEO value and commercial alignment with the owned fleet (Q3 S Line, RSQ8, Bentayga, A3). Mark ✅ when shipped, ⏳ when in progress. Pull the next ⏳ topic each Monday.

1. ✅ **Salik tags explained for Dubai tourists** — shipped 2026-06-16 (backdated 2026-06-08). Slug: `salik-tags-explained-dubai-tourists`.
2. ⏳ **Renting a car in Dubai during Ramadan (2027)** — seasonal, high-intent. Should publish ~6 weeks before Ramadan 2027.
3. ✅ **Dubai child car seat law for tourists** — shipped 2026-06-16 (backdated 2026-06-15). Slug: `dubai-child-car-seat-law-tourists`.
4. ✅ **Renting at DXB airport vs hotel delivery — which is better?** — shipped 2026-06-16 (backdated 2026-06-22). Slug: `renting-dxb-airport-vs-hotel-delivery`.
5. ✅ **Audi RSQ8 vs BMW X5 M Competition: Dubai SUV comparison** — shipped 2026-06-24. Slug: `audi-rsq8-vs-bmw-x5-m-competition-dubai`. Bundled with sitewide copy sweep applying 3 new framing rules (no ownership disclosure, AED 495 not a "fee", no-deposit leads deposit narrative).
5b. ✅ **Budget vs Premium Car Rental in Dubai: The Honest Comfort and Safety Case** — shipped 2026-08-18 (backdated 2026-07-01). Slug: `budget-vs-premium-car-rental-dubai`. Off-queue backfill — first of ~5 backdated slots planned to close the 2026-06-24 → 2026-08-18 cadence gap. Category: planning. ZeroGPT: 12.5%.
6. ❌ **VETOED — Bentley Bentayga long weekend in Oman: route, paperwork, fuel** — vetoed 2026-08-18. Cars must stay in the UAE for tracking / theft-risk reasons. See `project_no_cross_border_content.md` in memory. Do not draft any cross-border content.
7. ✅ **Dubai to Ras Al Khaimah road trip: Jebel Jais and the desert hotels** — shipped 2026-08-18 (backdated 2026-07-08). Slug: `dubai-to-ras-al-khaimah-jebel-jais-road-trip`. Backfill slot 2 of ~5. Category: driving. ZeroGPT: 14.9%.
8. ⏳ **Female solo drivers in Dubai: what to actually expect** — answers a real concern, broadens audience.
9. ⏳ **Luxury convertible rentals in Dubai winter: the 5 best months** — Continental GTC, R8 Spyder, F1 Cabriolet. Seasonal SEO.
10. ✅ **What a month with a luxury car in Dubai actually costs** — shipped 2026-08-18 (backdated 2026-07-15). Slug: `cost-of-monthly-luxury-car-rental-dubai`. Backfill slot 3 of ~5. Category: planning. ZeroGPT: 7.6% (cleanest of the batch).
11. ⏳ **Ferrari Portofino vs Aston Martin DB12: Dubai grand-tourer comparison** — competitive comparison in the GT category.
12. ⏳ **How to spec a luxury rental for a Dubai photoshoot** — niche but high-conversion. Bentayga Black Line + Cullinan + Urus primary.
13. ⏳ **Insurance in luxury rentals: what's covered, what isn't** — addresses anxiety question. Links to deposits + rental-fines guides.
14. ✅ **Rolls-Royce vs Bentley for a Dubai chauffeur day** — shipped 2026-08-19 (backdated 2026-07-22). Slug: `rolls-royce-vs-bentley-dubai-chauffeur-day`. Backfill slot 4 of ~5. Category: cars. ZeroGPT: 13.4%. Continental GT left out (no dedicated catalogue slug); Cullinan Mansory vs Bentayga head-to-head.
15. ⏳ **Best valet experiences in Dubai by car category** — practical and shareable. Links to mall guide + SUV guide.
16. ⏳ **Renting in Dubai with a Schengen-only driving licence** — covers EU-resident edge case not addressed by IDP guide.
17. ⏳ **Renting between Dubai and Sharjah: what changes** — addresses cross-emirate confusion. Links to Salik + driving rules.
18. ⏳ **How LuxeClub handovers actually work (with photos)** — trust-building, owned content. Links to deposits + first-time guides.
19. ⏳ **The honest cost of a 7-day Dubai luxury rental: full breakdown** — transparency content. Salik + fuel + valet + dinners.
20. ⏳ **Audi Q3 S Line vs Porsche Macan: which entry luxury SUV in Dubai?** — owned-fleet anchor (Q3) + competitive comparison.

### Blocked / Parked

- **AggregateRating in LocalBusiness schema** — code comment at `app/layout.tsx:126` says "intentionally omitted until verifiable via Google Reviews API". Blocked on: wiring up Google Places API to pull live rating. Rating stays at 4.9 per existing decision. Worth ~17% SERP CTR uplift when shipped.

### Done

- Restore memory from `luxeclub-memory.zip` (2026-05-12)
- Create `TASKS.md` scaffold (2026-05-12)
- Audit site for major SEO issues (2026-05-12)
- Write SEO punch list into `TASKS.md` (2026-05-12)
- Strip all "unlimited-mileage upgrade" mentions from site copy (2026-05-12) — 46 replacements across `lib/money-pages.ts` + `lib/vehicle-content.ts`. Memory saved: `feedback_no_mileage_upgrade.md`.
- Standardize 13 brand-page deposit FAQs with canonical 4-paragraph block (2026-05-12) — Lamborghini, Ferrari, Rolls-Royce, Bentley, Porsche, Mercedes/G63, Range Rover, McLaren, Aston Martin, BMW, Audi, Maserati, Escalade. Per-car deposit amounts dropped in favor of flat AED 2,500 pre-auth hold. Memory saved: `feedback_deposit_canonical_copy.md`.
- Update `/faq` page "What is the security deposit?" with bespoke wording (2026-05-12) — surfaces under-23 AED 5,000 rule and 5-year-licence no-deposit eligibility. Brand pages kept soft on purpose. Memory updated: `feedback_deposit_canonical_copy.md`.
- Strip "AED 200 no-deposit surcharge" from 14 "What's Included" sections (2026-05-12) — 12 brand pages + car-rental-dubai + SUV. Kept AED 1,000-3,000 range intact per user (intentional flexibility for cars priced at 3,000). Excluded: Group B FAQ + `/luxury-car-rental-no-deposit-dubai`.
- Standardize 4 no-deposit-themed FAQs (2026-05-12) — car-rental-dubai, exotic, luxury, supercar pages. Each now mentions "AED 200 surcharge (T&C APPLY)" consistently. Supercar halo-car distinction preserved (Revuelto/SF90/765LT/GT3 RS still "quoted per booking").
