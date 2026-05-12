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
| Weekly guide cadence — next due **2026-05-19** | ⏳ | 🟡 | M | — (ongoing) |
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
- **Weekly guide cadence** — publish one new guide every 7 days to keep `/guides` fresh. Latest guide is 2026-04-21 (Urus vs Bentayga) — 21-day gap. **Next due: 2026-05-19.** Topic queue maintained ad-hoc; pick from gaps in current 18-guide coverage (insurance, payment methods, specific routes, model comparisons, seasonal Dubai-driving topics).
- **Standardize remaining no-deposit-themed FAQs with bespoke wording** — the canonical 4-paragraph block (memory: `feedback_deposit_canonical_copy.md`) doesn't fit these four because they're specifically about no-deposit, not general deposit info. Need a separate canonical block. Pending FAQs: (1) `car-rental-dubai` → "Can I rent a car in Dubai without a deposit?", (2) `rent-exotic-car-in-dubai` → "Can I get the no-deposit option on an exotic rental?", (3) `rent-luxury-car-in-dubai` → "Can I rent a luxury car with a no-deposit option in Dubai?", (4) `rent-supercar-in-dubai` → "Can I rent a supercar in Dubai with no deposit?".

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
