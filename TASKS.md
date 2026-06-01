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
- **Standardize remaining no-deposit-themed FAQs with bespoke wording** — the canonical 4-paragraph block (memory: `feedback_deposit_canonical_copy.md`) doesn't fit these four because they're specifically about no-deposit, not general deposit info. Need a separate canonical block. Pending FAQs: (1) `car-rental-dubai` → "Can I rent a car in Dubai without a deposit?", (2) `rent-exotic-car-in-dubai` → "Can I get the no-deposit option on an exotic rental?", (3) `rent-luxury-car-in-dubai` → "Can I rent a luxury car with a no-deposit option in Dubai?", (4) `rent-supercar-in-dubai` → "Can I rent a supercar in Dubai with no deposit?".

### Guide topic queue (next 20)

Ordered by SEO value and commercial alignment with the owned fleet (Q3 S Line, RSQ8, Bentayga, A3). Mark ✅ when shipped, ⏳ when in progress. Pull the next ⏳ topic each Monday.

1. ⏳ **Salik tags explained for Dubai tourists** — answers the most common toll-related question, links to traffic-fines + Abu Dhabi road-trip guides.
2. ⏳ **Renting a car in Dubai during Ramadan (2027)** — seasonal, high-intent. Should publish ~6 weeks before Ramadan 2027.
3. ⏳ **Dubai child car seat law for tourists** — addresses gap in family-oriented coverage. Links cleanly to SUV family/honeymoon guide.
4. ⏳ **Renting at DXB airport vs hotel delivery — which is better?** — answers concrete decision question. Links to airport-parking + first-time-rental.
5. ⏳ **Audi RSQ8 vs BMW X5 M Competition: Dubai SUV comparison** — owned-fleet anchor + competitive comparison. RSQ8 wins on value.
6. ⏳ **Bentley Bentayga long weekend in Oman: route, paperwork, fuel** — owned-fleet anchor + adventure content. Honeymoon-extension play.
7. ⏳ **Dubai to Ras Al Khaimah road trip: Jebel Jais and the desert hotels** — fills the RAK gap. Links to scenic-drives + Abu Dhabi guides.
8. ⏳ **Female solo drivers in Dubai: what to actually expect** — answers a real concern, broadens audience.
9. ⏳ **Luxury convertible rentals in Dubai winter: the 5 best months** — Continental GTC, R8 Spyder, F1 Cabriolet. Seasonal SEO.
10. ⏳ **What it costs to live with a luxury car for a month in Dubai** — month-long rental angle for residents/relocators. RSQ8/Bentayga primary anchors.
11. ⏳ **Ferrari Portofino vs Aston Martin DB12: Dubai grand-tourer comparison** — competitive comparison in the GT category.
12. ⏳ **How to spec a luxury rental for a Dubai photoshoot** — niche but high-conversion. Bentayga Black Line + Cullinan + Urus primary.
13. ⏳ **Insurance in luxury rentals: what's covered, what isn't** — addresses anxiety question. Links to deposits + rental-fines guides.
14. ⏳ **Rolls-Royce vs Bentley for a Dubai chauffeur day** — high-intent decision content. Cullinan vs Bentayga + Continental GT.
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
