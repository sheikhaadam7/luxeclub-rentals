/**
 * Pitch templates for cold outreach.
 * Placeholders: {{editorFirstName}}, {{outletName}}, {{sectionHint}}
 *
 * Sourced from docs/seo/pitches.md and docs/seo/cold-outreach-batch-1.md.
 * Adapted to cold-outreach tone (no insider references).
 */

export type AnchorType = 'branded' | 'url' | 'generic' | 'partial' | 'exact'

export interface PitchTemplate {
  id: string
  name: string
  description: string
  targetUrl: string
  anchorType: AnchorType
  anchorText: string
  subject: string
  body: string
}

export const PITCH_TEMPLATES: PitchTemplate[] = [
  {
    id: 'pitch_6_fleet_breakdown',
    name: 'Fleet cost breakdown (data piece)',
    description: 'Data-driven article offering pricing breakdown across 47 supercars. Best for motoring, wealth, and data journalism outlets.',
    targetUrl: '/catalogue',
    anchorType: 'generic',
    anchorText: 'full fleet and rates',
    subject: 'Data piece: what every supercar in Dubai actually costs for a week (47 cars, priced)',
    body: `Hi {{editorFirstName}},

I run LuxeClub Rentals, one of the larger luxury fleets in Dubai — 47 cars, 13 brands. I've put together a data breakdown of what a week in every supercar actually costs once you factor in deposits, mileage, insurance, and the new reservation-fee model that's become standard in the last 12 months.

The headline findings: the cheapest-to-most-expensive gap is 12:1, the weekly rate is consistently 30% cheaper per day than the daily sticker, and Dubai is roughly half the price of Monaco and 40% cheaper than London for equivalent cars.

The piece is 2,200 words, data tables included, ready to run with editorial adjustment. Happy to send the full draft if it fits {{outletName}}'s {{sectionHint}} section.

Best,
Adam
LuxeClub Rentals`,
  },
  {
    id: 'pitch_1_autumn',
    name: 'Autumn in Dubai (off-season insider angle)',
    description: 'Seasonal travel piece targeting European travel editors. Best for mainstream travel magazines and newspapers.',
    targetUrl: '/car-rental-dubai',
    anchorType: 'generic',
    anchorText: 'a Dubai luxury rental company',
    subject: 'Pitch: Autumn in Dubai — why the off-season is the insider\'s season',
    body: `Hi {{editorFirstName}},

Dubai in September-November is what July in the Mediterranean is for people who actually know how to travel — 28-32°C, empty roads, hotel rates 30-40% below peak, and the long Gulf weekends before the European winter-escape crowds arrive in December.

I'd like to pitch a practical feature for {{outletName}}'s {{sectionHint}} section: the off-season window European travellers should actually be booking. Weather, hotel math, which attractions are better when it's quieter, and the one practical gotcha (car rental rules for tourists) that catches first-time visitors out.

I run a Dubai luxury rental and have five years of seasonal booking data to support the angle. The existing content at luxeclubrentals.com/guides/dubai-driving-rules-for-tourists is public — feel free to reference or quote.

Happy to send a draft or outline. Best timing would be an early September publish to catch the planning cycle.

Best,
Adam
LuxeClub Rentals`,
  },
  {
    id: 'pitch_2_subscription',
    name: 'Subscription rentals (wealth/business angle)',
    description: 'Think-piece on the ownership-to-access shift in luxury motoring. Best for wealth, business, and finance outlets.',
    targetUrl: '/luxury-car-rental-no-deposit-dubai',
    anchorType: 'branded',
    anchorText: 'LuxeClub Rentals',
    subject: 'The quiet rise of luxury subscription rentals in Dubai — pitch',
    body: `Hi {{editorFirstName}},

A shift visible in the fastest-growing luxury fleets in Dubai: high-earners are increasingly choosing weekly or monthly rental of supercars over ownership. The maths — depreciation, insurance, deposit capital, garage space, resale friction — increasingly favours access over ownership.

Dubai has the world's largest luxury rental fleet per capita, which makes it the clearest case study for a piece on the ownership-to-access shift. I can offer pricing data, industry trend points (the move to no-deposit models in the last 12 months), and the maths comparing a new Urus in Europe vs a weekly rental pattern in Dubai.

Would this fit {{outletName}}'s {{sectionHint}} section? I can send a full draft or outline within 24 hours.

Best,
Adam
LuxeClub Rentals`,
  },
  {
    id: 'pitch_3_driving_roads',
    name: 'Nine great driving roads (listicle)',
    description: 'Listicle-format piece about world-class driving roads. Dubai/Jebel Jais is the unique entry. Best for motoring and travel outlets.',
    targetUrl: '/guides/best-driving-roads-dubai-uae',
    anchorType: 'partial',
    anchorText: 'rent a supercar in Dubai',
    subject: 'Pitch: nine of the world\'s great driving roads — and where to rent the car',
    body: `Hi {{editorFirstName}},

Most driving-road listicles cover the same nine roads (Stelvio, Transfagarasan, Pacific Coast Highway). Almost none tell you how to actually get a car on them. I'd like to pitch {{outletName}} on the practical driver's version of this piece, with Jebel Jais (UAE) as the under-covered new entry.

Jebel Jais is genuinely world-class — 22 km of smooth tarmac, 87 switchbacks, no speed cameras between entry and summit, 90 minutes from Dubai Marina. It's the kind of driving road European enthusiasts are starting to plan trips around but hasn't had the coverage it deserves in UK/EU motoring press.

I can provide the Dubai entry (from existing guide content), pricing data for supercar rentals in the region, and a template for the "where to rent" practical notes against other roads on the list. 2,000-2,500 word format works best.

Happy to send a draft.

Best,
Adam
LuxeClub Rentals`,
  },
  {
    id: 'pitch_4_family',
    name: 'Family trip practical guide (half-term)',
    description: 'Practical family travel piece targeting UK half-term bookers. Best for UK family travel editors.',
    targetUrl: '/guides/dubai-driving-rules-for-tourists',
    anchorType: 'url',
    anchorText: 'luxeclubrentals.com/guides/dubai-driving-rules-for-tourists',
    subject: 'Pitch: what UK families need to know before renting a car in Dubai',
    body: `Hi {{editorFirstName}},

October half-term is the single biggest Dubai booking week for UK families. Every autumn, the same half-dozen practical gotchas catch first-time visitors — car seats, tolls, speed cameras, licence rules, minimum rental ages.

I'd like to pitch {{outletName}}'s {{sectionHint}} section on a practical parent's guide: the six things families get wrong on their first Dubai car rental, the money-saving moves (weekly rates, hotel delivery over airport pickup), and the reassurance beat on what's currently different for tourists.

I run a Dubai luxury rental and have the data on where UK first-timers actually trip up. Existing guide at luxeclubrentals.com/guides/dubai-driving-rules-for-tourists is public source material if it helps.

Happy to send a draft. Best publish window is the last week of August / first week of September.

Best,
Adam
LuxeClub Rentals`,
  },
  {
    id: 'pitch_5_expat',
    name: 'Expat guide (Russian/French/German)',
    description: 'Expat-targeted practical guide adapted per language. Best for Russian Emirates, French Morning Dubai, etc.',
    targetUrl: '/luxury-car-rental-no-deposit-dubai',
    anchorType: 'branded',
    anchorText: 'LuxeClub Rentals',
    subject: 'Pitch: the expat\'s guide to renting a car in Dubai',
    body: `Hi {{editorFirstName}},

Every year thousands of Europeans move to Dubai — for tax reasons, climate, or work — and have the same confused first three months about rental economics, residency rules, and navigating the bureaucracy in a language they understand.

I'd like to pitch {{outletName}} on a practical expat guide covering: rental economics for residents (monthly rates are 60-70% cheaper per day than daily), the residency/rental interaction (Emirates ID vs IDP, deposit thresholds), and the cultural practical stuff that makes a difference in the first three months.

I run a Dubai luxury rental and serve the resident market specifically. Happy to write the piece myself (or provide source material if you'd prefer an in-house writer).

Best,
Adam
LuxeClub Rentals`,
  },
]

