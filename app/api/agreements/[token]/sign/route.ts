import { NextResponse } from 'next/server'
import { customerView, getAgreement, isPngDataUrl, isToken, saveAgreement } from '@/lib/rental-agreements'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ token: string }> }

/** Customer: sign the agreement (hirer signature also covers the card authorisation) */
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params
  const a = isToken(token) ? await getAgreement(token) : null
  if (!a) return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })
  if (a.status === 'signed') return NextResponse.json({ error: 'This agreement is already signed.' }, { status: 409 })
  if (a.status !== 'ready_to_sign') return NextResponse.json({ error: 'This agreement is not ready to sign yet.' }, { status: 409 })
  const body = await req.json().catch(() => ({}))
  if (body.agree !== true) return NextResponse.json({ error: 'Please tick to agree to the terms.' }, { status: 400 })
  if (!isPngDataUrl(body.sHirer)) return NextResponse.json({ error: 'Please sign first.' }, { status: 400 })
  a.sigs = { sHirer: body.sHirer, sCard: body.sHirer }
  if (isPngDataUrl(body.sAdd)) a.sigs.sAdd = body.sAdd
  a.status = 'signed'
  a.signedAt = new Date().toISOString()
  a.signedFrom = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64)
  await saveAgreement(a)
  return NextResponse.json(customerView(a))
}
