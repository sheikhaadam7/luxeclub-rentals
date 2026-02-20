import { VehicleCard } from './VehicleCard'

interface Vehicle {
  slug: string
  name: string
  category: string | null
  primary_image_url: string | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
}

interface VehicleGridProps {
  vehicles: Vehicle[]
}

export function VehicleGrid({ vehicles }: VehicleGridProps) {
  if (vehicles.length === 0) {
    return (
      <div className="col-span-full flex items-center justify-center py-24">
        <p className="text-brand-muted text-base">No vehicles available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.slug} {...vehicle} />
      ))}
    </div>
  )
}
