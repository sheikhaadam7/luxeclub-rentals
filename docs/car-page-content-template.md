# LuxeClub car page content template

The reference doc for writing any per-car catalogue page on luxeclubrentals.com. Grounded in Google's own best practices, AI-search (LLM-citation) principles, and LuxeClub brand rules. If a page follows this template properly, it deserves to rank for the head query "rent [model] in Dubai" and to get cited by ChatGPT / Perplexity / Google AI Overviews when someone asks about that car.

---

## The 5 blocks every car page needs

### Block 1 — Opening paragraph (~150 words)

**Purpose:** the LLM-citation chunk. When an AI answer engine scrapes this page to answer a query, this is what it lifts. Also the first thing a human sees below the price.

**Must contain, roughly in order:**
- Full model name (no abbreviations first mention)
- 3 quantified spec anchors — pick the ones that matter for the car (bhp / 0-100 / top speed for a sports car; seats / boot / engine for a family SUV)
- Price ("from AED X/day")
- The word "Dubai"
- Delivery signal (delivered within Dubai)
- One distinguishing sentence — why this trim / colour / spec, not the base model

**Shape:** "The [Model] is [category] built around [spec 1], [spec 2], and [spec 3]. Priced from AED [X]/day, it's the [Y] we recommend when [use case]. Available for rent in Dubai with delivery to your address."

Do NOT open with a rhetorical hook, a question, or a "picture this" imagined scene. LLMs lift the first factual claim they find; make sure it's your factual claim.

### Block 2 — The car itself (~250 words)

**Purpose:** genuine information for the reader who cares about the car. Written by someone who's driven it, not by someone who read the spec sheet.

**Include:**
- Trim-specific detail — what makes THIS spec different from the base model
- Driving character in plain language (not marketing language — say "the steering weight builds progressively" not "the steering delivers a symphony of feedback")
- Notable features actually worth mentioning (air suspension, drive modes, tech that matters)
- What real customers use it for, if you know

**Tone:** confident, warm, first-person plural ("we," "our fleet"). Avoid AI tells — no "quietly delivers," no em-dash addiction, no "not X. not Y. just Z." patterns. See `docs/ai-tropes-to-avoid.md`.

### Block 3 — Renting it in Dubai (~200 words)

**Purpose:** local SEO relevance. Answers "who rents this in Dubai, and for what." This block is the reason Google will rank you above a generic global page.

**Include:**
- Named Dubai locations (Marina, Downtown, DIFC, Palm, Business Bay, JBR, Dubai Hills, Atlantis, Address, FIVE, DXB airport). Aim for 3-5 named places per page.
- Typical Dubai use cases (weekend break, corporate event, chauffeur-style day, family visit, wedding, photoshoot)
- Practical rental notes: deposit tier, minimum age, booking lead time
- Delivery detail: **AED 110 within Dubai** — not free

### Block 4 — How it compares in our fleet (~100 words)

**Purpose:** internal linking + captures "X vs Y" long-tail searches. Also gives the customer a shortcut when they're undecided.

**Include:**
- 1-2 nearest fleet alternatives, named
- One-line contrast per alternative (RSQ8 vs Urus: "the RSQ8 is quieter and more restrained, the Urus more theatrical")
- If a comparison guide exists in `lib/guides.ts`, link to it

### Block 5 — FAQ (5-7 items with real answers)

**Purpose:** feeds FAQPage JSON-LD (already wired). Answers the specific questions customers actually ask, phrased the way they'd type them into WhatsApp or ChatGPT.

**Required question shapes** (adapt exact wording per car):
1. **Price** — "How much does it cost to rent [X] in Dubai?" (day / week / month)
2. **Minimum age + docs** — "What's the minimum age to rent [X]?"
3. **Route or location** — "Can I take [X] to [Jebel Jais / Hatta / Abu Dhabi]?"
4. **Comparison** — "How does [X] compare to [Y]?"
5. **Booking lead time or use-case fit** — "How far in advance should I book?" OR "Is [X] good for [family / a first date / an event]?"

