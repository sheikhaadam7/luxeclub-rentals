import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AvailabilityCalendar } from '@/components/ui/AvailabilityCalendar'
import { ImageGallery } from '@/components/catalogue/ImageGallery'
import { PriceDisplay } from '@/components/catalogue/PriceDisplay'
import { T } from '@/components/ui/T'

/** Map a free-form DB spec key to a translation key (spec.*) */
const SPEC_KEY_MAP: Record<string, string> = {
  engine: 'spec.engine',
  'engine type': 'spec.engine',
  horsepower: 'spec.horsepower',
  hp: 'spec.horsepower',
  torque: 'spec.torque',
  transmission: 'spec.transmission',
  seats: 'spec.seats',
  doors: 'spec.doors',
  fuel: 'spec.fuel',
  'fuel type': 'spec.fuelType',
  fueltype: 'spec.fuelType',
  year: 'spec.year',
  color: 'spec.color',
  colour: 'spec.colour',
  'top speed': 'spec.topSpeed',
  topspeed: 'spec.topSpeed',
  '0-100 km/h': 'spec.acceleration',
  '0 - 100 km/h': 'spec.acceleration',
  '0-100': 'spec.acceleration',
  acceleration: 'spec.acceleration',
  drivetrain: 'spec.drivetrain',
  'body type': 'spec.bodyType',
  bodytype: 'spec.bodyType',
  cylinders: 'spec.cylinders',
  displacement: 'spec.displacement',
  power: 'spec.power',
  interior: 'spec.interior',
  'exterior color': 'spec.exteriorColor',
  'exterior colour': 'spec.exteriorColor',
  'interior color': 'spec.interiorColor',
  'interior colour': 'spec.interiorColor',
}

/** Map common DB spec values to translation keys (specVal.*) */
const SPEC_VAL_MAP: Record<string, string> = {
  // Colors
  black: 'specVal.black',
  white: 'specVal.white',
  red: 'specVal.red',
  blue: 'specVal.blue',
  'baby blue': 'specVal.babyBlue',
  silver: 'specVal.silver',
  grey: 'specVal.grey',
  gray: 'specVal.grey',
  gold: 'specVal.gold',
  green: 'specVal.green',
  'signal green': 'specVal.signalGreen',
  'verde scandal green': 'specVal.verdeScandal',
  brown: 'specVal.brown',
  yellow: 'specVal.yellow',
  'sao paulo yellow': 'specVal.saoPauloYellow',
  orange: 'specVal.orange',
  beige: 'specVal.beige',
  bronze: 'specVal.bronze',
  burgundy: 'specVal.burgundy',
  champagne: 'specVal.champagne',
  // Engine types
  v6: 'specVal.v6',
  'v6 twin-turbo': 'specVal.v6TwinTurbo',
  v8: 'specVal.v8',
  'v8 bi-turbo': 'specVal.v8BiTurbo',
  v12: 'specVal.v12',
  // Seats
  '2 seats': 'specVal.2seats',
  '4 seats': 'specVal.4seats',
  '5 seats': 'specVal.5seats',
  '7 seats': 'specVal.7seats',
  // Transmission
  automatic: 'specVal.automatic',
  manual: 'specVal.manual',
  'semi-automatic': 'specVal.semiAutomatic',
  // Fuel
  petrol: 'specVal.petrol',
  gasoline: 'specVal.petrol',
  diesel: 'specVal.diesel',
  electric: 'specVal.electric',
  hybrid: 'specVal.hybrid',
  // Drivetrain
  awd: 'specVal.awd',
  rwd: 'specVal.rwd',
  fwd: 'specVal.fwd',
  '4wd': 'specVal.awd',
  'all-wheel drive': 'specVal.awd',
  'rear-wheel drive': 'specVal.rwd',
  'front-wheel drive': 'specVal.fwd',
  // Body
  sedan: 'specVal.sedan',
  suv: 'specVal.suv',
  coupe: 'specVal.coupe',
  coupé: 'specVal.coupe',
  convertible: 'specVal.convertible',
  hatchback: 'specVal.hatchback',
  // Interior
  leather: 'specVal.leather',
}

function SpecLabel({ label }: { label: string }) {
  const translationKey = SPEC_KEY_MAP[label.toLowerCase()]
  if (translationKey) return <T k={translationKey} />
  return <>{label}</>
}

