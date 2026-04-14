/**
 * Editor relevance scoring.
 *
 * Two independent scores (0-100 each):
 *  - Profile score: Hunter data only (title, department, seniority, outlet tier)
 *  - Topical score: article history (null until Serper runs)
 *
 * Combined score: weighted average (60/40 profile/topical). Falls back to profile
 * only if topical is null. This is what the editor list sorts by.
 */

export interface EditorProfileInput {
  position: string | null
  seniority: 'executive' | 'senior' | 'junior' | null
  department: string | null
  confidence: number | null
  /**
   * Numeric outlet priority (0-100) from outreach_domains.priority_score.
   * Replaces the old P1/P2/P3 tier. Contributes priority_score / 10 to the
   * profile score (so a score of 80 is worth ~8 points, matching the old +10 P1).
   */
  outletPriorityScore: number
  /**
   * Optional secondary text about the editor (LinkedIn headline, scraped bio,
   * AI-generated summary). Used to detect title + topical keywords when
   * Hunter's position field is null, stale, or underspecified. For each
   * signal we take the max of (Hunter-position match, enrichment match) so
   * we neither double-count nor under-credit an editor whose Hunter record
   * is thin.
   */
  enrichmentText?: string | null
}

export interface ArticleScoreInput {
  title: string
  snippet?: string | null
}

// ---------------------------------------------------------------------------
// Profile score — 0-100
// ---------------------------------------------------------------------------

const HARD_ZERO_DEPARTMENTS = new Set([
  'sales', 'hr', 'finance', 'legal', 'support', 'it',
])

const HARD_ZERO_POSITION_KEYWORDS = [
  'sales', 'business dev', 'account exec', 'account manager', 'hr ',
  'human resources', 'recruiter', 'talent acquisition',
  'engineer', 'developer', 'designer', 'analyst', 'consultant',
  'ceo', 'cfo', 'coo', 'cto', 'founder', 'vp ', 'vice president',
]

// Editorial-signal keywords — at least one must match somewhere
// (position OR department) for the editor to score above zero.
const EDITORIAL_KEYWORDS = [
  'editor', 'journalist', 'writer', 'reporter', 'correspondent',
  'contributor', 'columnist', 'producer', 'publisher', 'content',
  'features', 'newsroom', 'editorial',
]

function hasEditorialSignal(
  position: string | null,
  department: string | null,
  enrichment?: string | null
): boolean {
  const blob = `${position ?? ''} ${department ?? ''} ${enrichment ?? ''}`.toLowerCase()
  if (!blob.trim()) return false
  // Treat Hunter's "communication" department as editorial-adjacent
  if (department && department.toLowerCase() === 'communication') return true
  return EDITORIAL_KEYWORDS.some((kw) => blob.includes(kw))
}

/**
 * Enrichment text can contain off-topic mentions (e.g. "former sales rep turned
 * editor"). We only want to treat enrichment as a hard-zero source if it's
 * overwhelmingly non-editorial AND Hunter also shows no editorial signal.
 * For now we do NOT apply HARD_ZERO_POSITION_KEYWORDS to enrichment text,
 * because a bio that mentions "sales" in passing shouldn't kill a clear editor.
 */

function titlePoints(position: string | null): number {
  if (!position) return 0
  const p = position.toLowerCase()

  // Hard-skip roles (not editorial)
  for (const kw of HARD_ZERO_POSITION_KEYWORDS) {
    if (p.includes(kw)) return 0
  }

  // Top-tier editorial titles
  if (/(editor[- ]in[- ]chief|editorial director|managing editor)/i.test(position)) return 40
  if (/(motors?|travel|lifestyle|features?|automotive|cars?)\s+editor/i.test(position)) return 40

  // Strong editorial titles
  if (/(digital|online|senior|deputy|executive)\s+editor/i.test(position)) return 35

  // Generic editor
  if (/editor/i.test(position)) return 30

  // Journalists / writers
  if (/(journalist|writer|reporter|correspondent)/i.test(position)) return 25

  // Lighter editorial roles
  if (/(contributor|columnist|freelance)/i.test(position)) return 20
  if (/(producer|content manager|publisher)/i.test(position)) return 15

  return 5
}

