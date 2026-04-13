import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Booking Lookup',
  description:
    'Look up your LuxeClub Rentals booking using your reference number. View booking details, manage dates, or cancel your reservation.',
  openGraph: {
    title: 'Booking Lookup — LuxeClub Rentals Dubai',
    description: 'Look up your LuxeClub Rentals booking using your reference number.',
    url: 'https://luxeclubrentals.com/booking-lookup',
    type: 'website',
    siteName: 'LuxeClub Rentals',
    images: [{ url: 'https://luxeclubrentals.com/opengraph-image', width: 1200, height: 630, alt: 'LuxeClub Rentals Booking Lookup' }],
  },
  alternates: { canonical: 'https://luxeclubrentals.com/booking-lookup' },
}

export default function BookingLookupLayout({ children }: { children: React.ReactNode }) {
  return children
}
