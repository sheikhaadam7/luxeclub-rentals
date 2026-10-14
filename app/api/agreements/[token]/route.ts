import { NextResponse } from 'next/server'
import {
  BOOKING_KEYS, CUSTOMER_KEYS, customerView, deleteAgreement, getAgreement, isPngDataUrl, isStaff, isToken, pick, saveAgreement, signedDocUrls,
  type AgreementStatus,
} from '@/lib/rental-agreements'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ token: string }> }

/** Customer link: status (+ the agreement once it is ready to sign). Staff (?staff=1): everything, with document photo links */
export async function GET(req: Request, { params }: Ctx) {
  const { token } = await params
  if (!isToken(token)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const a = await getAgreement(token)
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (new URL(req.url).searchParams.get('staff') === '1') {
    if (!(await isStaff())) return NextResponse.json({ error: 'staff only' }, { status: 401 })
    return NextResponse.json({ agreement: a, docUrls: await signedDocUrls(a) })
  }
  return NextResponse.json(customerView(a))
}

/** Staff: save car, charges, corrected customer details, company signature; optionally send for signing */
export async function PUT(req: Request, { params }: Ctx) {
  if (!(await isStaff())) return NextResponse.json({ error: 'staff only' }, { status: 401 })
  const { token } = await params
  const a = isToken(token) ? await getAgreement(token) : null
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  if (a.status === 'signed') {
    // after signing only the return details can change
    Object.assign(a.booking, pick(body.booking, ['vMIn', 'vFIn', 'cFuel', 'cPaid']))
    return NextResponse.json({ agreement: await saveAgreement(a) })
  }
  if (body.customer) a.customer = { ...a.customer, ...pick(body.customer, CUSTOMER_KEYS) }
  if (body.booking) a.booking = { ...a.booking, ...pick(body.booking, BOOKING_KEYS) }
  if (body.coSig === null) delete a.coSig
  else if (isPngDataUrl(body.coSig)) a.coSig = body.coSig
  const next = body.status as AgreementStatus | undefined
  if (next === 'ready_to_sign') {
    if (!a.customer.hName || !a.booking.vCar || !a.booking.cRate) return NextResponse.json({ error: 'Add the customer name, car and rate first.' }, { status: 400 })
    a.status = 'ready_to_sign'; a.sentAt = new Date().toISOString()
  } else if (next === 'details_received' || next === 'awaiting_documents') {
    a.status = next
  }
  return NextResponse.json({ agreement: await saveAgreement(a) })
}

/** Staff: delete an agreement and its document photos */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isStaff())) return NextResponse.json({ error: 'staff only' }, { status: 401 })
  const { token } = await params
  const a = isToken(token) ? await getAgreement(token) : null
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await deleteAgreement(a)
  return NextResponse.json({ ok: true })
}
