import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for payment and deposit status updates.
 *
 * Security:
 *  - Raw body read via req.text() — required for signature verification
 *  - Stripe signature verified with STRIPE_WEBHOOK_SECRET before processing
 *  - Idempotency via stripe_webhook_events table (unique constraint on event id)
 *  - Admin client used for all DB writes (no user session in webhook context)
 *
 * Events handled:
 *  - payment_intent.succeeded        → booking payment_status = 'paid' (rental)
 *  - payment_intent.requires_capture → booking deposit_status = 'held' (deposit)
 *  - payment_intent.canceled         → booking deposit_status = 'voided'
 *  - payment_intent.payment_failed   → booking payment_status = 'failed'
 */
export async function POST(req: Request): Promise<Response> {
  // 1. Read raw body — MUST use req.text(), not req.json()
  const body = await req.text()

  // 2. Get Stripe-Signature header
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    console.warn('stripe webhook: missing stripe-signature header')
    return new Response('Missing signature', { status: 400 })
  }

  // 3. Verify webhook signature
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.warn('stripe webhook: signature verification failed', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const admin = createAdminClient()

  // 4. Idempotency — insert event record; skip if already processed
  const { error: idempotencyError } = await admin
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type })

  if (idempotencyError) {
    // PostgreSQL unique constraint violation code
    if (idempotencyError.code === '23505') {
      // Already processed — return 200 to acknowledge
      return new Response('Already processed', { status: 200 })
    }
    console.error('stripe webhook: idempotency insert error', idempotencyError)
    return new Response('Internal Server Error', { status: 500 })
  }

  // 5. Handle event types
  // Note: payment_intent.requires_capture is handled via string comparison
  // because some Stripe SDK versions don't include it in the typed event union.
  const eventType = event.type as string

  try {
    if (eventType === 'payment_intent.succeeded') {
      const pi = (event as Stripe.Event & { data: { object: Stripe.PaymentIntent } }).data.object
      const bookingId = pi.metadata?.booking_id
      const type = pi.metadata?.type

      if (bookingId) {
        if (type === 'rental') {
          // Rental charge succeeded — mark booking as paid
          await admin
            .from('bookings')
            .update({ payment_status: 'paid' })
            .eq('id', bookingId)
        } else if (type === 'deposit') {
          // Deposit was explicitly charged (manual capture triggered externally)
          await admin
            .from('bookings')
            .update({ deposit_status: 'captured' })
            .eq('id', bookingId)
        }
      }
    } else if (eventType === 'payment_intent.requires_capture') {
      // Deposit authorization successful — funds are held, awaiting capture
      const pi = (event as Stripe.Event & { data: { object: Stripe.PaymentIntent } }).data.object
      const bookingId = pi.metadata?.booking_id
      const type = pi.metadata?.type

      if (bookingId && type === 'deposit') {
        await admin
          .from('bookings')
          .update({ deposit_status: 'held' })
          .eq('id', bookingId)
      }
    } else if (eventType === 'payment_intent.canceled') {
      // PaymentIntent canceled — deposit voided
      const pi = (event as Stripe.Event & { data: { object: Stripe.PaymentIntent } }).data.object
      const bookingId = pi.metadata?.booking_id

      if (bookingId) {
        await admin
          .from('bookings')
          .update({ deposit_status: 'voided' })
          .eq('id', bookingId)
      }
    } else if (eventType === 'payment_intent.payment_failed') {
      // Payment failed — update booking payment status
      const pi = (event as Stripe.Event & { data: { object: Stripe.PaymentIntent } }).data.object
      const bookingId = pi.metadata?.booking_id

      if (bookingId) {
        await admin
          .from('bookings')
          .update({ payment_status: 'failed' })
          .eq('id', bookingId)
      }
    }
    // All other event types — acknowledge receipt without processing
  } catch (err) {
    console.error('stripe webhook: event processing error', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
