import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { moneyPages, getMoneyPage, SITE_URL } from '@/lib/money-pages'
import { guides } from '@/lib/guides'
import { VehicleCard } from '@/components/catalogue/VehicleCard'

// ---------------------------------------------------------------------------
// Navigation links for cross-linking between money pages
// ---------------------------------------------------------------------------

const BRAND_LINKS = [
  { label: 'Lamborghini', slug: 'rent-lamborghini-in-dubai' },
  { label: 'Ferrari', slug: 'rent-ferrari-in-dubai' },
  { label: 'Rolls Royce', slug: 'rent-rolls-royce-in-dubai' },
  { label: 'Bentley', slug: 'rent-bentley-in-dubai' },
  { label: 'Porsche', slug: 'rent-porsche-in-dubai' },
  { label: 'Mercedes', slug: 'rent-mercedes-in-dubai' },
  { label: 'Range Rover', slug: 'rent-range-rover-in-dubai' },
  { label: 'McLaren', slug: 'rent-mclaren-in-dubai' },
  { label: 'Aston Martin', slug: 'rent-aston-martin-in-dubai' },
  { label: 'BMW', slug: 'rent-bmw-in-dubai' },
  { label: 'Audi', slug: 'rent-audi-in-dubai' },
  { label: 'Maserati', slug: 'rent-maserati-in-dubai' },
  { label: 'Cadillac', slug: 'rent-cadillac-in-dubai' },
] as const

const TYPE_LINKS = [
  { label: 'Sports Cars', slug: 'rent-sports-car-in-dubai' },
  { label: 'SUVs', slug: 'rent-luxury-suv-in-dubai' },
  { label: 'Convertibles', slug: 'rent-convertible-in-dubai' },
] as const

// ---------------------------------------------------------------------------
// Brand & type extraction (mirrors VehicleGrid logic)
// ---------------------------------------------------------------------------

const MULTI_WORD_BRANDS = ['Aston Martin', 'Range Rover', 'Rolls Royce']

function extractBrand(name: string): string {
  const lower = name.toLowerCase()
  for (const brand of MULTI_WORD_BRANDS) {
    if (lower.startsWith(brand.toLowerCase())) return brand
  }
  if (lower.includes('mercedes') || lower.includes('amg') || lower.startsWith('g63')) {
    return 'Mercedes'
  }
  const firstWord = name.split(' ')[0] ?? name
  return firstWord
}

const SUV_KEYWORDS = [
  'range rover', 'vogue', 'cayenne', 'bentayga', 'cullinan',
  'escalade', 'dbx', 'rsq8', 'sq7', 'sq8', 'g63', 'gle',
  'gls', 'x5', 'x7', 'urus', 'levante', 'macan', 'trackhawk',
  'purosangue', 'x6',
]

const CONVERTIBLE_KEYWORDS = [
  'spyder', 'spider', 'dawn', 'gtc', 'cabriolet', 'cabrio',
  'roadster', 'convertible', 'carrera s spyder', 'portofino',
]

function extractCarType(name: string): 'SUV' | 'Convertible' | 'Sports' {
  const lower = name.toLowerCase()
  if (CONVERTIBLE_KEYWORDS.some((kw) => lower.includes(kw))) return 'Convertible'
  if (SUV_KEYWORDS.some((kw) => lower.includes(kw))) return 'SUV'
  return 'Sports'
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface Vehicle {
  slug: string
  name: string
  category: string | null
  primary_image_url: string | null
  image_urls: string[] | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
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
    return (data ?? []) as Vehicle[]
  },
  ['money-page-vehicles'],
  { revalidate: 300 },
)

function filterVehicles(vehicles: Vehicle[], filter: { type: string; value: string }): Vehicle[] {
  if (filter.type === 'brand') {
    return vehicles.filter((v) => extractBrand(v.name).toLowerCase() === filter.value.toLowerCase())
  }
  if (filter.type === 'type') {
    return vehicles.filter((v) => extractCarType(v.name) === filter.value)
  }
  // keyword — show all vehicles
  return vehicles
}

// ---------------------------------------------------------------------------
// Section rendering helpers (mirrors guides pattern)
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** Render a content string as paragraphs, supporting **bold** markers. */
function renderParagraphs(content: string) {
  return content.split(/\n\n+/).map((para, i) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    return (
      <p
        key={i}
        className="text-[15px] text-brand-muted leading-relaxed max-w-3xl mb-4 last:mb-0"
      >
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="text-white font-medium">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          ),
        )}
      </p>
    )
  })
}