function departmentPoints(department: string | null, position: string | null): number {
  if (!department) return 0
  const d = department.toLowerCase()
  if (d === 'communication') return 15
  if (d === 'management' && position && /editor/i.test(position)) return 10
  if (d === 'marketing') return 5
  return 0
}

function keywordBoostPoints(position: string | null): number {
  if (!position) return 0
  const p = position.toLowerCase()
  const topical = ['travel', 'motor', 'automotive', 'luxury', 'lifestyle', 'features', 'cars', 'auto']
  for (const kw of topical) {
    if (p.includes(kw)) return 15
  }
  if (/(digital|online|web)/.test(p)) return 8
  if (p.includes('news')) return 5
  return 0
}

function seniorityPoints(s: 'executive' | 'senior' | 'junior' | null): number {
  switch (s) {
    case 'executive': return 10
    case 'senior': return 8
    case 'junior': return 4
    default: return 3
  }
}

function confidencePoints(c: number | null): number {
  if (c == null) return 0
  return Math.min(10, Math.round(c / 10))
}

function priorityScorePoints(score: number): number {
  // priority_score is 0-100; contribute up to ~10 points to profile score.
  if (!Number.isFinite(score)) return 3
  return Math.round(Math.max(0, Math.min(100, score)) / 10)
}

export function scoreEditorProfile(input: EditorProfileInput): number {
  // Hard-zero on off-topic department
  if (input.department && HARD_ZERO_DEPARTMENTS.has(input.department.toLowerCase())) return 0

  const enrichment = input.enrichmentText?.trim() || null

  // Require at least one editorial signal (from Hunter OR enrichment text).
  if (!hasEditorialSignal(input.position, input.department, enrichment)) return 0

  const hunterTitle = titlePoints(input.position)
  // If Hunter's position explicitly looks like a sales/hr/exec role, that's a
  // stronger signal than whatever the bio says — keep the hard-zero.
  if (input.position && hunterTitle === 0) return 0

  // Enrichment title match: only look if Hunter's title signal is weak.
  // `titlePoints` returns the max bucket; we scan enrichment with the same
  // regex tiers and take the max of the two values.
  const enrichTitle = enrichment ? titlePoints(enrichment) : 0
  const title = Math.max(hunterTitle, enrichTitle)

  // Same "max" rule for the topical keyword boost.
  const hunterKw = keywordBoostPoints(input.position)
  const enrichKw = enrichment ? keywordBoostPoints(enrichment) : 0
  const kw = Math.max(hunterKw, enrichKw)

  const dept = departmentPoints(input.department, input.position)
  const sen = seniorityPoints(input.seniority)
  const conf = confidencePoints(input.confidence)
  const priority = priorityScorePoints(input.outletPriorityScore)

  return Math.min(100, title + dept + kw + sen + conf + priority)
}

// ---------------------------------------------------------------------------
// Article topical score — 0-100 per article; editor score = avg of top 5
// ---------------------------------------------------------------------------

// Keyword tiers for article titles/snippets.
//
// Philosophy: we're running ORGANIC editorial outreach, not chasing paid
// placements. A luxury-travel writer mentioning a Lamborghini in a Dubai
// guide is the ideal hit — that's natural editorial value. A rental-listicle
// writer covering "best car rental services" reads transactional and is
// deliberately under-weighted.
//
// Tier A is GEOGRAPHIC context — it never scores on its own (a Dubai
// property piece is not automotive coverage) but it multiplies the topical
// base. Articles with zero topical signal but a geo match still get a small
// floor score, since the editor is at least in the right market.
const TIER_A = { keywords: ['dubai', 'uae', 'abu dhabi', 'emirates'], multiplier: 1.5 }

