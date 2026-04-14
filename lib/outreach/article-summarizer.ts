/**
 * AI-generated summary of an editor's writing profile.
 * Uses Claude Haiku on the editor's top article texts to produce
 * a short 2-3 sentence summary of what topics they cover and their angle.
 *
 * Used as context for the AI opening line generator.
 */

import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

export interface SummarizeInput {
  editorName: string
  outletName: string
  articles: Array<{ title: string; text: string }>
}

const SYSTEM_PROMPT = `You are summarizing a journalist's coverage style for internal research notes.

Given 2-4 full article texts by the same editor, write a 2-3 sentence internal note describing:
- What topics they actually cover (be specific: "supercar reviews and driving features" not "automotive content")
- Their angle or perspective (data-driven, enthusiast, critical, lifestyle)
- Anything distinctive about their writing style

This is for internal research notes, not published output. Write like you're briefing a colleague. No marketing language, no superlatives.

## Banned words
"quietly", "deeply", "fundamentally", "leverage", "robust", "tapestry", "landscape", "paradigm", "serves as", "stands as", "represents".

## Banned patterns
- "It's not X, it's Y"
- "The X? A Y"
- Em dashes
- Starting with "I"

Output ONLY the 2-3 sentences. No headers, no quotes.`

export async function summarizeForEditor(input: SummarizeInput): Promise<{ summary: string; error: string | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { summary: '', error: 'ANTHROPIC_API_KEY not configured' }

  const client = new Anthropic({ apiKey })

  const userPrompt = [
    `Editor: ${input.editorName} at ${input.outletName}`,
    '',
    'Articles (truncated):',
    ...input.articles.map((a, i) => `\n--- Article ${i + 1}: ${a.title} ---\n${a.text.slice(0, 2000)}`),
  ].join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { summary: '', error: 'Empty response from Claude' }
    }
    return { summary: textBlock.text.trim(), error: null }
  } catch (err) {
    return {
      summary: '',
      error: err instanceof Error ? err.message : 'Unknown Anthropic error',
    }
  }
}