**Answer format:** 2-3 sentences. Factual. No filler.

---

## Why this satisfies Google

- **Helpful Content system.** Hand-written content that answers real customer questions, based on actual operator knowledge of the car and the city. Not thin, not scraped, not templated.
- **E-E-A-T** (Experience, Expertise, Authoritativeness, Trust). LuxeClub Editorial byline in FAQPage JSON-LD, dateModified on Vehicle JSON-LD, real Dubai context only an operator on the ground would know.
- **Product page best practices.** Full Vehicle JSON-LD, FAQPage schema, Offer with price, canonical URL, per-car OG image — already wired in `app/(public)/catalogue/[slug]/page.tsx`.

## Why this satisfies AI search (GEO)

- **First-sentence citation chunk.** Opening is structured so LLMs can lift it wholesale to answer "how much is X in Dubai" queries with attribution.
- **Entity clarity up front.** Model, price, location within the first two sentences.
- **Q&A structure.** FAQ block mirrors how customers phrase queries to LLMs, and the FAQPage JSON-LD tells LLMs "these are the canonical answers."
- **Freshness signals.** `datePublished` + `dateModified` on Vehicle JSON-LD.
- **Author attribution.** `author: LuxeClub Editorial` on FAQPage JSON-LD — signals editorial responsibility.

---

## Hard brand rules (must not appear anywhere)

- ❌ "24/7 support," "24 hour," "round the clock" — team is not actually 24/7
- ❌ Tabby / Tamara / Postpay / any BNPL messaging — product not integrated
- ❌ "Showroom," "come see the car," "visit us" — delivery only, no physical location
- ❌ "Free delivery" — delivery is AED 110 within Dubai (kept as negotiation lever, never advertised as free)
- ❌ "Case by case" — too bureaucratic; use warmer phrasings
- ❌ "Drive hard," "attack the corner," "flat out" — cars are for enjoyment, not track use
- ❌ Cross-border mention (Oman, Saudi) — cars must stay in UAE for insurance/tracking
- ❌ "Unlimited mileage upgrade" — product doesn't exist; overage is billed per km
- ❌ Rating rounded to 5.0 — stays at 4.9
- ❌ Owned vs B2B distinction — internal only, never disclosed to customers

## AI tropes — must avoid

See `docs/ai-tropes-to-avoid.md` (the full list). The ones especially damaging for car content:

- "Quietly delivers" / "quietly redefines" — banned adverb family
- Em-dash addiction (a human writer uses 2-3 per piece; AI uses 20+)
- "Not X. Not Y. Just Z." — dramatic countdown pattern
- "Think of it as..." — patronising analogy
- "It's not just X, it's Y" — negative parallelism
- Bold-first bullets (every list item starting with **Word:**)
- "The [X]? [A single-word answer]." — self-posed rhetorical questions
- "Whether you're X or Y" (superficial false-range framing)
- "It's worth noting that..." — filler transitions
- "Delve," "leverage," "robust," "tapestry," "landscape," "ecosystem" as buzzwords

---

## Tone

Warm editorial. Confident but not arrogant. Written by someone who's driven the car. First-person plural ("we," "our fleet") when appropriate. British English (colour, kilometre, favour).

**Good openings:**
- "The RSQ8 is our first choice for customers who want SUV space without the theatrics of a G63."
- "Book a week ahead and airport delivery is usually straightforward."
- "The Urus is the fleet's go-to for anyone who wants a Lamborghini they can actually put four adults in."

**Bad openings:**
- "The RSQ8 delivers a rich tapestry of performance and luxury." *(tapestry, "delivers")*
- "Picture yourself gliding through Dubai in the ultimate luxury SUV." *(imagined-scene opener, unfactual)*
- "It's not just a car. It's a statement." *(negative parallelism, empty)*

---

## Pricing language — how to talk about money

