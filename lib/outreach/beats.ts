/**
 * Beat classification + pitch preference extraction.
 *
 * One Claude Haiku call per editor, reading all their enrichment text, that
 * outputs two things in a single JSON response:
 *   1. beats    — 3 to 6 controlled-vocab tags ("what do they cover?")
 *   2. preferences — scraped pitch-preference signals ("how to pitch them?")
 *
 * Combining both into one LLM round-trip keeps the cost ~= $0.002/editor.
 *
 * Beats are purely descriptive/filterable — they do NOT replace or modify the
 * existing Match/Coverage/Overall scoring system.
 */

import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// Controlled vocabulary. Keep in sync with UI filter + chips.
export const BEAT_VOCABULARY = [
  'luxury-travel',
  'motoring',
  'supercars',
  'hospitality',
  'lifestyle',
  'business',
  'fashion',
  'food-drink',
  'technology',
  'celebrity-entertainment',
  'real-estate',
  'design-architecture',
  'watches-jewellery',
  'yachting-aviation',
  'general-news',
] as const

export type Beat = (typeof BEAT_VOCABULARY)[number]

export interface PitchPreferences {
  prefers_dm: boolean
  email_preferred: boolean
  no_pr: boolean
  preferred_topics: string[]
  blocked_topics: string[]
  open_to_embargoes: boolean | null
  notes: string | null
}

export interface EnrichmentInput {
  editorName: string
  outletName: string
  position: string | null
  bioText: string | null
  externalBioText: string | null
  linkedinTitle: string | null
  twitterBio: string | null
  aiSummary: string | null
  articleTitles: string[]
}

export interface EnrichmentResult {
  beats: Beat[]
  beatSummary: string
  pitchPreferences: PitchPreferences
}

const SYSTEM_PROMPT = `You classify journalists for an internal outreach CRM.

Given enrichment data about one editor, output a single JSON object with two parts: their coverage beats and their pitch preferences.

## Part 1 — beats
Pick 3 to 6 tags from this CLOSED list. Do not invent new tags.

luxury-travel, motoring, supercars, hospitality, lifestyle, business, fashion, food-drink, technology, celebrity-entertainment, real-estate, design-architecture, watches-jewellery, yachting-aviation, general-news

Rules:
- Base tags on what they actually write about (article titles), not only job title.
- If motoring AND supercars both fit, include both.
- If they cover Middle East travel, use luxury-travel + hospitality (not a new tag).
- Use general-news only if no specific beat dominates.

Also write "summary": one short factual sentence describing their coverage, no marketing language, under 160 chars.

## Part 2 — pitch_preferences
Extract explicit signals from bios, LinkedIn, Twitter, article bylines. Only mark true when evidence is direct.

- prefers_dm: true if bio/socials say "DM me", "slide into my DMs", "best to reach via DM"
- email_preferred: true if they name an email or say "pitch me at [email]"
- no_pr: true only if they explicitly say "no PR pitches" / "not accepting pitches"
- preferred_topics: short strings they explicitly invite (e.g., "Dubai hotel openings", "supercar launches"). [] if none stated.
- blocked_topics: short strings they explicitly refuse (e.g., "no crypto", "no NFT"). [] if none stated.
- open_to_embargoes: true/false if they explicitly say; null if unknown
- notes: null, or <140 chars if they said something useful that doesn't fit above

Default all booleans to false when there is no direct signal. Do not guess.

## Output
Return ONLY a JSON object. No prose, no code fences.

{
  "beats": ["tag1", "tag2", ...],
  "summary": "...",
  "pitch_preferences": { ... }
}`

function coerceBeats(raw: unknown): Beat[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<Beat>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const normalized = item.toLowerCase().trim() as Beat
    if ((BEAT_VOCABULARY as readonly string[]).includes(normalized)) {
      seen.add(normalized)
    }
  }
  return Array.from(seen).slice(0, 6)
}

function coercePreferences(raw: unknown): PitchPreferences {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  return {
    prefers_dm: r.prefers_dm === true,
    email_preferred: r.email_preferred === true,
    no_pr: r.no_pr === true,
    preferred_topics: asArray(r.preferred_topics),
    blocked_topics: asArray(r.blocked_topics),
    open_to_embargoes: typeof r.open_to_embargoes === 'boolean' ? r.open_to_embargoes : null,
    notes: typeof r.notes === 'string' && r.notes.trim().length > 0 ? r.notes.trim() : null,
  }
}

export async function classifyEditor(input: EnrichmentInput): Promise<{
  result: EnrichmentResult | null
  error: string | null
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { result: null, error: 'ANTHROPIC_API_KEY not configured' }

  const client = new Anthropic({ apiKey })

  const userBlob = [
    `Editor: ${input.editorName}`,
    `Outlet: ${input.outletName}`,
    input.position && `Hunter position: ${input.position}`,
    input.linkedinTitle && `LinkedIn headline: ${input.linkedinTitle}`,
    input.twitterBio && `Twitter bio: ${input.twitterBio}`,
    input.bioText && `Outlet author bio:\n${input.bioText}`,
    input.externalBioText && `External/Muckrack/portfolio bio:\n${input.externalBioText}`,
    input.aiSummary && `Prior AI coverage summary:\n${input.aiSummary}`,
    input.articleTitles.length > 0 && `Recent article titles:\n- ${input.articleTitles.slice(0, 12).join('\n- ')}`,
  ].filter(Boolean).join('\n\n')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userBlob || 'No enrichment data available.' }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { result: null, error: 'Empty response from Claude' }
    }

    // Strip optional code fences if Claude added them despite instructions
    const cleaned = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return { result: null, error: `Classifier returned non-JSON: ${cleaned.slice(0, 180)}` }
    }

    const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>
    return {
      result: {
        beats: coerceBeats(obj.beats),
        beatSummary: typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 280) : '',
        pitchPreferences: coercePreferences(obj.pitch_preferences),
      },
      error: null,
    }
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : 'Unknown Claude error',
    }
  }
}
