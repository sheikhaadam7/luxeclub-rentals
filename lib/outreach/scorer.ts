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
  outletPriority: 'P1' | 'P2' | 'P3'
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
]

function titlePoints(position: string | null): number {
  if (!position) return 5
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

function tierPoints(priority: 'P1' | 'P2' | 'P3'): number {
  switch (priority) {
    case 'P1': return 10
    case 'P2': return 6
    case 'P3': return 3
  }
}

export function scoreEditorProfile(input: EditorProfileInput): number {
  // Hard-zero on off-topic department
  if (input.department && HARD_ZERO_DEPARTMENTS.has(input.department.toLowerCase())) return 0

  const title = titlePoints(input.position)
  if (title === 0) return 0 // Hard-zero on sales/HR keywords in title

  const dept = departmentPoints(input.department, input.position)
  const kw = keywordBoostPoints(input.position)
  const sen = seniorityPoints(input.seniority)
  const conf = confidencePoints(input.confidence)
  const tier = tierPoints(input.outletPriority)

  return Math.min(100, title + dept + kw + sen + conf + tier)
}

// ---------------------------------------------------------------------------
// Article topical score — 0-100 per article; editor score = avg of top 5
// ---------------------------------------------------------------------------

// Keyword tiers for article titles/snippets. Point-capped per tier.
const TIER_A = { max: 50, per: 25, keywords: ['dubai', 'uae', 'abu dhabi', 'emirates'] }
const TIER_B = {
  max: 40, per: 20,
  keywords: [
    'luxury car', 'supercar', 'exotic', 'rental', 'hire',
    'lamborghini', 'ferrari', 'rolls-royce', 'rolls royce', 'bentley',
    'porsche', 'mclaren', 'aston martin',
  ],
}
const TIER_C = {
  max: 20, per: 10,
  keywords: ['car', 'travel', 'lifestyle', 'luxury', 'drive', 'motor', 'automotive', 'auto'],
}
const TIER_D = {
  max: 10, per: 5,
  keywords: ['weekend', 'review', 'feature', 'guide'],
}

export function analyzeArticleTitle(input: ArticleScoreInput): {
  score: number
  matchedKeywords: string[]
} {
  const text = `${input.title} ${input.snippet ?? ''}`.toLowerCase()
  const matchedKeywords: string[] = []
  let score = 0

  for (const tier of [TIER_A, TIER_B, TIER_C, TIER_D]) {
    let tierPoints = 0
    for (const kw of tier.keywords) {
      if (text.includes(kw)) {
        if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw)
        tierPoints += tier.per
        if (tierPoints >= tier.max) break
      }
    }
    score += Math.min(tier.max, tierPoints)
  }

  return { score: Math.min(100, score), matchedKeywords }
}

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
