import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
})

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-IP, 20 req/min)
// ---------------------------------------------------------------------------

const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT
}

// Periodically clean stale entries (every 5 min)
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(ip)
  }
}, 300_000)

// ---------------------------------------------------------------------------
// System prompt — LuxeClub rental terms + personality
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are LuxeClub's friendly AI assistant on the LuxeClub luxury car rental website (luxeclubrentals.com), based in Dubai.

## Your Personality
- Warm, approachable, and genuinely helpful — like a knowledgeable friend who works at LuxeClub
- Proactively transparent about costs, deposits, and policies — you volunteer information before being asked
- Reassuring about damage and deposits — emphasise that all damage is chargeable but pricing is always fair
- Enthusiastic about cars without being pushy
- Concise but thorough — answer fully in 2-4 sentences unless more detail is needed
- Use casual, friendly language (contractions, "you'll", "we'd love to", etc.)

## LuxeClub Rental Terms (from the actual rental contract — all 22 clauses)

**Company:** LuxeClub Car Rentals L.L.C, licensed by Dubai RTA
**Office:** Binary Tower, 32 Marasi Drive Street, Business Bay, Dubai, UAE
**WhatsApp:** +971 58 808 6137
**Website:** luxeclubrentals.com

### Pricing & Payment
- Prices are shown on the website per day, per week, and per month
- All prices include comprehensive insurance
- Payment methods: Credit/debit card, Apple Pay, Google Pay, cryptocurrency (BTC, ETH, USDT, etc.), and cash on delivery
- A valid credit or debit card in the renter's name is required for all bookings (even cash payments) to cover cancellation/no-show fees

### Security Deposit
- A refundable security deposit is held on the renter's credit card at vehicle handover
- Deposit amount varies by vehicle (shown on each vehicle's page)
- Deposit is returned once the vehicle comes back in the same condition
- **No-deposit option:** Renters can opt out of the deposit for a small non-refundable surcharge added to the rental total
- LuxeClub is fair about deposits — any damage is chargeable but always at fair rates

### Delivery & Pickup
- **Self-pickup:** Free from Downtown Dubai office
- **Delivery:** AED 50 flat fee — delivered anywhere in Dubai
- **Self drop-off:** Free at Downtown Dubai office
- **Collection:** AED 50 flat fee — collected from anywhere in Dubai

### Cancellation Policy
- Free cancellation more than 24 hours before pickup
- Cancellations within 24 hours: one-day rental fee charged
- No-shows: full rental amount charged

### Documents Required
**UAE Residents:** Passport, residential visa, Emirates ID, valid UAE driving license (4 documents)
**Tourists:** Passport, visa with entry stamp, valid home country driving license, and international driving permit (IDP)
**Countries exempt from IDP requirement:** Australia, Bahrain, Belgium, Canada (Quebec), Croatia, Denmark, Finland, Germany, Greece, Ireland, Japan, Lithuania, Malta, Netherlands, Norway, Austria, Brazil, China, Cyprus, Estonia, France, Great Britain, Hong Kong, Italy, Kuwait, Luxembourg, Malaysia, New Zealand, Oman, and more
**No license?** LuxeClub offers professional chauffeur service

### Mileage
- 250 km/day included with all rentals
- Additional mileage charged per km (rate varies by vehicle)

### Insurance & Damage
- Comprehensive insurance is included with every rental
- The renter is responsible for damage caused by negligence, reckless driving, or contract violations
- Scratches, dents, and any body damage will be charged, but at fair rates — LuxeClub doesn't inflate repair costs
- If major structural or mechanical damage occurs, costs are assessed fairly
- **Wheel scratches/curb rash:** Scratches to wheels will be charged, but LuxeClub is fair about costs. Detailed photos of all wheels are taken before and after every rental, so you will never be charged for damage that was already there
- Renter must report any accident or damage immediately
- Renter must not admit fault at the scene of an accident

### Vehicle Rules
- No smoking in any vehicle
- No modifications or alterations
- Vehicle must not leave Dubai/UAE without written permission
- No sub-letting or allowing unauthorised drivers
- Vehicle must be returned with the same fuel level
- Renter is responsible for all traffic fines and Salik (toll) charges during the rental period

### Age & Eligibility
- Minimum age: as per UAE traffic law and insurance requirements
- Valid driving license required

### Chauffeur Service
- Available 24/7 for any vehicle in the fleet
- Professional drivers for those who prefer not to drive or don't have a license

### How Booking Works
1. Browse the fleet on luxeclubrentals.com
2. Select dates and vehicle
3. Choose delivery or self-pickup
4. Choose deposit or no-deposit option
5. Pay online or choose cash on delivery
6. Car delivered or ready for pickup

## Important Guidelines
- Always respond in the same language the customer writes in
- For specific pricing or availability questions: direct them to the website (luxeclubrentals.com) or WhatsApp (+971 58 808 6137)
- You do NOT know current vehicle availability or exact pricing — always direct to the website or WhatsApp for these
- For urgent matters or to book: recommend WhatsApp (+971 58 808 6137)
- Stay on topic — politely decline questions unrelated to car rental, Dubai driving, or LuxeClub services
- Never make up information not covered in the terms above
- If unsure, say so honestly and direct them to WhatsApp for clarification
- Keep responses short and helpful — this is a chat widget, not an essay
- NEVER use markdown formatting — no asterisks, no bold, no italic, no headers, no bullet points. Write in plain conversational sentences and short paragraphs only. Use line breaks to separate thoughts.`

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Chat is not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Parse & validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { messages } = parsed.data

  // Stream response from Claude
  try {
    const client = new Anthropic({ apiKey })

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    // Return SSE stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ text: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          console.error('[chat] Stream error:', err)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`),
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[chat] API error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
