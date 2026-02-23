import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { VehicleGrid } from '@/components/catalogue/VehicleGrid'
import { T } from '@/components/ui/T'

export const metadata: Metadata = {
  title: 'Luxury Car Fleet',
  description:
    'Browse our collection of luxury cars for rent in Dubai. Lamborghini, Ferrari, Rolls-Royce, Bentley, Range Rover and more. Book online with insurance included.',
  openGraph: {
    title: 'Luxury Car Fleet — LuxeClub Rentals Dubai',
    description:
      'Browse our collection of luxury cars for rent in Dubai. Lamborghini, Ferrari, Rolls-Royce, Bentley and more.',
    url: 'https://www.luxeclubrentals.ae/catalogue',
  },
  alternates: { canonical: 'https://www.luxeclubrentals.ae/catalogue' },
}

const getVehicles = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('vehicles')
      .select('slug, name, category, primary_image_url, image_urls, daily_rate, weekly_rate, monthly_rate')
      .eq('is_available', true)
      .order('name')
    if (error) console.error('Failed to fetch vehicles:', error)
    return data
  },
  ['catalogue-vehicles'],
  { revalidate: 300 },
)

export default async function CataloguePage() {
  const vehicles = await getVehicles()

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-10 space-y-2">
          <h1 className="font-display text-3xl font-semibold text-white tracking-tight">
            <T k="catalogue.ourFleet" />
          </h1>
          <p className="text-brand-muted text-base">
            <T k="catalogue.subtitle" />
          </p>
        </div>
      </div>

      {/* Vehicle grid — full width edge to edge */}
      <VehicleGrid vehicles={vehicles ?? []} />
    </main>
  )
}