// ---------------------------------------------------------------------------
// Static params & metadata
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return moneyPages.map((p) => ({ slug: p.slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getMoneyPage(slug)
  if (!page) return {}

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `${SITE_URL}/${page.slug}`,
    },
    alternates: { canonical: `${SITE_URL}/${page.slug}` },
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function MoneyPage({ params }: PageProps) {
  const { slug } = await params
  const page = getMoneyPage(slug)
  if (!page) notFound()

  const allVehicles = await getVehicles()
  const vehicles = filterVehicles(allVehicles, page.filter)

  // FAQ sections → FAQPage schema (only if page has any isFaq sections)
  const faqSections = (page.sections ?? []).filter((s) => s.isFaq)
  const faqJsonLd =
    faqSections.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqSections.map((s) => ({
            '@type': 'Question',
            name: s.heading,
            acceptedAnswer: {
              '@type': 'Answer',
              text: s.content.replace(/\*\*/g, '').slice(0, 500),
            },
          })),
        }
      : null

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: page.metaTitle,
      description: page.metaDescription,
      url: `${SITE_URL}/${page.slug}`,
      provider: {
        '@type': 'LocalBusiness',
        name: 'LuxeClub Rentals',
        url: SITE_URL,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: page.title, item: `${SITE_URL}/${page.slug}` },
      ],
    },
    ...vehicles.slice(0, 10).map((v) => ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: v.name,
      image: v.primary_image_url,
      url: `${SITE_URL}/catalogue/${v.slug}`,
      offers: v.daily_rate
        ? {
            '@type': 'Offer',
            priceCurrency: 'AED',
            price: v.daily_rate,
            availability: 'https://schema.org/InStock',
          }
        : undefined,
    })),
    ...(faqJsonLd ? [faqJsonLd] : []),
  ]

  return (
    <main className="min-h-screen bg-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 space-y-4">
        <nav className="text-sm text-brand-muted">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{page.title}</span>
        </nav>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight">
          {page.heading}
        </h1>
        <p className="text-lg sm:text-xl text-brand-muted max-w-2xl">
          {page.subheading}
        </p>
        <p className="text-base text-white/70 max-w-3xl leading-relaxed">
          {page.content}
        </p>
      </section>

      {/* Long-form content sections — brand pages only */}
      {page.sections && page.sections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
          {page.sections.map((section) => (
            <div key={section.heading} className="space-y-3">
              <h2
                id={slugify(section.heading)}
                className="font-display text-xl sm:text-2xl font-medium text-white scroll-mt-24"
              >
                {section.heading}
              </h2>
              <div>{renderParagraphs(section.content)}</div>
            </div>
          ))}
        </section>
      )}

      {/* Browse by Brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Browse by Brand</p>
          <div className="flex flex-wrap gap-2">
            {BRAND_LINKS.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className={`px-4 py-2 text-sm font-medium rounded-none border whitespace-nowrap transition-all duration-200 ${
                  slug === b.slug
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-white/60 border-white/[0.12] hover:text-white hover:border-white/30'
                }`}
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Browse by Type</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_LINKS.map((t) => (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className={`px-4 py-2 text-sm font-medium rounded-none border whitespace-nowrap transition-all duration-200 ${
                  slug === t.slug
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-white/60 border-white/[0.12] hover:text-white hover:border-white/30'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle count */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <p className="text-[13px] text-brand-muted">
          {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} available
        </p>
      </div>

      {/* Vehicle grid */}
      {vehicles.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-brand-muted text-sm">No vehicles available in this category right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-brand-border">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.slug} {...vehicle} />
          ))}
        </div>
      )}

      {/* Helpful Guides */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4 space-y-6">
        <h2 className="font-display text-xl font-medium text-white">Helpful Guides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {guides.slice(0, 3).map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="group bg-white/[0.03] border border-white/[0.08] p-5 space-y-2 hover:border-white/20 transition-all duration-300"
            >
              <p className="text-xs text-white/40">
                {new Date(g.publishedDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <h3 className="text-sm font-medium text-white group-hover:text-brand-cyan transition-colors duration-300 line-clamp-2">
                {g.title}
              </h3>
              <p className="text-xs text-white/50 line-clamp-2">{g.metaDescription}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
          Ready to drive?
        </h2>
        <p className="text-brand-muted max-w-xl mx-auto">
          Every rental includes comprehensive insurance, delivery across Dubai, and a full handover walkthrough. No hidden fees.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/catalogue"
            className="px-8 py-3 bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
          >
            Browse Full Fleet
          </Link>
          <a
            href="https://wa.me/971588086137?text=Hi%2C%20I%27m%20interested%20in%20renting%20a%20car."
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border border-white/20 text-white font-medium text-sm hover:border-white/40 transition-colors"
          >
            WhatsApp Us
          </a>
        </div>
      </section>
    </main>
  )
}
