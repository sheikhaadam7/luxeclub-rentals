/**
 * AI-generated personalized opening lines for cold pitches.
 * Uses Anthropic Claude Haiku (cheap, fast). Falls back gracefully if API fails.
 */

import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

export interface PersonalizeInput {
  editorFirstName: string | null
  editorLastName: string | null
  position: string | null
  outletName: string
  outletDomain: string
  pitchAngleName: string
  pitchAngleDescription: string
  recentArticleTitles?: string[]
  bioText?: string | null
  aiSummary?: string | null
}

export interface PersonalizeResult {
  opener: string
  error: string | null
}

const SYSTEM_PROMPT = `You are drafting the opening line of a cold outreach email from Adam, the owner of a Dubai luxury car rental company (LuxeClub Rentals), to a journalist.

Your job: write 1-2 sentences that reference something SPECIFIC about this editor — their outlet, section, or a recent article they've written. The goal is to signal you actually know who you're emailing, not that you're blasting a template.

## Core rules
- 1-2 sentences MAXIMUM. Hard limit.
- Reference something real and specific from the editor data provided.
- Tone: one professional writing to another. Matter-of-fact. Confident but not sycophantic.
- NEVER say "I love your work", "big fan", "enjoyed your piece" — these phrases are dead to editors.
- Do NOT include a subject line, greeting, or sign-off. ONLY the opening sentences that go right after "Hi [Name],".
- Do NOT start with "I" or "I'm". Start with something about THEM or their work.
- Straight ASCII only. No curly quotes, no em dashes, no arrows.

## Banned words / phrases (dead giveaways of AI writing)
NEVER use: "exclusive", "unmissable", "bucket-list", "opulent", "decadent", "world-class", "stunning", "breathtaking", "quietly", "deeply", "fundamentally", "remarkably", "arguably", "delve", "certainly", "utilize", "leverage", "robust", "streamline", "harness", "tapestry", "landscape", "paradigm", "synergy", "ecosystem", "framework", "serves as", "stands as", "represents", "marks a".

## Banned sentence patterns
- "It's not X, it's Y" / "It's not X — it's Y" (negative parallelism)
- "Not X. Not Y. Just Z." (dramatic countdown)
- "The X? A Y." (self-posed rhetorical questions)
- "Here's the thing / kicker / deal" (false suspense)
- "Think of it as..." / "It's like a..." (patronizing analogy)
- "Imagine a world where..."
- "In a world where..."
- Em dashes for dramatic pauses (use commas or full stops instead)

## Style
Write like a human who's short on time and just wants to be read. Vary sentence length naturally. Include one specific detail (a named article, a section they edit, a recent trend they've covered). Sound like a business owner, not a journalist writing about a business owner.

Output ONLY the 1-2 sentences. No quotes, no explanation, no markdown.`

function buildUserPrompt(input: PersonalizeInput): string {
  const firstName = input.editorFirstName || 'the editor'
  const lines: string[] = [
    `Editor: ${firstName} ${input.editorLastName ?? ''}`.trim(),
    `Position: ${input.position ?? 'journalist'}`,
    `Outlet: ${input.outletName}`,
  ]

  if (input.recentArticleTitles && input.recentArticleTitles.length > 0) {
    lines.push('Recent articles they\'ve written:')
    for (const t of input.recentArticleTitles.slice(0, 5)) {
      lines.push(`  - ${t}`)
    }
  }

  if (input.bioText) {
    lines.push(`Bio: ${input.bioText.slice(0, 400)}`)
  }

  if (input.aiSummary) {
    lines.push(`Summary of their coverage: ${input.aiSummary}`)
  }

  lines.push('')
  lines.push(`Pitch angle I'm writing to them about: ${input.pitchAngleName}`)
  lines.push(`Angle description: ${input.pitchAngleDescription}`)

  return lines.join('\n')
}

export async function generateOpener(input: PersonalizeInput): Promise<PersonalizeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { opener: '', error: 'ANTHROPIC_API_KEY not configured' }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { opener: '', error: 'Empty response from Claude' }
    }

    // Strip accidental quotes / leading newlines
    const opener = textBlock.text.trim().replace(/^["']|["']$/g, '')

    return { opener, error: null }
  } catch (err) {
    return {
      opener: '',
      error: err instanceof Error ? err.message : 'Unknown Anthropic error',
    }
  }
}
