import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Booking Lookup',
  description:
    'Look up your LuxeClub Rentals booking using your reference number. View booking details, manage dates, or cancel your reservation.',
  alternates: { canonical: 'https://luxeclubrentals.com/booking-lookup' },
}

export default function BookingLookupLayout({ children }: { children: React.ReactNode }) {
  return children
}
