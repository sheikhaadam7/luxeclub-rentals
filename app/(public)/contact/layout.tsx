import type { Metadata } from 'next'
import { PHONE_CALL_E164 } from '@/lib/contact'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with LuxeClub Rentals Dubai. Call, WhatsApp or email us — we deliver across Dubai, so there is no need to come to us. 24/7 support during your rental.',
  openGraph: {
    title: 'Contact LuxeClub Rentals — Dubai Luxury Car Hire',
    description:
      'Reach us via WhatsApp, phone, or email. Binary Tower, 32 Marasi Drive, Business Bay, Dubai.',
    url: 'https://luxeclubrentals.com/contact',
    type: 'website',
    siteName: 'LuxeClub Rentals',
    images: [{ url: 'https://luxeclubrentals.com/opengraph-image', width: 1200, height: 630, alt: 'Contact LuxeClub Rentals' }],
  },
  alternates: { canonical: 'https://luxeclubrentals.com/contact' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact LuxeClub Rentals',
  url: 'https://luxeclubrentals.com/contact',
  mainEntity: {
    '@type': 'LocalBusiness',
    name: 'LuxeClub Rentals',
    telephone: PHONE_CALL_E164,
    email: 'bookings@luxeclubrentals.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Binary Tower, 32 Marasi Drive',
      addressLocality: 'Business Bay',
      addressRegion: 'Dubai',
      addressCountry: 'AE',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      // See app/layout.tsx -- the real collection and delivery window.
      opens: '08:30',
      closes: '20:30',
    },
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
