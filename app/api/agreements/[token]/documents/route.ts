import { NextResponse } from 'next/server'
import { DOC_TYPES, MAX_DOC_BYTES, MAX_DOCS, getAgreement, isToken, uploadDoc } from '@/lib/rental-agreements'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ token: string }> }
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Customer: upload one document photo (only while the agreement is waiting for documents) */
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params
  const a = isToken(token) ? await getAgreement(token) : null
  if (!a) return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })
  if (a.status !== 'awaiting_documents') return NextResponse.json({ error: 'Your documents have already been sent.' }, { status: 409 })
  if (a.docs.length >= MAX_DOCS) return NextResponse.json({ error: 'Too many photos.' }, { status: 400 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file'), type = String(form?.get('type') ?? ''), who = form?.get('who') === 'a' ? 'a' : 'h'
  if (!(file instanceof File) || !IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'Please use a photo (JPEG or PNG).' }, { status: 400 })
  if (file.size > MAX_DOC_BYTES) return NextResponse.json({ error: 'That photo is too large.' }, { status: 400 })
  if (!DOC_TYPES.includes(type)) return NextResponse.json({ error: 'Unknown document type.' }, { status: 400 })
  await uploadDoc(a, file, type, who) // the docs list comes from the folder, so the agreement itself needs no save
  return NextResponse.json({ ok: true, docs: a.docs.length + 1 })
}
