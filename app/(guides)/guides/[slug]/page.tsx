import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { guides } from '@/lib/guides'
import { ScreenshotGallery } from '@/components/guides/ScreenshotGallery'

const SITE_URL = 'https://luxeclubrentals.com'

const absoluteUrl = (path: string) =>
  path.startsWith('http://') || path.startsWith('https://') ? path : `${SITE_URL}${path}`

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = guides.find((g) => g.slug === slug)
  if (!guide) return {}

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: `${SITE_URL}/guides/${guide.slug}`,
      type: 'article',
      siteName: 'LuxeClub Rentals',
      publishedTime: guide.publishedDate,
      images: guide.image
        ? [{ url: absoluteUrl(guide.image), width: 1200, height: 630, alt: guide.imageAlt || guide.title }]
        : [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: guide.title }],
    },
    alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const guide = guides.find((g) => g.slug === slug)
  if (!guide) notFound()

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.metaDescription,
    datePublished: guide.publishedDate,
    dateModified: guide.updatedDate ?? guide.publishedDate,
    url: `${SITE_URL}/guides/${guide.slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/guides/${guide.slug}` },
    image: guide.image
      ? [absoluteUrl(guide.image)]
      : [`${SITE_URL}/opengraph-image`],
    author: {
      '@type': 'Organization',
      name: 'LuxeClub Editorial',
      url: `${SITE_URL}/about`,
      description:
        'The LuxeClub Editorial team — Dubai-based luxury and sports car rental specialists writing from first-hand fleet and concierge experience.',
    },
    publisher: {
      '@type': 'Organization',
      name: 'LuxeClub Rentals',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/apple-icon.png` },
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${SITE_URL}/guides/${guide.slug}` },
    ],
  }

  // FAQ schema for informational guides whose sections answer distinct questions
  const FAQ_ELIGIBLE_SLUGS = [
    'dubai-traffic-fines-complete-guide',
    'dubai-airport-parking-guide',
    'first-time-renting-luxury-car-dubai',
    'dubai-driving-rules-for-tourists',
    'uae-roundabout-rules-guide',
    'dubai-speed-cameras-locations-guide',
    'dubai-to-hatta-road-trip-guide',
    'rental-car-fines-dubai-what-happens',
    'do-i-need-international-driving-permit-dubai',
    'dubai-to-abu-dhabi-road-trip-guide',
    'luxury-suv-dubai-family-honeymoon',
  ]
  const faqJsonLd = FAQ_ELIGIBLE_SLUGS.includes(guide.slug)
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: guide.sections.map((s) => ({
          '@type': 'Question',
          name: s.heading,
          acceptedAnswer: { '@type': 'Answer', text: s.content.slice(0, 500) },
        })),
      }
    : null

  // Related guides — prefer same category, fall back to newest across all categories.
  // Newest = highest publishedDate string (ISO format sorts correctly).
  const otherGuides = guides.filter((g) => g.slug !== guide.slug)
  const sameCategory = otherGuides
    .filter((g) => g.category === guide.category)
    .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
  const otherCategory = otherGuides
    .filter((g) => g.category !== guide.category)
    .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
  const relatedGuides = [...sameCategory, ...otherCategory].slice(0, 3)

  return (
    <main className="min-h-screen bg-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd, ...(faqJsonLd ? [faqJsonLd] : [])]) }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-brand-muted">
          <Link href="/" className="hover:text-white transition-colors duration-300">
            Home
          </Link>
          <span className="text-white/20">/</span>
          <Link href="/guides" className="hover:text-white transition-colors duration-300">
            Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/70 truncate">{guide.title}</span>
        </nav>

        {/* Header */}
        <header className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            {guide.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-muted">
            <span>
              By{' '}
              <Link href="/about" className="text-white/80 hover:text-white underline underline-offset-4">
                LuxeClub Editorial
              </Link>
            </span>
            <span className="text-white/20">·</span>
            <span>
              Published{' '}
              {new Date(guide.publishedDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {guide.updatedDate && guide.updatedDate !== guide.publishedDate && (
              <>
                <span className="text-white/20">·</span>
                <span>
                  Updated{' '}
                  {new Date(guide.updatedDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Hero image */}
        {guide.image && (
          guide.image.endsWith('.gif') || guide.image.endsWith('.webp') ? (
            <div className="relative w-full rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={guide.image}
                alt={guide.imageAlt || guide.title}
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden">
              <Image
                src={guide.image}
                alt={guide.imageAlt || guide.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
          )
        )}

        {/* Table of Contents */}
        <nav className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-3">
          <h2 className="text-sm text-white/40 uppercase tracking-[0.15em] font-medium">
            In this guide
          </h2>
          <ol className="space-y-2">
            {guide.sections.map((section, i) => (
              <li key={i}>
                <a
                  href={`#${slugify(section.heading)}`}
                  className="text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors duration-300"
                >
                  {i + 1}. {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10">
          {guide.sections.map((section, i) => (
            <section key={i} id={slugify(section.heading)} className="scroll-mt-8 space-y-4">
              <h2 className="font-display text-xl sm:text-2xl font-medium text-white">
                {section.heading}
              </h2>
              {section.image && (
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
                  <Image
                    src={section.image}
                    alt={section.imageAlt || section.heading}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                </div>
              )}
              {section.images && section.images.length > 0 && (
                <ScreenshotGallery
                  images={section.images}
                  alt={section.imagesAlt || section.heading}
                />
              )}
              {section.content.split('\n\n').map((paragraph, j) => (
                <p key={j} className="text-[15px] text-brand-muted leading-relaxed">
                  {paragraph.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/).filter(Boolean).map((part, k) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={k} className="text-white font-medium">{part.slice(2, -2)}</strong>
                    }
                    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
                    if (linkMatch) {
                      const [, label, href] = linkMatch
                      return (
                        <Link key={k} href={href} className="text-brand-cyan underline underline-offset-4 hover:text-white transition-colors">
                          {label}
                        </Link>
                      )
                    }
                    return part
                  })}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* About the author */}
        <aside className="border-t border-brand-border pt-8">
          <div className="flex items-start gap-4 bg-brand-surface border border-brand-border rounded-2xl p-5">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0 text-white/70">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">LuxeClub Editorial</p>
              <p className="text-sm text-brand-muted leading-relaxed">
                The LuxeClub Editorial team — Dubai-based luxury and sports car rental specialists writing from first-hand fleet and concierge experience. Every guide is reviewed by our team before publishing. <Link href="/about" className="text-brand-cyan hover:text-brand-cyan-hover underline underline-offset-4">Learn more about us.</Link>
              </p>
            </div>
          </div>
        </aside>

        {/* More Guides */}
        {relatedGuides.length > 0 && (
          <div className="border-t border-brand-border pt-10 space-y-6">
            <h2 className="font-display text-xl font-medium text-white">More Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedGuides.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  className="group bg-brand-surface border border-brand-border rounded-xl p-4 space-y-2 hover:border-brand-border-hover transition-all duration-300"
                >
                  <p className="text-xs text-brand-muted">
                    {new Date(g.publishedDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <h3 className="text-sm font-medium text-white group-hover:text-brand-cyan transition-colors duration-300 line-clamp-2">
                    {g.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick links to rental pages */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/car-rental-dubai" className="text-xs text-brand-cyan hover:text-brand-cyan-hover transition-colors">Car Rental Dubai</Link>
          <span className="text-white/20">·</span>
          <Link href="/rent-luxury-car-in-dubai" className="text-xs text-brand-cyan hover:text-brand-cyan-hover transition-colors">Luxury Car Rental</Link>
          <span className="text-white/20">·</span>
          <Link href="/rent-suv-in-dubai" className="text-xs text-brand-cyan hover:text-brand-cyan-hover transition-colors">SUV Rental</Link>
          <span className="text-white/20">·</span>
          <Link href="/rent-sports-car-in-dubai" className="text-xs text-brand-cyan hover:text-brand-cyan-hover transition-colors">Sports Car Rental</Link>
        </div>

        {/* CTA */}
        <div className="border-t border-brand-border pt-10 text-center space-y-4">
          <h2 className="font-display text-2xl font-medium text-white">
            Ready to hit the road?
          </h2>
          <p className="text-sm text-brand-muted">
            Browse our curated fleet of luxury and sports cars available for rent in Dubai.
          </p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 bg-brand-cyan hover:bg-brand-cyan-hover text-black font-medium text-sm px-6 py-3 rounded-full transition-colors duration-300"
          >
            View our fleet
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </article>
    </main>
  )
}
