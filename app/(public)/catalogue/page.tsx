import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { VehicleGrid } from '@/components/catalogue/VehicleGrid'

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

export default async function CataloguePage() {
  const supabase = createAdminClient()

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('slug, name, category, primary_image_url, daily_rate, weekly_rate, monthly_rate')
    .eq('is_available', true)
    .order('name')

  if (error) {
    console.error('Failed to fetch vehicles:', error)
  }

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-10 space-y-2">
          <h1 className="font-display text-3xl font-semibold text-white tracking-tight">
            Our Fleet
          </h1>
          <p className="text-brand-muted text-base">
            Explore our collection of luxury vehicles
          </p>
        </div>

        {/* Vehicle grid */}
        <VehicleGrid vehicles={vehicles ?? []} />
      </div>
    </main>
  )
}
