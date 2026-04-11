import { createHmac } from 'crypto'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhooks/nowpayments
 *
 * Handles NOWPayments IPN (Instant Payment Notification) webhook callbacks.
 *
 * Security:
 *  - Raw body read via req.text() — required for signature verification
 *  - HMAC-SHA512 signature verified with NOWPAYMENTS_IPN_SECRET before processing
 *  - Idempotency via payment_id check (skip if booking already has this payment_id)
 *  - Admin client used for all DB writes (no user session in webhook context)
 *
 * Statuses handled:
 *  - finished        → booking payment_status = 'paid', status = 'confirmed'
 *  - partially_paid  → log warning, keep pending_crypto (admin handles manually)
 *  - failed/expired  → booking payment_status = 'failed'
 */
export async function POST(req: Request): Promise<Response> {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET

  if (!ipnSecret) {
    return new Response('NOWPayments not configured', { status: 503 })
  }

  // 1. Read raw body
  const body = await req.text()

  // 2. Get signature header
  const headersList = await headers()
  const sig = headersList.get('x-nowpayments-sig')

  if (!sig) {
    console.warn('nowpayments webhook: missing x-nowpayments-sig header')
    return new Response('Missing signature', { status: 400 })
  }

  // 3. Verify HMAC-SHA512 signature
  // NOWPayments requires: sort JSON keys alphabetically, then HMAC-SHA512
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body)
  } catch {
    console.warn('nowpayments webhook: invalid JSON body')
    return new Response('Invalid JSON', { status: 400 })
  }

  const sortedPayload = JSON.stringify(sortObjectKeys(payload))
  const hmac = createHmac('sha512', ipnSecret)
  hmac.update(sortedPayload)
  const expectedSig = hmac.digest('hex')

  if (sig !== expectedSig) {
    console.warn('nowpayments webhook: signature verification failed')
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // 4. Extract fields from payload
  const paymentStatus = payload.payment_status as string | undefined
  const orderId = payload.order_id as string | undefined
  const paymentId = payload.payment_id as number | string | undefined

  if (!orderId || !paymentStatus) {
    console.warn('nowpayments webhook: missing order_id or payment_status')
    return new Response('Missing required fields', { status: 400 })
  }

  const bookingId = orderId
  const paymentIdStr = paymentId != null ? String(paymentId) : null

  const admin = createAdminClient()

  // 5. Idempotency — check if this payment_id was already processed
  if (paymentIdStr) {
    const { data: existing } = await admin
      .from('bookings')
      .select('nowpayments_payment_id, payment_status')
      .eq('id', bookingId)
      .single()

    if (existing?.nowpayments_payment_id === paymentIdStr && existing?.payment_status === 'paid') {
      // Already processed — acknowledge
      return new Response('Already processed', { status: 200 })
    }
  }

  // 6. Handle payment statuses
  try {
    if (paymentStatus === 'finished' || paymentStatus === 'confirmed') {
      // Crypto reservation fee received — mark the fee as paid and promote
      // the booking to confirmed. The rest is still owed on pickup day.
      await admin
        .from('bookings')
        .update({
          payment_status: 'paid',
          reservation_fee_status: 'paid',
          status: 'confirmed',
          nowpayments_payment_id: paymentIdStr,
        })
        .eq('id', bookingId)
    } else if (paymentStatus === 'partially_paid') {
      // Partial payment — log warning, admin handles manually
      console.warn(`nowpayments webhook: partial payment for booking ${bookingId}`)
      if (paymentIdStr) {
        await admin
          .from('bookings')
          .update({ nowpayments_payment_id: paymentIdStr })
          .eq('id', bookingId)
      }
    } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      // Payment failed or expired
      await admin
        .from('bookings')
        .update({
          payment_status: 'failed',
          nowpayments_payment_id: paymentIdStr,
        })
        .eq('id', bookingId)
    }
    // All other statuses (waiting, confirming, sending) — acknowledge without action
  } catch (err) {
    console.error('nowpayments webhook: event processing error', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

/**
 * Recursively sorts object keys alphabetically for HMAC verification.
 * NOWPayments requires this sorting for signature computation.
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sorted[key] = sortObjectKeys(value as Record<string, unknown>)
    } else {
      sorted[key] = value
    }
  }
  return sorted
}
