import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhooks/veriff
 *
 * Receives Veriff decision webhooks and updates profiles.kyc_status.
 * Signature verified using HMAC-SHA256 with VERIFF_SHARED_SECRET.
 *
 * Veriff webhook payload reference:
 * https://developers.veriff.com/#webhooks-decision-object
 */
export async function POST(req: Request): Promise<Response> {
  // 1. Read raw body for HMAC verification
  const body = await req.text()

  // 2. Verify Veriff HMAC-SHA256 signature
  const signatureHeader = req.headers.get('x-hmac-signature') ?? ''
  const expectedSignature = createHmac('sha256', process.env.VERIFF_SHARED_SECRET!)
    .update(body)
    .digest('hex')

  if (signatureHeader !== expectedSignature) {
    console.warn('veriff webhook: invalid HMAC signature')
    return new Response('Unauthorized', { status: 401 })
  }

  // 3. Parse payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body) as Record<string, unknown>
  } catch {
    console.error('veriff webhook: invalid JSON body')
    return new Response('Bad Request', { status: 400 })
  }

  // Veriff sends a top-level "verification" object for decision events
  // and a top-level "action" string. The vendorData (user ID) is nested inside.
  const verification = payload.verification as Record<string, unknown> | undefined
  const action = (payload.action as string | undefined) ?? ''
  const vendorData = verification?.vendorData as string | undefined

  if (!vendorData) {
    // Not a decision event we care about — return 200 to acknowledge receipt
    return new Response('OK', { status: 200 })
  }

  const userId = vendorData

  // 4. Map Veriff action to our kyc_status
  type KycUpdate = {
    kyc_status: 'verified' | 'pending' | 'rejected'
    kyc_verified_at?: string
  }

  let update: KycUpdate | null = null

  if (action === 'approved') {
    update = {
      kyc_status: 'verified',
      kyc_verified_at: new Date().toISOString(),
    }
  } else if (action === 'resubmission_requested') {
    update = { kyc_status: 'pending' }
  } else if (action === 'declined') {
    update = { kyc_status: 'rejected' }
  } else {
    // Unknown action — acknowledge without updating
    return new Response('OK', { status: 200 })
  }

  // 5. Update profiles using admin client (bypasses RLS)
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', userId)

  if (error) {
    console.error('veriff webhook: profile update error', error)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
