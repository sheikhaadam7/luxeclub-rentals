import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { guides } from '@/lib/guides'

const SITE_URL = 'https://www.luxeclubrentals.ae'

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
      publishedTime: guide.publishedDate,
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
    url: `${SITE_URL}/guides/${guide.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'LuxeClub Rentals',
      url: SITE_URL,
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

  return (
    <main className="min-h-screen bg-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd]) }}
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
          <p className="text-sm text-brand-muted">
            Published{' '}
            {new Date(guide.publishedDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </header>

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
              {section.content.split('\n\n').map((paragraph, j) => (
                <p key={j} className="text-[15px] text-brand-muted leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
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
