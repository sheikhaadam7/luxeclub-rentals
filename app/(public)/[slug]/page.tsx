import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { moneyPages, getMoneyPage, SITE_URL } from '@/lib/money-pages'
import { guides } from '@/lib/guides'
import { VehicleCard } from '@/components/catalogue/VehicleCard'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { HoloIconCard } from '@/components/ui/HoloIconCard'

// ---------------------------------------------------------------------------
// Navigation links for cross-linking between money pages
// ---------------------------------------------------------------------------

const BRAND_LINKS = [
  { label: 'Lamborghini', slug: 'rent-lamborghini-in-dubai', logo: '/logos/brands/lamborghini.svg' },
  { label: 'Ferrari', slug: 'rent-ferrari-in-dubai', logo: '/logos/brands/ferrari.svg' },
  { label: 'Rolls Royce', slug: 'rent-rolls-royce-in-dubai', logo: '/logos/brands/rolls-royce.svg' },
  { label: 'Bentley', slug: 'rent-bentley-in-dubai', logo: '/logos/brands/bentley.svg' },
  { label: 'Porsche', slug: 'rent-porsche-in-dubai', logo: '/logos/brands/porsche.svg' },
  { label: 'Mercedes', slug: 'rent-mercedes-in-dubai', logo: '/logos/brands/mercedes.svg' },
  { label: 'Range Rover', slug: 'rent-range-rover-in-dubai', logo: '/logos/brands/range-rover.svg' },
  { label: 'McLaren', slug: 'rent-mclaren-in-dubai', logo: '/logos/brands/mclaren.svg' },
  { label: 'Aston Martin', slug: 'rent-aston-martin-in-dubai', logo: '/logos/brands/aston-martin.svg' },
  { label: 'BMW', slug: 'rent-bmw-in-dubai', logo: '/logos/brands/bmw.svg' },
  { label: 'Audi', slug: 'rent-audi-in-dubai', logo: '/logos/brands/audi.svg' },
  { label: 'Maserati', slug: 'rent-maserati-in-dubai', logo: '/logos/brands/maserati.svg' },
  { label: 'Cadillac', slug: 'rent-cadillac-in-dubai', logo: '/logos/brands/cadillac.svg' },
] as const

const TYPE_LINKS = [
  { label: 'Sports Cars', slug: 'rent-sports-car-in-dubai' },
  { label: 'SUVs', slug: 'rent-luxury-suv-in-dubai' },
  { label: 'Convertibles', slug: 'rent-convertible-in-dubai' },
] as const

const KEYWORD_LINKS = [
  { label: 'Car Rental Dubai', slug: 'car-rental-dubai' },
  { label: 'Luxury Cars', slug: 'rent-luxury-car-in-dubai' },
  { label: 'Supercars', slug: 'rent-supercar-in-dubai' },
  { label: 'Exotic Cars', slug: 'rent-exotic-car-in-dubai' },
  { label: 'No Deposit', slug: 'luxury-car-rental-no-deposit-dubai' },
  { label: 'Affordable', slug: 'rent-cheap-car-in-dubai' },
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

/** Render a content string as paragraphs, supporting **bold** markers,
 *  ==highlight== markers (uppercase brand-cyan emphasis),
 *  [text](url) markdown links, and `- item` bullet lists (a paragraph
 *  where every newline-separated line starts with `- `). A paragraph
 *  consisting solely of a single **...** block is treated as an H3. */
const INLINE_PATTERN = /(\*\*[^*]+\*\*|==[^=]+==|\[[^\]]+\]\([^)]+\))/g
const LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)$/

