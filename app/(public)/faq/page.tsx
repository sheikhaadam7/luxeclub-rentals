import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about LuxeClub Rentals Dubai. Learn about identity verification, delivery, payment methods, deposits, cancellation policy and returns.',
  openGraph: {
    title: 'FAQ — LuxeClub Rentals Dubai',
    description:
      'Everything you need to know about renting a luxury car with LuxeClub in Dubai.',
    url: 'https://www.luxeclubrentals.ae/faq',
  },
  alternates: { canonical: 'https://www.luxeclubrentals.ae/faq' },
}

export default function FAQPage() {
  const faqs = [
    {
      q: 'What documents do I need?',
      a: 'A valid passport or national ID and a valid driving licence.',
    },
    {
      q: 'How does delivery and pickup work?',
      a: 'You can pick up your vehicle for free from our Downtown Dubai office, or choose "Delivery" during booking and enter your address — we\'ll bring the car to your location for a flat AED 50 fee. For returns, drop it off at our office for free, or we can collect it from you for AED 50.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept credit/debit cards, Apple Pay, Google Pay, cryptocurrency, and cash on delivery.',
    },
    {
      q: 'What is the security deposit?',
      a: 'A refundable hold placed on your card to cover potential damages. The amount varies by vehicle. You can opt out for a small surcharge.',
    },
    {
      q: 'What is the cancellation policy?',
      a: 'Free cancellation up to 48 hours before pickup. 50% charge within 24-48 hours. Full charge within 24 hours of pickup.',
    },
    {
      q: 'What documents are required to rent a car in the UAE?',
      a: 'The list of documents depends on your country of origin and whether you are a UAE resident or tourist.\n\nFor UAE residents, the process is simple and fast as we only require 4 documents: copies of passport, residential visa, Emirates ID, and a valid UAE Driving License.\n\nFor tourists, the documents differ a little and include a passport, visa with entry stamp, a valid home country driving license, and an international driving permit or international driving license. However, if you hold GCC, US, UK, or Canada passports, as well as some other countries\' passports, you can drive with your home country\'s license.\n\nTo know if you are eligible to rent a car in Dubai, please ensure that your driving license is valid for driving in the UAE.',
    },
    {
      q: 'What type of driving license do I need to rent a car in the UAE?',
      a: 'If you are looking to rent a car in Dubai or any other Emirate, you will be asked to provide a valid UAE driving license or an international driving license depending on if you are a resident or a visitor.\n\nIf your driving license is from the following countries, you are lucky, as it is valid in the UAE: Australia, Bahrain, Belgium, Canada (Quebec*), Croatia, Denmark, Finland, Germany, Greece, Ireland, Japan*, Lithuania, Malta, Netherlands, Norway, Austria, Belgium, Brazil*, China, Cyprus, Estonia, France, Great Britain, Hong Kong, Italy, Kuwait, Luxembourg, Malaysia, New Zealand, Oman.\n\nIf your country is not listed, please make sure to have a valid International Driving Permit (IDP).\n\nLuxeClub Car Rentals has a great solution for those who want to rent a car but don\'t have a driver\'s license. Our professional drivers will ensure that the driving experience is memorable and safe no matter what car you rent. So you can relax and enjoy the views while cruising around the city.',
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <main className="min-h-screen bg-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-base text-brand-muted">Everything you need to know about LuxeClub.</p>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <details
              key={i}
              className="group bg-brand-surface border border-brand-border rounded-[--radius-card] overflow-hidden transition-colors duration-300 hover:border-brand-border-hover"
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none">
                <span className="text-[15px] font-medium text-white">{q}</span>
                <svg
                  className="w-4 h-4 text-brand-muted flex-shrink-0 transition-transform duration-300 group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-5 space-y-3">
                {a.split('\n\n').map((paragraph, j) => (
                  <p key={j} className="text-[14px] text-brand-muted leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </main>
  )
}