Prices change with season, demand, duration, and negotiation. Any specific number baked into the copy becomes stale the moment we adjust rates, and creates a commitment a customer can quote back at us. The rules below give us the SEO/GEO benefit of a citable price anchor without hard-coding rates throughout the page.

**One anchor only — the opener.** Block 1 uses ONE "from AED X/day" reference. The word "from" is load-bearing: it signals "starting price," which is factually accurate whether we're at the floor or above it. This is the LLM-citation chunk; a specific number matters here because AI answer engines lift it when someone asks "how much is X in Dubai." When the site's daily rate shifts meaningfully, update this one line — not the whole page.

**Blocks 2, 3, 4 — no rental prices in prose.** Talk about the car, the Dubai context, and comparisons using relative positioning language, not numbers. Good phrases: "substantially less than the Urus," "in the same daily band as the Bentayga," "meaningfully lower price tier," "the fleet's value pick for [X]." Bad phrases: "at AED 899/day," "half the price of the Urus."

**FAQ price question — pivot to the live price card + WhatsApp.** Never spell out weekly or monthly rates in the FAQ. They change too often to keep in sync. Standard shape: "The daily rate is shown at the top of this page. For weekly and monthly quotes, WhatsApp us on +971 58 808 6137 — we tailor pricing to your dates and duration."

**FAQ comparison question — positioning, not numbers.** Instead of "RSQ8 at AED 899 vs Urus at AED 2,419," write "the RSQ8 sits in a meaningfully lower price tier — you'd pay considerably less for most of the same on-road performance."

**What IS OK to state as fixed** (these values are stable, structural, or operational — not rental prices):
- **Delivery fee: AED 110 within Dubai**
- **Deposit tiers: AED 2,500 / 4,500 / 5,000**
- **Mileage included: 250 km per day**
- **Minimum age tiers: 21 / 24 / 27** (base / mid / supercars)

**What is NOT OK to state as fixed anywhere except the opener anchor:**
- Daily rate (once, in the opener, with "from")
- Weekly rate
- Monthly rate
- Overage per km

## Length target

- **Blocks 1-4:** ~700 words of hand-crafted prose. Not stuffed. If a block reads padded, cut it.
- **Block 5 (FAQ):** 5-7 questions, 2-3 sentences per answer.
- **Total per page:** ~800-900 words including FAQ answers. This exceeds what most competitors produce as *genuine* content, without matching their padding.

Word count is not the goal; genuine usefulness per sentence is. Cut ruthlessly.

---

## Typography — handled by the render layer, don't worry about it

Font size, line height, and colour on the car detail page are already set to the site's Sixt-inspired house style (`text-base sm:text-lg text-white/80 leading-[1.7]` — 16px mobile / 18px desktop, 1.7 line-height, high contrast). The `<p>` tags that render your description and FAQ answers already carry this class. **Content authors write plain text — the page handles typography.**

Don't try to force font sizes with inline styles or HTML in the copy — it will either be ignored by the render pipeline or clash with the house style.

Reference: `feedback_prose_house_style` in memory.

## Where the content lives

**Not in Supabase.** `data/fleet.xlsx` is the source of truth for the Supabase `vehicles.description` field (per `scripts/scraper/scrape-vehicles.ts:1-13`), and a spreadsheet resync would obliterate anything written directly to Supabase.

**In `lib/vehicle-content.ts`** — the `vehicleContentMap` object. Each car is a key mapping to `{ metaTitle, description, faqs, updatedAt?, author? }`.

The `description` field renders below the specs on the catalogue page, under the heading "About renting the [Model] in Dubai." Split blocks 1-4 with double newlines (`\n\n`) — the render layer already handles paragraph breaks.

Rendering already handled by `app/(public)/catalogue/[slug]/page.tsx`. No render changes needed for content — only the JSON-LD additions listed separately.

---

## Working example

See the `audi-rsq8` entry in `lib/vehicle-content.ts` for the gold-standard implementation. Use it as the template for every subsequent car.