function SpecValue({ value }: { value: string }) {
  const translationKey = SPEC_VAL_MAP[value.toLowerCase().trim()]
  if (translationKey) return <T k={translationKey} />
  return <>{value}</>
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('name, daily_rate, primary_image_url, category')
    .eq('slug', slug)
    .single()

  if (!vehicle) return { title: 'Vehicle Not Found' }

  const title = `Rent ${vehicle.name} in Dubai`
  const description = `Rent a ${vehicle.name} in Dubai from AED ${vehicle.daily_rate?.toLocaleString('en-US') ?? ''}/day. Insurance included, free delivery available. Book online with LuxeClub Rentals.`
  const url = `https://www.luxeclubrentals.ae/catalogue/${slug}`

  return {
    title,
    description,
    openGraph: {
      title: `${title} — LuxeClub Rentals`,
      description,
      url,
      images: vehicle.primary_image_url ? [{ url: vehicle.primary_image_url, width: 1200, height: 630, alt: vehicle.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — LuxeClub Rentals`,
      description,
      images: vehicle.primary_image_url ? [vehicle.primary_image_url] : undefined,
    },
    alternates: { canonical: url },
  }
}

/** Derive a car type label from the vehicle name (mirrors VehicleGrid logic) */
function deriveCarType(name: string): string {
  const lower = name.toLowerCase()
  const convertibleKw = ['spyder', 'spider', 'dawn', 'gtc', 'cabriolet', 'cabrio', 'roadster', 'convertible', 'portofino']
  if (convertibleKw.some((kw) => lower.includes(kw))) return 'Convertible Cars'
  const suvKw = ['range rover', 'vogue', 'cayenne', 'bentayga', 'cullinan', 'escalade', 'dbx', 'rsq8', 'sq7', 'sq8', 'g63', 'gle', 'gls', 'x5', 'x7', 'urus', 'levante', 'macan', 'purosangue', 'x6']
  if (suvKw.some((kw) => lower.includes(kw))) return 'SUV Cars'
  return 'Sports Cars'
}

const WHATSAPP_NUMBER = '971588086137'

export default async function VehicleDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createAdminClient()

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
  const carType = vehicle.category || deriveCarType(vehicle.name)
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in renting the ${vehicle.name}.`)}`
  const callUrl = `tel:+${WHATSAPP_NUMBER}`

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: vehicle.name,
    description: `Rent a ${vehicle.name} in Dubai with LuxeClub Rentals. Insurance included, free delivery available.`,
    image: allImages[0],
    brand: { '@type': 'Brand', name: vehicle.name.split(' ')[0] },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'AED',
      price: vehicle.daily_rate,
      availability: vehicle.is_available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'LuxeClub Rentals' },
    },
  }

  return (
    <main className="min-h-screen bg-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back link */}
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-white transition-colors duration-300 mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <T k="vehicle.backToFleet" />
        </Link>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left — Gallery */}
          <div className="flex-1 min-w-0">
            <ImageGallery images={allImages} alt={vehicle.name} />
          </div>

          {/* Right — Details panel */}
          <aside className="w-full lg:w-[420px] flex-shrink-0">
            <div className="lg:sticky lg:top-24 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 space-y-6">

              {/* Category */}
              <p className="text-sm text-white/60 font-medium">{carType}</p>

              {/* Name */}
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">
                {vehicle.name}
              </h1>

              {/* Daily rate */}
              {vehicle.daily_rate && (
                <p className="text-white">
                  <PriceDisplay amount={vehicle.daily_rate} className="text-2xl font-bold" />
                  <span className="text-white/50 text-base ml-1.5"><T k="vehicle.daily" /></span>
                </p>
              )}

              {/* Info badges */}
              <div className="space-y-1.5">
                <p className="text-sm text-white/80">
                  <span className="mr-2">&#x2139;&#xFE0F;</span><T k="vehicle.insuranceIncluded" />
                </p>
                <p className="text-sm text-white/80">
                  <span className="mr-2">&#x1F911;</span><T k="vehicle.cryptoAccepted" />
                </p>
              </div>

              {/* Separator */}
              <div className="h-px bg-white/[0.08]" />

              {/* Detail rows */}
              <div className="space-y-4">
                {vehicle.daily_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60"><T k="vehicle.deposit" /></span>
                    <PriceDisplay amount={vehicle.daily_rate} className="text-sm font-bold text-green-400" />
                  </div>
                )}

                {vehicle.daily_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60"><T k="vehicle.includedMileageLimit" /></span>
                    <span className="text-sm font-bold text-white"><T k="vehicle.mileagePerDay" /></span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60"><T k="vehicle.additionalMileageCharge" /></span>
                  <PriceDisplay amount={20} className="text-sm font-bold text-white" suffix="/Km" exact />
                </div>

                {/* Weekly / Monthly rates if available */}
                {vehicle.weekly_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60"><T k="vehicle.weeklyRate" /></span>
                    <PriceDisplay amount={vehicle.weekly_rate} className="text-sm font-bold text-white" />
                  </div>
                )}
                {vehicle.monthly_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60"><T k="vehicle.monthlyRate" /></span>
                    <PriceDisplay amount={vehicle.monthly_rate} className="text-sm font-bold text-white" />
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="h-px bg-white/[0.08]" />

              {/* CTA buttons */}
              <div className="flex gap-3">
                <a
                  href={callUrl}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/[0.12] text-white text-sm font-semibold hover:bg-white/[0.06] transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <T k="vehicle.call" />
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#20BD5A] transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <T k="vehicle.whatsapp" />
                </a>
              </div>

              {/* Book Now */}
              {vehicle.is_available ? (
                <Link
                  href={`/book/${vehicle.slug}`}
                  className="block w-full text-center bg-brand-cyan text-white font-semibold py-3.5 rounded-xl hover:bg-brand-cyan-hover shadow-[0_0_20px_rgba(201,169,110,0.15)] hover:shadow-[0_0_30px_rgba(201,169,110,0.25)] transition-all duration-300"
                >
                  <T k="vehicle.bookNow" />
                </Link>
              ) : (
                <p className="text-center text-sm text-brand-muted py-2">
                  <T k="vehicle.currentlyUnavailable" />
                </p>
              )}

              {/* Trust badges */}
              <div className="flex items-center justify-between pt-2 text-white/40">
                <div className="flex items-center gap-1.5 text-xs">
                  <svg className="w-3.5 h-3.5 text-green-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <T k="vehicle.fullyInsured" />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <T k="vehicle.support247" />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <svg className="w-3.5 h-3.5 text-amber-400/60" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <T k="vehicle.rated" />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Specs section — exclude rental term fields */}
        {specs && Object.keys(specs).length > 0 && (() => {
          const RENTAL_TERM_KEYS = ['deposit', 'daily km limit', 'additional mileage charge', 'mileage limit', 'included mileage', 'extra mileage']
          const filteredSpecs = Object.entries(specs).filter(
            ([key]) => !RENTAL_TERM_KEYS.some((rk) => key.toLowerCase().includes(rk))
          )
          return filteredSpecs.length > 0 ? (
            <div className="mt-12 space-y-4">
              <h2 className="font-display text-xl font-medium text-white">
                <T k="vehicle.specifications" />
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredSpecs.map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 space-y-1"
                  >
                    <p className="text-xs text-white/40 uppercase tracking-wider"><SpecLabel label={key} /></p>
                    <p className="text-sm text-white font-medium"><SpecValue value={value} /></p>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        })()}

        {/* Rental Terms section */}
        <div className="mt-12 space-y-4">
          <h2 className="font-display text-xl font-medium text-white">
            <T k="vehicle.rentalTerms" />
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 space-y-4">
            {vehicle.daily_rate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60"><T k="vehicle.securityDeposit" /></span>
                <PriceDisplay amount={vehicle.daily_rate} className="text-sm font-bold text-green-400" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60"><T k="vehicle.includedMileage" /></span>
              <span className="text-sm font-bold text-white"><T k="vehicle.mileagePerDay" /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60"><T k="vehicle.additionalMileage" /></span>
              <PriceDisplay amount={20} className="text-sm font-bold text-white" suffix="/Km" exact />
            </div>
            <div className="h-px bg-white/[0.06]" />
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>&#x2139;&#xFE0F;</span>
              <span><T k="vehicle.insuranceIncludedAll" /></span>
            </div>
          </div>
        </div>

        {/* Availability calendar */}
        <div className="mt-12 space-y-4">
          <h2 className="font-display text-xl font-medium text-white">
            <T k="vehicle.availability" />
          </h2>
          <p className="text-sm text-brand-muted">
            <T k="vehicle.availabilityDesc" />
          </p>
          <AvailabilityCalendar bookedRanges={bookedRanges} />
        </div>

      </div>
    </main>
  )
}
