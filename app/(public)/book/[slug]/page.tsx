import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingWizard } from '@/components/booking/BookingWizard'
import { T } from '@/components/ui/T'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('name, daily_rate')
    .eq('slug', slug)
    .single()

  if (!vehicle) return {}

  const title = `Book ${vehicle.name} — LuxeClub Rentals Dubai`
  const description = `Book a ${vehicle.name} in Dubai from AED ${vehicle.daily_rate}/day. Insurance included, delivery all over Dubai. Secure online booking with LuxeClub Rentals.`

  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `https://luxeclubrentals.com/book/${slug}` },
  }
}

export default async function BookingPage({ params }: PageProps) {
  const { slug } = await params

  // Use admin client to bypass RLS for public vehicle queries
  const adminSupabase = createAdminClient()

  const { data: vehicle, error } = await adminSupabase
    .from('vehicles')
    .select('id, slug, name, daily_rate, weekly_rate, monthly_rate, deposit_amount, primary_image_url, is_available')
    .eq('slug', slug)
    .single()

  if (error || !vehicle) {
    notFound()
  }

  // Fetch blocked date ranges via RPC
  const { data: blockedDatesRaw } = await adminSupabase.rpc('get_blocked_dates', {
    p_vehicle_id: vehicle.id,
  })

  const bookedRanges = (blockedDatesRaw ?? []).map(
    (r: { start_date: string; end_date: string }) => ({
      from: new Date(r.start_date),
      to: new Date(r.end_date),
    })
  )

  // Check auth state to determine if Account step is needed
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const isAuthenticated = !!claimsData?.claims

  return (
    <main className="min-h-screen bg-luxury overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Back link */}
        <Link
          href={`/catalogue/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <><T k="booking.backTo" /> {vehicle.name}</>
        </Link>

        {/* Page heading */}
        <div className="space-y-1">
          <p className="text-xs text-brand-muted uppercase tracking-widest"><T k="booking.bookingLabel" /></p>
          <h1 className="font-display text-3xl font-semibold text-white">{vehicle.name}</h1>
        </div>

        {/* Booking wizard */}
        <BookingWizard vehicle={vehicle} bookedRanges={bookedRanges} isAuthenticated={isAuthenticated} />
      </div>
    </main>
  )
}
