'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCurrency } from '@/lib/currency/context'

interface VehicleCardProps {
  slug: string
  name: string
  category: string | null
  primary_image_url: string | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
}

const WHATSAPP_NUMBER = '971588086137'

export function VehicleCard({
  slug,
  name,
  category,
  primary_image_url,
  daily_rate,
  weekly_rate,
  monthly_rate,
}: VehicleCardProps) {
  const { formatPrice } = useCurrency()
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in renting the ${name}.`)}`

  return (
    <div className="group bg-brand-surface border border-brand-border rounded-2xl overflow-hidden card-hover hover:border-brand-border-hover">
      {/* Clickable image + info area */}
      <Link href={`/catalogue/${slug}`} className="block">
        {/* Image area */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl">
          {primary_image_url ? (
            <Image
              src={primary_image_url}
              alt={name}
              fill
              className="object-contain img-zoom"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
              quality={85}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-brand-muted text-sm">No image</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-surface/80 to-transparent pointer-events-none" />
        </div>

        {/* Card content */}
        <div className="p-5 space-y-3">
          <h3 className="font-display text-lg font-semibold text-white leading-snug group-hover:text-brand-cyan transition-colors duration-300">
            {name}
          </h3>

          {(daily_rate || weekly_rate || monthly_rate) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
              {daily_rate && (
                <span className="text-sm text-white/90 font-medium">
                  {formatPrice(daily_rate)}
                  <span className="text-brand-muted text-xs font-normal ml-0.5">/day</span>
                </span>
              )}
              {weekly_rate && (
                <span className="text-sm text-white/90 font-medium">
                  {formatPrice(weekly_rate)}
                  <span className="text-brand-muted text-xs font-normal ml-0.5">/week</span>
                </span>
              )}
              {monthly_rate && (
                <span className="text-sm text-white/90 font-medium">
                  {formatPrice(monthly_rate)}
                  <span className="text-brand-muted text-xs font-normal ml-0.5">/month</span>
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Buttons */}
      <div className="px-5 pb-5 flex gap-3">
        <Link
          href={`/book/${slug}`}
          className="flex-1 text-center py-2.5 rounded-xl bg-brand-cyan text-white text-sm font-semibold hover:bg-brand-cyan-hover shadow-[0_0_20px_rgba(0,153,255,0.15)] hover:shadow-[0_0_30px_rgba(0,153,255,0.25)] transition-all duration-300"
        >
          Book Now
        </Link>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#20BD5A] transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  )
}
