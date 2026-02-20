import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BookingWizard } from '@/components/booking/BookingWizard'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function BookingPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('id, slug, name, daily_rate, weekly_rate, monthly_rate, deposit_amount, primary_image_url, is_available')
    .eq('slug', slug)
    .single()

  if (error || !vehicle) {
    notFound()
  }

  // Fetch blocked date ranges via RPC
  const { data: blockedDatesRaw } = await supabase.rpc('get_blocked_dates', {
    p_vehicle_id: vehicle.id,
  })

  const bookedRanges = (blockedDatesRaw ?? []).map(
    (r: { start_date: string; end_date: string }) => ({
      from: new Date(r.start_date),
      to: new Date(r.end_date),
    })
  )

  return (
    <main className="min-h-screen bg-luxury">
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
          Back to {vehicle.name}
        </Link>

        {/* Page heading */}
        <div className="space-y-1">
          <p className="text-xs text-brand-muted uppercase tracking-widest">Booking</p>
          <h1 className="font-display text-3xl font-semibold text-white">{vehicle.name}</h1>
        </div>

        {/* Booking wizard */}
        <BookingWizard vehicle={vehicle} bookedRanges={bookedRanges} />
      </div>
    </main>
  )
}
