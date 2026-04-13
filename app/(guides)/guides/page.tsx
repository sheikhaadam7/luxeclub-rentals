import type { Metadata } from 'next'
import Link from 'next/link'
import { guides, GUIDE_CATEGORIES, type GuideCategory } from '@/lib/guides'

const SITE_URL = 'https://luxeclubrentals.com'

export const metadata: Metadata = {
  title: 'Guides, Blogs & Just... Venting',
  description:
    'Practical guides for tourists renting luxury cars in Dubai. Driving rules, licence requirements, scenic routes, and insider tips for an unforgettable road trip.',
  openGraph: {
    title: 'Guides — LuxeClub Rentals Dubai',
    description:
      'Practical guides for tourists renting luxury cars in Dubai. Driving rules, scenic routes, and insider tips.',
    url: `${SITE_URL}/guides`,
    type: 'website',
    siteName: 'LuxeClub Rentals',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'LuxeClub Rentals Guides' }],
  },
  alternates: { canonical: `${SITE_URL}/guides` },
}

export default function GuidesPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'LuxeClub Guides',
      description:
        'Practical guides for tourists renting luxury cars in Dubai.',
      url: `${SITE_URL}/guides`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Guides',
          item: `${SITE_URL}/guides`,
        },
      ],
    },
  ]

  return (
    <main className="min-h-screen bg-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Guides, Blogs & Just... Venting
          </h1>
          <p className="text-base text-brand-muted">
            Everything you need to know before getting behind the wheel in Dubai. And some things we just needed to get off our chest.
          </p>
        </div>

        {/* Table of contents */}
        <nav className="flex flex-wrap gap-3">
          {(Object.keys(GUIDE_CATEGORIES) as GuideCategory[]).map((cat) => {
            const count = guides.filter((g) => g.category === cat).length
            if (count === 0) return null
            return (
              <a
                key={cat}
                href={`#${cat}`}
                className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.1] text-sm font-medium text-white/80 hover:text-white hover:border-brand-cyan/40 hover:bg-brand-cyan/5 transition-all duration-200"
              >
                {GUIDE_CATEGORIES[cat]}
                <span className="ml-2 text-xs text-brand-muted">{count}</span>
              </a>
            )
          })}
        </nav>

        {/* Guides grouped by category, newest first within each */}
        {(Object.keys(GUIDE_CATEGORIES) as GuideCategory[]).map((cat) => {
          const catGuides = guides
            .filter((g) => g.category === cat)
            .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
          if (catGuides.length === 0) return null
          return (
            <div key={cat} id={cat} className="space-y-5 scroll-mt-24">
              <h2 className="font-display text-xl font-medium text-white border-b border-brand-border pb-3">
                {GUIDE_CATEGORIES[cat]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {catGuides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="group bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-3 hover:border-brand-border-hover transition-all duration-300"
                  >
                    <p className="text-xs text-brand-muted">
                      {new Date(guide.publishedDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <h2 className="font-display text-lg font-medium text-white group-hover:text-brand-cyan transition-colors duration-300">
                      {guide.title}
                    </h2>
                    <p className="text-sm text-brand-muted leading-relaxed line-clamp-3">
                      {guide.metaDescription}
                    </p>
                    <span className="inline-flex items-center gap-1 text-sm text-brand-cyan font-medium">
                      Read guide
                      <svg
                        className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
