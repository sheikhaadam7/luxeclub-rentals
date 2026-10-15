import 'server-only'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Online rental agreements (public/forms/agreement.html + sign.html).
 *
 * Flow: staff create a link → customer uploads documents and checks their
 * details → staff add the car and charges → customer signs with the same link.
 *
 * Everything lives in the private `rental-agreements` storage bucket, one
 * folder per agreement token. Storage downloads can be served stale for a
 * while after an object is overwritten, so nothing is ever overwritten:
 *   {token}/v-{time}-{rand}.json   – each save is a new version; the newest wins (older ones are pruned)
 *   {token}/docs/{time}-{type}-{who}-{rand}.jpg – document photos; the list of docs comes from the folder listing
 * Listings are always fresh. All access goes through the service-role client
 * in the API routes; the token in the link is the customer's only key, so it
 * is long and random.
 */

const BUCKET = 'rental-agreements'
const KEEP_VERSIONS = 3

export type AgreementStatus = 'awaiting_documents' | 'details_received' | 'ready_to_sign' | 'signed'

export interface AgreementDoc { path: string; type: string; who: string }

export interface Agreement {
  token: string
  status: AgreementStatus
  created: string
  updated: string
  customer: Record<string, string>
  booking: Record<string, string>
  /** from the docs/ folder listing – not stored in the JSON */
  docs: AgreementDoc[]
  coSig?: string
  sigs?: Record<string, string>
  submittedAt?: string
  sentAt?: string
  signedAt?: string
  signedFrom?: string
}

export interface AgreementSummary {
  token: string
  status: AgreementStatus
  name: string
  car: string
  agNo: string
  created: string
  updated: string
}

/** Customer fields (hirer + additional driver) – same keys as the form's data-k attributes */
export const CUSTOMER_KEYS = [
  'hType', 'hName', 'hPhone', 'hEmail', 'hNat', 'hDob', 'hAddr',
  'hPass', 'hPassIss', 'hPassExp', 'hDl', 'hDlIss', 'hDlExp', 'hEid', 'hEidIss', 'hEidExp', 'hTl', 'hTlIss', 'hTlExp',
  'aName', 'aNat', 'aId', 'aIdExp', 'aDl', 'aDlIss', 'aDlExp', 'aPhone', 'aAddr',
]
/** Car and charges – filled in by staff */
export const BOOKING_KEYS = [
  'agNo', 'agDate', 'branch', 'vCar', 'vPlate', 'vColour', 'vKm', 'vOut', 'vIn', 'vMOut', 'vMIn', 'vFOut', 'vFIn',
  'cPer', 'cRate', 'cQty', 'cCdw', 'cDel', 'cOthD', 'cOth', 'cFuel', 'cXkm', 'cDep', 'cPaid',
]
export const DOC_TYPES = ['passport', 'eid', 'dl', 'tl', 'other']
export const MAX_DOCS = 8
export const MAX_DOC_BYTES = 4 * 1024 * 1024
export const MAX_SIG_CHARS = 400_000

export const isToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{24,64}$/.test(t)

/** Keep only known keys with short string values */
export function pick(src: unknown, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  if (!src || typeof src !== 'object') return out
  for (const k of keys) {
    const v = (src as Record<string, unknown>)[k]
    if (typeof v === 'string') out[k] = v.slice(0, 200)
  }
  return out
}

export const isPngDataUrl = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('data:image/png;base64,') && v.length < MAX_SIG_CHARS

let bucketReady: Promise<void> | null = null
async function bucket() {
  const admin = createAdminClient()
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await admin.storage.getBucket(BUCKET)
      if (!data) {
        const { error } = await admin.storage.createBucket(BUCKET, { public: false })
        if (error && !/already exists/i.test(error.message)) { bucketReady = null; throw error }
      }
    })()
  }
  await bucketReady
  return admin.storage.from(BUCKET)
}

const stamp = () => Date.now().toString().padStart(15, '0') + '-' + randomBytes(3).toString('hex')

