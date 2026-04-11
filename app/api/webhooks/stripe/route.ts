import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { BookingConfirmationEmail } from '@/components/email/BookingConfirmationEmail'
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
 *  - setup_intent.succeeded          → saves payment_method on booking (card-on-file)
 */
export async function POST(req: Request): Promise<Response> {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Stripe not configured', { status: 503 })
  }

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
    .insert({ stripe_event_id: event.id, event_type: event.type })

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
          // Reservation fee charge succeeded — mark the fee as paid and
          // promote the booking from draft to pending. The remaining
          // balance is still owed on pickup day.
          await admin
            .from('bookings')
            .update({
              payment_status: 'paid',
              reservation_fee_status: 'paid',
              status: 'pending',
            })
            .eq('id', bookingId)

          // Send confirmation email (non-blocking)
          try {
            await sendBookingConfirmationEmail(admin, bookingId)
          } catch (emailErr) {
            console.error('stripe webhook: confirmation email failed (non-fatal)', emailErr)
          }
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
    } else if (eventType === 'setup_intent.succeeded') {
      // Card-on-file saved — persist payment_method on the booking
      const si = (event as Stripe.Event & { data: { object: Stripe.SetupIntent } }).data.object
      const bookingId = si.metadata?.booking_id
      const paymentMethod = typeof si.payment_method === 'string'
        ? si.payment_method
        : si.payment_method?.id ?? null

      if (bookingId && paymentMethod) {
        await admin
          .from('bookings')
          .update({ stripe_payment_method_id: paymentMethod, status: 'pending' })
          .eq('id', bookingId)

        // Send confirmation email for cash bookings (non-blocking)
        try {
          await sendBookingConfirmationEmail(admin, bookingId)
        } catch (emailErr) {
          console.error('stripe webhook: cash confirmation email failed (non-fatal)', emailErr)
        }
      }
    }
    // All other event types — acknowledge receipt without processing
  } catch (err) {
    console.error('stripe webhook: event processing error', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

/**
 * Fetches booking + vehicle details and sends a confirmation email.
 * Used after payment succeeds (card or cash card-on-file).
 */
async function sendBookingConfirmationEmail(
  admin: ReturnType<typeof createAdminClient>,
  bookingId: string
) {
  const { data: booking } = await admin
    .from('bookings')
    .select(`
      id, start_date, end_date, duration_type, pickup_method, return_method,
      delivery_address, deposit_choice, rental_subtotal, delivery_fee, return_fee,
      no_deposit_surcharge, deposit_amount, total_due, reservation_fee,
      balance_due_on_pickup, payment_method, status,
      user_id, guest_email,
      vehicles ( name, primary_image_url )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) return

  // Determine recipient email
  let recipientEmail: string | undefined
  if (booking.user_id) {
    const { data: { user } } = await admin.auth.admin.getUserById(booking.user_id)
    recipientEmail = user?.email ?? undefined
  } else {
    recipientEmail = booking.guest_email ?? undefined
  }

  if (!recipientEmail) return

  const vehiclesRaw = booking.vehicles as unknown
  const vehicle = Array.isArray(vehiclesRaw) ? vehiclesRaw[0] as { name: string; primary_image_url: string | null } | undefined : vehiclesRaw as { name: string; primary_image_url: string | null } | null

  await sendEmail({
    to: recipientEmail,
    subject: `Booking Confirmed — ${vehicle?.name ?? 'Vehicle'}`,
    react: BookingConfirmationEmail({
      booking: {
        id: bookingId,
        vehicleName: vehicle?.name ?? 'Vehicle',
        vehicleImage: vehicle?.primary_image_url ?? null,
        startDate: booking.start_date,
        endDate: booking.end_date,
        durationType: booking.duration_type as 'daily' | 'weekly' | 'monthly',
        pickupMethod: booking.pickup_method as 'delivery' | 'self_pickup',
        returnMethod: booking.return_method as 'collection' | 'self_dropoff',
        deliveryAddress: booking.delivery_address ?? null,
        depositChoice: booking.deposit_choice,
        rentalSubtotal: booking.rental_subtotal,
        deliveryFee: booking.delivery_fee,
        returnFee: booking.return_fee,
        noDepositSurcharge: booking.no_deposit_surcharge,
        depositAmount: booking.deposit_amount,
        totalDue: booking.total_due,
        reservationFee: booking.reservation_fee,
        balanceDueOnPickup: booking.balance_due_on_pickup,
        paymentMethod: booking.payment_method as 'card' | 'apple_pay' | 'google_pay' | 'cash' | 'crypto',
        status: booking.status,
      },
    }),
  })
}
