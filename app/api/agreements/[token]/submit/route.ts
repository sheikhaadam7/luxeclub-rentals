import { NextResponse } from 'next/server'
import { CUSTOMER_KEYS, getAgreement, isToken, pick, saveAgreement } from '@/lib/rental-agreements'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ token: string }> }

/** Customer: send the checked details (after the document photos) – LuxeClub then adds the car and price */
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params
  const a = isToken(token) ? await getAgreement(token) : null
  if (!a) return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })
  if (a.status !== 'awaiting_documents') return NextResponse.json({ error: 'Your details have already been sent.' }, { status: 409 })
  const body = await req.json().catch(() => ({}))
  const customer = pick(body.customer, CUSTOMER_KEYS)
  if (!customer.hName?.trim() || !customer.hPhone?.trim()) return NextResponse.json({ error: 'Please add your name and phone number.' }, { status: 400 })
  if (!a.docs.length) return NextResponse.json({ error: 'Please add photos of your documents.' }, { status: 400 })
  a.customer = customer
  a.status = 'details_received'
  a.submittedAt = new Date().toISOString()
  await saveAgreement(a)
  return NextResponse.json({ ok: true })
}
