import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityCalendar } from '@/components/ui/AvailabilityCalendar'
import { ImageGallery } from '@/components/catalogue/ImageGallery'

interface PageProps {
  params: Promise<{ slug: string }>
}

function formatRate(amount: number): string {
  return amount.toLocaleString('en-US')
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !vehicle) {
    notFound()
  }

  // Fetch blocked dates from RPC
  const { data: blockedDatesRaw } = await supabase.rpc('get_blocked_dates', {
    p_vehicle_id: vehicle.id,
  })

  const bookedRanges = (blockedDatesRaw ?? []).map(
    (r: { start_date: string; end_date: string }) => ({
      from: new Date(r.start_date),
      to: new Date(r.end_date),
    })
  )

  // Build full image list with primary first
  const allImages: string[] = []
  if (vehicle.primary_image_url) {
    allImages.push(vehicle.primary_image_url)
  }
  if (Array.isArray(vehicle.image_urls)) {
    for (const url of vehicle.image_urls as string[]) {
      if (url !== vehicle.primary_image_url) {
        allImages.push(url)
      }
    }
  }

  const specs = vehicle.specs as Record<string, string> | null

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Back link */}
        <Link
          href="/catalogue"
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
          Back to Fleet
        </Link>

        {/* Image gallery with clickable thumbnails */}
        <ImageGallery images={allImages} alt={vehicle.name} />

        {/* Vehicle header */}
        <div className="space-y-2">
          {vehicle.category && (
            <p className="text-xs text-brand-muted uppercase tracking-widest">
              {vehicle.category}
            </p>
          )}
          <h1 className="font-display text-4xl font-semibold text-white">
            {vehicle.name}
          </h1>
          {vehicle.description && (
            <p className="text-brand-muted text-base leading-relaxed max-w-2xl pt-2">
              {vehicle.description}
            </p>
          )}
        </div>

        {/* Rates card */}
        {(vehicle.daily_rate || vehicle.weekly_rate || vehicle.monthly_rate) && (
          <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6">
            <h2 className="font-display text-xl font-medium text-white mb-4">
              Rental Rates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {vehicle.daily_rate && (
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted uppercase tracking-wider">Daily</p>
                  <p className="text-2xl font-semibold text-white">
                    AED {formatRate(vehicle.daily_rate)}
                  </p>
                </div>
              )}
              {vehicle.weekly_rate && (
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted uppercase tracking-wider">Weekly</p>
                  <p className="text-2xl font-semibold text-white">
                    AED {formatRate(vehicle.weekly_rate)}
                  </p>
                </div>
              )}
              {vehicle.monthly_rate && (
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted uppercase tracking-wider">Monthly</p>
                  <p className="text-2xl font-semibold text-white">
                    AED {formatRate(vehicle.monthly_rate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Specs section */}
        {specs && Object.keys(specs).length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-medium text-white">
              Specifications
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(specs).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-3 space-y-1"
                >
                  <p className="text-xs text-brand-muted uppercase tracking-wider">
                    {key}
                  </p>
                  <p className="text-sm text-white font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability calendar */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-medium text-white">
            Availability
          </h2>
          <p className="text-sm text-brand-muted">
            View available dates for this vehicle. Booking dates are selected during the reservation process.
          </p>
          <AvailabilityCalendar bookedRanges={bookedRanges} />
        </div>

      </div>
    </main>
  )
}
