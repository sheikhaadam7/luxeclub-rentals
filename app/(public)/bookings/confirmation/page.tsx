import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Stripe redirect target for 3DS / SCA flows. After the bank's 3DS step,
 * the customer lands here with `?payment_intent={id}&redirect_status=succeeded`
 * (Card / wallet flow) or `?setup_intent={id}&redirect_status=succeeded`
 * (Cash flow card-on-file). We use the intent id to look up the booking so
 * we can greet the customer by name + echo their email.
 *
 * For non-3DS bookings, the wizard handles success inline in BookingWizard
 * (the guest inline confirmation, or a redirect to /bookings/{id} for
 * signed-in users) — those customers never land on this page.
 */

interface PageProps {
  searchParams: Promise<{
    redirect_status?: string
    payment_intent?: string
    setup_intent?: string
  }>
}

async function lookupCustomer(intentId: string | undefined, type: 'pi' | 'si') {
  if (!intentId) return null
  const admin = createAdminClient()
  const column = type === 'pi' ? 'stripe_rental_pi_id' : 'stripe_setup_intent_id'
  const { data: booking } = await admin
    .from('bookings')
    .select('guest_name, guest_email, user_id')
    .eq(column, intentId)
    .maybeSingle()
  if (!booking) return null

  if (booking.user_id) {
    const { data: { user } } = await admin.auth.admin.getUserById(booking.user_id)
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; first_name?: string; name?: string }
    const fullName = meta.full_name ?? meta.name ?? meta.first_name ?? null
    return { name: fullName, email: user?.email ?? null }
  }
  return { name: booking.guest_name ?? null, email: booking.guest_email ?? null }
}

export default async function BookingConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const isSuccess = params.redirect_status === 'succeeded'

  const customer = isSuccess
    ? await lookupCustomer(
        params.payment_intent ?? params.setup_intent,
        params.payment_intent ? 'pi' : 'si',
      ).catch(() => null)
    : null

  const fullName = customer?.name?.trim() || null
  const email = customer?.email?.trim() || null

  if (!isSuccess) {
    return (
      <main className="min-h-screen bg-luxury flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">Payment Issue</h1>
          <p className="text-sm text-brand-muted">
            Something went wrong with your payment. Please try again or contact us.
          </p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
          >
            View bookings
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-luxury flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-8">
        {/* Green tick circle */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 mx-auto shadow-lg">
          <svg className="h-12 w-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Great choice greeting */}
        <p className="text-2xl sm:text-3xl text-white font-normal">
          {fullName ? `Great choice, ${fullName}` : 'Great choice'}
        </p>

        {/* Big headline */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold uppercase text-white tracking-tight leading-[1.05]">
          Your Reservation Is Confirmed
        </h1>

        {/* Confirmation email line */}
        <p className="text-xl sm:text-2xl text-white leading-relaxed pt-2">
          {email ? (
            <>
              We&apos;ve sent a confirmation email to{' '}
              <span className="underline underline-offset-4 decoration-2 break-all">{email}</span>
            </>
          ) : (
            <>We&apos;ve sent you a confirmation email with your booking details.</>
          )}
        </p>
      </div>
    </main>
  )
}