function renderInline(text: string, keyPrefix: string | number): React.ReactNode[] {
  const parts = text.split(INLINE_PATTERN).filter(Boolean)
  return parts.map((part, j) => {
    const k = `${keyPrefix}-${j}`
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={k} className="text-white font-medium">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('==') && part.endsWith('==')) {
      return (
        <strong
          key={k}
          className="text-brand-cyan font-bold uppercase tracking-wider"
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    const linkMatch = LINK_PATTERN.exec(part)
    if (linkMatch) {
      const [, label, href] = linkMatch
      return (
        <Link key={k} href={href} className="text-brand-cyan underline underline-offset-4 hover:text-white transition-colors">
          {label}
        </Link>
      )
    }
    return <span key={k}>{part}</span>
  })
}

function renderParagraphs(content: string) {
  return content.split(/\n\n+/).map((para, i) => {
    const trimmed = para.trim()
    const soloBoldMatch = /^\*\*([^*]+)\*\*$/.exec(trimmed)
    if (soloBoldMatch) {
      return (
        <h3
          key={i}
          className="font-display text-lg sm:text-xl font-semibold text-white mt-6 mb-3 first:mt-0"
        >
          {soloBoldMatch[1]}
        </h3>
      )
    }
    // Bullet list: paragraph where every newline-separated line starts with "- "
    const lines = trimmed.split('\n')
    if (lines.length > 1 && lines.every((line) => line.startsWith('- '))) {
      return (
        <ul
          key={i}
          className="list-disc pl-6 space-y-2 text-[15px] text-brand-muted leading-relaxed max-w-3xl mb-4 last:mb-0 marker:text-brand-cyan"
        >
          {lines.map((line, k) => (
            <li key={k}>{renderInline(line.slice(2), `${i}-${k}`)}</li>
          ))}
        </ul>
      )
    }
    return (
      <p
        key={i}
        className="text-[15px] text-brand-muted leading-relaxed max-w-3xl mb-4 last:mb-0"
      >
        {renderInline(para, i)}
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
      type: 'website',
      siteName: 'LuxeClub Rentals',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: page.metaTitle }],
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
              text: s.content.replace(/\*\*/g, ''),
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
      author: {
        '@type': 'Organization',
        name: 'LuxeClub Editorial',
        url: `${SITE_URL}/about`,
      },
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
      description: `Rent a ${v.name} in Dubai with LuxeClub Rentals. Insurance included, delivery across Dubai.`,
      image: v.primary_image_url,
      url: `${SITE_URL}/catalogue/${v.slug}`,
      sku: v.slug,
      productID: v.slug,
      brand: { '@type': 'Brand', name: extractBrand(v.name) },
      offers: v.daily_rate
        ? {
            '@type': 'Offer',
            priceCurrency: 'AED',
            price: v.daily_rate,
            url: `${SITE_URL}/catalogue/${v.slug}`,
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: 'LuxeClub Rentals' },
          }
        : undefined,
    })),
    ...(faqJsonLd ? [faqJsonLd] : []),
  ]

  // Long-form sections block — extracted so we can place it before or after
  // the vehicle grid depending on `page.sectionsBeforeGrid`.
  const sectionsBlock =
    page.sections && page.sections.length > 0
      ? (() => {
          const bodySections = page.sections!.filter((s) => !s.isFaq)
          const faqSections = page.sections!.filter((s) => s.isFaq)
          const guidesBlock = (
            <section className="space-y-6 pt-2 pb-2">
              <h2 className="font-display text-xl font-medium text-white">
                <Link href="/guides" className="hover:text-brand-cyan transition-colors duration-300">
                  Take a Look at Our Guides
                </Link>
              </h2>
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
          )
          return (
            <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 space-y-8">
              <div className="border-t border-brand-border pt-8">
                <p className="text-xs uppercase tracking-wider text-brand-muted mb-6">
                  About {page.heading}
                </p>
              </div>

              {(() => {
                const guidesIndex = Math.min(
                  page.guidesAfterSectionIndex ?? 0,
                  Math.max(bodySections.length - 1, 0),
                )
                return bodySections.map((section, i) => (
                <div key={section.heading}>
                  <div className="space-y-3">
                    <h2
                      id={slugify(section.heading)}
                      className="font-display text-xl sm:text-2xl font-medium text-white scroll-mt-24"
                    >
                      {section.heading}
                    </h2>
                    {section.image && (
                      <div className="relative w-full max-w-3xl aspect-[16/9] rounded-xl overflow-hidden">
                        <img
                          src={section.image}
                          alt={section.imageAlt || section.heading}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>{renderParagraphs(section.content)}</div>
                    {section.whatsapp && (
                      <div className="pt-2">
                        <a
                          href={section.whatsapp.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1ebe57] transition-colors duration-200"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488" />
                          </svg>
                          {section.whatsapp.label}
                        </a>
                      </div>
                    )}
                  </div>
                  {i === guidesIndex && guidesBlock}
                </div>
                ))
              })()}

              {faqSections.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h2
                    id="frequently-asked-questions"
                    className="font-display text-xl sm:text-2xl font-medium text-white scroll-mt-24"
                  >
                    Frequently Asked Questions
                  </h2>
                  <FaqAccordion
                    items={faqSections.map((s) => ({
                      question: s.heading,
                      answer: <div>{renderParagraphs(s.content)}</div>,
                    }))}
                  />
                </div>
              )}
            </section>
          )
        })()
      : null

  // Icon grid — only rendered on /luxury-car-rental-no-deposit-dubai
  const iconGridItems = [
    {
      title: 'Comprehensive Insurance',
      subtitle: 'Bundled into every rate, all 7 emirates',
      iconPath:
        'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    },
    {
      title: 'Delivery Across Dubai',
      subtitle: 'To your hotel, apartment, or DXB',
      iconPath:
        'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
    },
    {
      title: 'Instant Booking Confirmation',
      subtitle: 'Reserve today',
      iconPath:
        'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
    },
    {
      title: 'No-Deposit Option',
      subtitle: '(T&C APPLY)',
      iconPath:
        'M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
    },
    {
      title: 'WhatsApp Support',
      subtitle: 'Real humans, real fast',
      iconPath:
        'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
    },
    {
      title: 'Crypto Payments Accepted',
      subtitle: 'USDT / BTC / ETH',
      iconPath:
        'M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.687 4.5h2.625c1.395 0 2.531 1.005 2.531 2.25 0 .54-.221 1.038-.591 1.42.804.396 1.341 1.197 1.341 2.143 0 1.353-1.207 2.437-2.7 2.437h-.337v1.125h-1.5v-1.125h-.75v1.125h-1.5v-1.125h-1.219V13.5h1.219V9.75H8.625V8.25h1.687V6.75zm1.5 1.5v1.5h1.594c.467 0 .844-.337.844-.75 0-.413-.377-.75-.844-.75H11.813zm0 3v1.5h1.781c.518 0 .938-.337.938-.75 0-.413-.42-.75-.938-.75h-1.781z',
    },
  ]
  const iconGridSection =
    slug === 'luxury-car-rental-no-deposit-dubai' ? (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-medium text-white mb-3">
            Every Rental Includes
          </h2>
          <div className="w-16 h-px bg-brand-cyan mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {iconGridItems.map((item) => (
            <HoloIconCard
              key={item.title}
              iconPath={item.iconPath}
              title={item.title}
              subtitle={item.subtitle}
            />
          ))}
        </div>
      </section>
    ) : null

  return (
    <main className="min-h-screen bg-luxury">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

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
        <div className="text-base text-white/70 max-w-3xl leading-relaxed space-y-4">
          {page.content.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        {page.sectionsBeforeGrid && (
          <a
            href="#fleet"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-cyan hover:text-white transition-colors duration-300 pt-2"
          >
            Skip to fleet
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        )}
      </section>

      {/* Icon grid + long-form sections — only when sectionsBeforeGrid is set */}
      {page.sectionsBeforeGrid && iconGridSection}
      {page.sectionsBeforeGrid && sectionsBlock}

      {/* Browse by Brand */}
      <div
        id={page.sectionsBeforeGrid ? 'fleet' : undefined}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-4 scroll-mt-24"
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Browse by Brand</p>
          <div className="flex flex-wrap gap-2">
            {BRAND_LINKS.map((b) => {
              const active = slug === b.slug
              return (
                <Link
                  key={b.slug}
                  href={`/${b.slug}`}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-none border whitespace-nowrap transition-all duration-200 ${
                    active
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-white/60 border-white/[0.12] hover:text-white hover:border-white/30'
                  }`}
                >
                  <img
                    src={b.logo}
                    alt=""
                    aria-hidden="true"
                    width={26}
                    height={26}
                    className={`h-[26px] w-[26px] object-contain shrink-0 ${active ? '' : 'opacity-90'}`}
                  />
                  {b.label}
                </Link>
              )
            })}
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
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Popular Searches</p>
          <div className="flex flex-wrap gap-2">
            {KEYWORD_LINKS.map((k) => (
              <Link
                key={k.slug}
                href={`/${k.slug}`}
                className={`px-4 py-2 text-sm font-medium rounded-none border whitespace-nowrap transition-all duration-200 ${
                  slug === k.slug
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-white/60 border-white/[0.12] hover:text-white hover:border-white/30'
                }`}
              >
                {k.label}
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

      {/* Long-form sections — default placement (below the grid so cars are seen first) */}
      {!page.sectionsBeforeGrid && sectionsBlock}

      {/* Guides fallback — shown on pages that have no long-form sections yet */}
      {(!page.sections || page.sections.length === 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4 space-y-6">
          <h2 className="font-display text-xl font-medium text-white">
            <Link href="/guides" className="hover:text-brand-cyan transition-colors duration-300">
              Take a Look at Our Guides
            </Link>
          </h2>
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
      )}

      {/* CTA section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
          Ready to drive?
        </h2>
        <p className="text-brand-muted max-w-xl mx-auto">
          Every rental includes comprehensive insurance and a full handover walkthrough. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge. No hidden fees.
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