export function getPitchTemplate(id: string): PitchTemplate | undefined {
  return PITCH_TEMPLATES.find((t) => t.id === id)
}

/** Derives a "section hint" from the editor's position for use in pitches. */
export function deriveSectionHint(position: string | null): string {
  if (!position) return 'lifestyle'
  const p = position.toLowerCase()
  if (/motor|automotive|cars?|auto/.test(p)) return 'Motors'
  if (/travel/.test(p)) return 'Travel'
  if (/lifestyle/.test(p)) return 'Lifestyle'
  if (/features?/.test(p)) return 'Features'
  if (/business|wealth|finance/.test(p)) return 'Business'
  if (/news/.test(p)) return 'News'
  return 'lifestyle'
}

/**
 * Fill template placeholders using editor data.
 */
export function fillTemplate(
  template: PitchTemplate,
  data: {
    editorFirstName: string | null
    outletName: string
    position: string | null
  }
): { subject: string; body: string } {
  const firstName = data.editorFirstName?.trim() || 'there'
  const outletName = data.outletName
  const sectionHint = deriveSectionHint(data.position)

  const replacements: Record<string, string> = {
    '{{editorFirstName}}': firstName,
    '{{outletName}}': outletName,
    '{{sectionHint}}': sectionHint,
  }

  let subject = template.subject
  let body = template.body
  for (const [k, v] of Object.entries(replacements)) {
    subject = subject.split(k).join(v)
    body = body.split(k).join(v)
  }

  return { subject, body }
}
