import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with LuxeClub Rentals Dubai. Call, WhatsApp, or visit us at Binary Tower, Business Bay. 24/7 concierge support for luxury car rentals.',
  openGraph: {
    title: 'Contact LuxeClub Rentals — Dubai Luxury Car Hire',
    description:
      'Reach us via WhatsApp, phone, or email. Binary Tower, 32 Marasi Drive, Business Bay, Dubai.',
    url: 'https://luxeclubrentals.com/contact',
  },
  alternates: { canonical: 'https://luxeclubrentals.com/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