async function versions(token: string): Promise<string[]> {
  const b = await bucket()
  const { data } = await b.list(token, { limit: 100, sortBy: { column: 'name', order: 'desc' } })
  return (data ?? []).map(o => o.name).filter(n => /^v-\d{15}-[0-9a-f]+\.json$/.test(n)).sort().reverse()
}

async function docList(token: string): Promise<AgreementDoc[]> {
  const b = await bucket()
  const { data } = await b.list(`${token}/docs`, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
  return (data ?? []).filter(o => o.id).map(o => {
    const [, type = 'other', who = 'h'] = o.name.split('-')
    return { path: `${token}/docs/${o.name}`, type, who }
  })
}

export async function getAgreement(token: string): Promise<Agreement | null> {
  const [v] = await versions(token)
  if (!v) return null
  const b = await bucket()
  const { data, error } = await b.download(`${token}/${v}`)
  if (error || !data) return null
  const a = JSON.parse(await data.text()) as Agreement
  a.docs = await docList(token)
  return a
}

export async function listAgreements(): Promise<AgreementSummary[]> {
  const b = await bucket()
  const { data } = await b.list('', { limit: 200 })
  const tokens = (data ?? []).filter(o => !o.id && isToken(o.name)).map(o => o.name)
  const all = await Promise.all(tokens.map(t => getAgreement(t).catch(() => null)))
  return all.filter((a): a is Agreement => !!a)
    .map(a => ({ token: a.token, status: a.status, name: a.customer.hName ?? '', car: a.booking.vCar ?? '', agNo: a.booking.agNo ?? '', created: a.created, updated: a.updated }))
    .sort((x, y) => y.updated.localeCompare(x.updated))
}

export async function saveAgreement(a: Agreement) {
  a.updated = new Date().toISOString()
  const { docs, ...stored } = a
  const b = await bucket()
  const { error } = await b.upload(`${a.token}/v-${stamp()}.json`, JSON.stringify(stored), { contentType: 'application/json', upsert: false })
  if (error) throw error
  const old = (await versions(a.token)).slice(KEEP_VERSIONS)
  if (old.length) await b.remove(old.map(n => `${a.token}/${n}`))
  return { ...stored, docs } as Agreement
}

export async function createAgreement(): Promise<Agreement> {
  const now = new Date().toISOString()
  return saveAgreement({ token: randomBytes(24).toString('base64url'), status: 'awaiting_documents', created: now, updated: now, customer: {}, booking: {}, docs: [] })
}

export async function deleteAgreement(a: Agreement) {
  const b = await bucket()
  const paths = [...(await versions(a.token)).map(n => `${a.token}/${n}`), ...a.docs.map(d => d.path)]
  if (paths.length) await b.remove(paths)
}

export async function uploadDoc(a: Agreement, file: File, type: string, who: string): Promise<AgreementDoc> {
  const b = await bucket()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${a.token}/docs/${Date.now()}-${type}-${who}-${randomBytes(4).toString('hex')}.${ext}`
  const { error } = await b.upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (error) throw error
  return { path, type, who }
}

export async function signedDocUrls(a: Agreement) {
  if (!a.docs.length) return []
  const b = await bucket()
  const { data } = await b.createSignedUrls(a.docs.map(d => d.path), 60 * 30)
  return a.docs.map((d, i) => ({ type: d.type, who: d.who, url: data?.[i]?.signedUrl ?? '' }))
}

/** True when the request comes from a logged-in website admin (profiles.role = 'admin') */
export async function isStaff(): Promise<boolean> {
  if (process.env.NODE_ENV === 'development' && process.env.AGREEMENTS_DEV_STAFF === '1') return true // local testing only
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const sub = data?.claims?.sub
  if (!sub) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', sub).single()
  return profile?.role === 'admin'
}

/** What the customer's link may see: nothing personal until the agreement is ready to sign */
export function customerView(a: Agreement) {
  const base = { status: a.status, docs: a.docs.length }
  if (a.status === 'awaiting_documents' || a.status === 'details_received') return base
  return { ...base, customer: a.customer, booking: a.booking, coSig: a.coSig ?? null, sigs: a.sigs ?? {}, signedAt: a.signedAt ?? null }
}
