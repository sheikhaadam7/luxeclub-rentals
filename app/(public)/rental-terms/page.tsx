import type { Metadata } from 'next'
import Link from 'next/link'
import {
  rentalTermsTitle,
  rentalTermsLastUpdated,
  rentalTermsSections,
} from '@/lib/rental-terms'

export const metadata: Metadata = {
  title: 'Rental Information & Terms',
  description:
    'LuxeClub Car Rentals UAE rental terms — documents, deposits, age, insurance, cross-border, fuel, cancellation and the rest of what applies to every booking.',
  openGraph: {
    title: 'Rental Information & Terms — LuxeClub Rentals Dubai',
    description:
      'Everything that applies to a LuxeClub car rental in the UAE: documents, deposit, insurance, fuel, cancellation, and territorial restrictions.',
    url: 'https://luxeclubrentals.com/rental-terms',
    type: 'website',
    siteName: 'LuxeClub Rentals',
    images: [
      {
        url: 'https://luxeclubrentals.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'LuxeClub Rentals Terms',
      },
    ],
  },
  alternates: { canonical: 'https://luxeclubrentals.com/rental-terms' },
}

function renderInline(text: string, key: number) {
  // Split on **bold** segments and [label](href) link segments.
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/).filter(Boolean)
  return parts.map((part, k) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${key}-${k}`} className="text-white font-medium">
          {part.slice(2, -2)}
        </strong>
      )
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (linkMatch) {
      const [, label, href] = linkMatch
      return (
        <Link
          key={`${key}-${k}`}
          href={href}
          className="text-brand-cyan underline underline-offset-4 hover:text-white transition-colors"
        >
          {label}
        </Link>
      )
    }
    return <span key={`${key}-${k}`}>{part}</span>
  })
}

export default function RentalTermsPage() {
  const sections = rentalTermsSections.filter(
    (s) => s.intro.length > 0 || s.subs.some((sub) => sub.paragraphs.length > 0)
  )

  return (
    <main className="min-h-screen bg-brand-bg text-brand-muted">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* Title */}
        <header className="mb-10 pb-8 border-b border-brand-border">
          <p className="text-sm text-white/40 uppercase tracking-[0.15em] font-medium mb-3">
            Rental Information & Terms
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            {rentalTermsTitle.replace(/\s*\(Draft\)\s*$/i, '')}
          </h1>
          <p className="mt-4 text-sm text-white/50">Last updated: {rentalTermsLastUpdated}</p>
        </header>

        {/* Table of contents */}
        <nav aria-label="Contents" className="mb-12">
          <h2 className="text-sm text-white/40 uppercase tracking-[0.15em] font-medium mb-3">
            In this document
          </h2>
          <ol className="space-y-1.5 list-decimal list-inside marker:text-white/30">
            {sections.map((s) => (
              <li key={s.heading} className="text-base">
                <Link
                  href={`#${slugify(s.heading)}`}
                  className="text-brand-muted hover:text-white transition-colors"
                >
                  {s.heading}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((sec, si) => (
            <section
              key={sec.heading}
              id={slugify(sec.heading)}
              className="space-y-6 scroll-mt-24"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-white tracking-tight">
                {sec.heading}
              </h2>

              {sec.intro.map((para, pi) => (
                <p key={`intro-${si}-${pi}`} className="text-base text-brand-muted leading-relaxed">
                  {renderInline(para, pi)}
                </p>
              ))}

              {sec.subs.map((sub, subi) => (
                <div key={`${si}-${subi}`} className="space-y-4 pt-2">
                  <h3 className="font-display text-xl font-medium text-white tracking-tight">
                    {sub.heading}
                  </h3>
                  {sub.paragraphs.map((para, pi) => (
                    <p
                      key={`sub-${si}-${subi}-${pi}`}
                      className="text-base text-brand-muted leading-relaxed"
                    >
                      {renderInline(para, pi)}
                    </p>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>

        {/* Footer note */}
        <footer className="mt-16 pt-8 border-t border-brand-border">
          <p className="text-sm text-white/50 leading-relaxed">
            Questions before you book? Message us on{' '}
            <a
              href="https://wa.me/971588086137"
              className="text-brand-cyan underline underline-offset-4 hover:text-white transition-colors"
            >
              WhatsApp
            </a>{' '}
            or see our{' '}
            <Link
              href="/faq"
              className="text-brand-cyan underline underline-offset-4 hover:text-white transition-colors"
            >
              frequently asked questions
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  )
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