// Tier S — the strongest signal. Supercar/luxury-car brand names and the
// luxury-travel editorial vocabulary we most want to be embedded in.
const TIER_S = {
  max: 80, per: 40,
  keywords: [
    // Marques — organic brand mentions are exactly our target
    'lamborghini', 'ferrari', 'rolls-royce', 'rolls royce', 'bentley',
    'porsche', 'mclaren', 'aston martin', 'bugatti', 'maserati', 'koenigsegg',
    // Category terms
    'supercar', 'supercars', 'hypercar', 'exotic car', 'luxury car',
    // High-value travel / luxury-lifestyle editorial angles
    'luxury travel', 'luxury lifestyle', 'luxury experience',
    'dubai guide', 'dubai travel', 'dubai itinerary',
    'things to do in dubai', 'visit dubai',
  ],
}

// Tier B — broader automotive / driving editorial, plus rental signals.
// "rental" and "hire" are kept here but at the standard weight so a rental
// article edges out a non-rental car piece by a modest margin rather than
// dominating the ranking (per backlink strategy: editorial mentions matter
// more than comparison-shopping listicles, but rental coverage still signals
// intent).
const TIER_B = {
  max: 30, per: 15,
  keywords: [
    'sports car', 'automotive', 'motor', 'motoring',
    'drive', 'driving', 'road trip', 'grand tourer',
    'convertible', 'roadster', 'test drive',
    'rental', 'hire',
  ],
}

// Tier C — luxury / travel / lifestyle editorial (higher cap than before
// so lifestyle writers covering Dubai hotels, resorts, and travel rank
// meaningfully even without a brand or supercar mention).
const TIER_C = {
  max: 40, per: 15,
  keywords: [
    'luxury', 'lifestyle', 'travel', 'hotel', 'resort',
    'destination', 'experience', 'weekend getaway', 'staycation',
    'concierge', 'vip', 'yacht', 'private jet',
    'tourism', 'vacation', 'holiday',
  ],
}

// Tier D — weak editorial markers (help distinguish features from news briefs)
const TIER_D = {
  max: 10, per: 5,
  keywords: ['review', 'feature', 'guide'],
}


export function analyzeArticleTitle(input: ArticleScoreInput): {
  score: number
  matchedKeywords: string[]
} {
  const text = `${input.title} ${input.snippet ?? ''}`.toLowerCase()
  const matchedKeywords: string[] = []

  function collectTier(tier: { max: number; per: number; keywords: string[] }): number {
    let pts = 0
    for (const kw of tier.keywords) {
      if (text.includes(kw)) {
        if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw)
        pts += tier.per
        if (pts >= tier.max) break
      }
    }
    return Math.min(tier.max, pts)
  }

  // Topical base comes from brand/supercar signals (S) plus automotive (B),
  // lifestyle (C), and editorial markers (D).
  const topicalBase =
    collectTier(TIER_S) +
    collectTier(TIER_B) +
    collectTier(TIER_C) +
    collectTier(TIER_D)

  // Detect geographic (Tier A) match separately.
  let hasGeo = false
  for (const kw of TIER_A.keywords) {
    if (text.includes(kw)) {
      hasGeo = true
      if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw)
    }
  }

  // Geo-only floor: if the article has no topical signal but mentions Dubai/UAE,
  // give a small floor score. A Dubai-focused editor is still a plausible pitch
  // target even if a given article is about property or food, but the score
  // should be clearly lower than articles that are actually on-topic.
  if (topicalBase === 0) {
    return { score: hasGeo ? GEO_ONLY_FLOOR : 0, matchedKeywords }
  }

  const score = Math.min(100, Math.round(topicalBase * (hasGeo ? TIER_A.multiplier : 1)))
  return { score, matchedKeywords }
}

const GEO_ONLY_FLOOR = 5

export function scoreEditorTopical(articleScores: number[]): number | null {
  if (articleScores.length === 0) return null
  const sorted = [...articleScores].sort((a, b) => b - a)
  const top = sorted.slice(0, 5)
  const sum = top.reduce((a, b) => a + b, 0)
  return Math.round(sum / top.length)
}

// ---------------------------------------------------------------------------
// Combined score — 60/40 weighted avg, profile-only if topical is null
// ---------------------------------------------------------------------------

export function computeCombinedScore(
  profileScore: number,
  topicalScore: number | null
): number {
  if (topicalScore == null) return profileScore
  return Math.round(0.6 * profileScore + 0.4 * topicalScore)
}
