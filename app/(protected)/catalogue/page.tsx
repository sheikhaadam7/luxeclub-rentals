import { createClient } from '@/lib/supabase/server'
import { VehicleGrid } from '@/components/catalogue/VehicleGrid'

export default async function CataloguePage() {
  const supabase = await createClient()

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
