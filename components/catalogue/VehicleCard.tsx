import Image from 'next/image'
import Link from 'next/link'

interface VehicleCardProps {
  slug: string
  name: string
  category: string | null
  primary_image_url: string | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
}

function formatRate(amount: number): string {
  return amount.toLocaleString('en-US')
}

export function VehicleCard({
  slug,
  name,
  category,
  primary_image_url,
  daily_rate,
  weekly_rate,
  monthly_rate,
}: VehicleCardProps) {
  return (
    <Link
      href={`/catalogue/${slug}`}
      className="group block bg-brand-surface border border-brand-border rounded-[--radius-card] overflow-hidden hover:border-brand-cyan/30 transition-colors duration-200"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] w-full bg-brand-black">
        {primary_image_url ? (
          <Image
            src={primary_image_url}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-brand-muted text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4 space-y-3">
        {/* Category badge */}
        {category && (
          <p className="text-xs text-brand-muted uppercase tracking-widest">
            {category}
          </p>
        )}

        {/* Vehicle name */}
        <h3 className="font-display text-lg font-semibold text-white leading-snug group-hover:text-brand-cyan transition-colors duration-200">
          {name}
        </h3>

        {/* Rates */}
        {(daily_rate || weekly_rate || monthly_rate) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {daily_rate && (
              <span className="text-sm text-white/80">
                AED {formatRate(daily_rate)}
                <span className="text-brand-muted text-xs">/day</span>
              </span>
            )}
            {weekly_rate && (
              <span className="text-sm text-white/80">
                AED {formatRate(weekly_rate)}
                <span className="text-brand-muted text-xs">/week</span>
              </span>
            )}
            {monthly_rate && (
              <span className="text-sm text-white/80">
                AED {formatRate(monthly_rate)}
                <span className="text-brand-muted text-xs">/month</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
