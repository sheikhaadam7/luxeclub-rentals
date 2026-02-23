import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const SITE_URL = 'https://www.luxeclubrentals.ae'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LuxeClub Rentals — Luxury Car Rental in Dubai',
    template: '%s | LuxeClub Rentals Dubai',
  },
  description:
    'Rent luxury and sports cars in Dubai. Lamborghini, Ferrari, Rolls-Royce, Bentley and more. Insurance included, free delivery, 24/7 concierge. Book online today.',
  keywords: [
    'luxury car rental Dubai',
    'rent supercar Dubai',
    'Dubai exotic car hire',
    'Lamborghini rental Dubai',
    'Ferrari rental Dubai',
    'Rolls Royce rental Dubai',
    'sports car rental Dubai',
    'luxury car hire UAE',
    'rent car Dubai',
    'prestige car rental Dubai',
  ],
  icons: {
    icon: [
      { url: '/icon-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
  },
  authors: [{ name: 'LuxeClub Rentals' }],
  creator: 'LuxeClub Rentals',
  openGraph: {
    type: 'website',
    locale: 'en_AE',
    url: SITE_URL,
    siteName: 'LuxeClub Rentals',
    title: 'LuxeClub Rentals — Luxury Car Rental in Dubai',
    description:
      'Rent luxury and sports cars in Dubai. Lamborghini, Ferrari, Rolls-Royce, Bentley and more. Insurance included, free delivery, 24/7 concierge.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LuxeClub Rentals — Luxury Car Rental in Dubai',
    description:
      'Rent luxury and sports cars in Dubai. Insurance included, free delivery, 24/7 concierge.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: SITE_URL },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#business`,
  name: 'LuxeClub Rentals',
  description:
    'Premium luxury and sports car rental service in Dubai, UAE. Featuring Lamborghini, Ferrari, Rolls-Royce, Bentley and more.',
  url: SITE_URL,
  telephone: '+971588086137',
  email: 'hello@luxeclubrentals.ae',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Binary Tower, 32 Marasi Drive Street',
    addressLocality: 'Business Bay',
    addressRegion: 'Dubai',
    addressCountry: 'AE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 25.1865,
    longitude: 55.2675,
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
  priceRange: 'AED 800 — AED 15 000 / day',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '500',
    bestRating: '5',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="bg-black text-white antialiased font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
