import type { Metadata } from 'next'
import Link from 'next/link'
import { CloseTabButton } from '@/components/ui/CloseTabButton'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How LuxeClub Rentals collects, uses, shares, and protects personal data. Your rights under UAE PDPL (Federal Decree-Law No. 45 of 2021).',
  openGraph: {
    title: 'Privacy Policy | LuxeClub Rentals Dubai',
    description:
      'How LuxeClub Rentals collects, uses, shares, and protects your personal data under UAE PDPL.',
    url: 'https://luxeclubrentals.com/privacy',
    type: 'website',
    siteName: 'LuxeClub Rentals',
    images: [{ url: 'https://luxeclubrentals.com/opengraph-image', width: 1200, height: 630, alt: 'LuxeClub Rentals Privacy Policy' }],
  },
  alternates: { canonical: 'https://luxeclubrentals.com/privacy' },
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '24 April 2026'
const EFFECTIVE_DATE = '24 April 2026'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Privacy Policy',
  description: 'LuxeClub Rentals privacy policy covering data collection, processing, retention, and your rights under UAE PDPL.',
  url: 'https://luxeclubrentals.com/privacy',
  dateModified: '2026-04-24',
  publisher: {
    '@type': 'Organization',
    name: 'LuxeClub Rentals',
    url: 'https://luxeclubrentals.com',
  },
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Floating close button — positioned below the NavBar so it has clear space */}
      <div className="fixed top-20 right-4 sm:top-24 sm:right-6 z-[60]">
        <CloseTabButton />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 py-20 sm:py-28 text-center">
        <p className="text-sm text-white/40 uppercase tracking-[0.2em] font-medium mb-4">
          Legal
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.1]">
          Privacy Policy
        </h1>
        <p className="mt-5 text-sm text-white/40">
          Last updated {LAST_UPDATED} &middot; Effective {EFFECTIVE_DATE}
        </p>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 text-white/70 leading-relaxed space-y-10 text-[15px]">

        <section className="space-y-3">
          <p>
            This Privacy Policy explains how LuxeClub Rentals (&ldquo;<strong>LuxeClub</strong>&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
            collects, uses, shares, and protects your personal data when you visit <Link href="/" className="text-white underline underline-offset-4 hover:text-white/80">luxeclubrentals.com</Link>,
            book a vehicle, or otherwise interact with our services. We operate in the United Arab Emirates and comply
            with UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (&ldquo;<strong>PDPL</strong>&rdquo;), its executive regulations,
            and applicable sector rules issued by Dubai RTA and the UAE Central Bank for payment processing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">1. Who we are</h2>
          <p>
            <strong>LuxeClub Rentals</strong> is a luxury and sports car rental service based in Dubai, UAE. For the purposes of UAE PDPL,
            we are the <strong>data controller</strong> of the personal data we collect through our website, booking flow, WhatsApp and email channels,
            and vehicle rental operations.
          </p>
          <div className="pl-4 border-l border-white/15 space-y-1 text-sm text-white/60">
            <p><strong className="text-white/80">Registered address:</strong> Binary Tower, 32 Marasi Drive, Business Bay, Dubai, UAE</p>
            <p><strong className="text-white/80">Phone / WhatsApp:</strong> +971 58 808 6137</p>
            <p><strong className="text-white/80">Email:</strong> <a className="underline underline-offset-4 hover:text-white" href="mailto:bookings@luxeclubrentals.com">bookings@luxeclubrentals.com</a></p>
            <p><strong className="text-white/80">Data protection contact:</strong> <a className="underline underline-offset-4 hover:text-white" href="mailto:privacy@luxeclubrentals.com">privacy@luxeclubrentals.com</a></p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">2. Data we collect</h2>
          <p>We collect personal data in three ways: information you give us, information created when you use our services, and information we receive from third parties.</p>

          <h3 className="font-display text-lg font-medium text-white mt-4">2.1 Information you give us</h3>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>Identity &amp; contact:</strong> full name, date of birth, nationality, email address, phone number, WhatsApp number.</li>
            <li><strong>Identity verification documents:</strong> passport, Emirates ID, visa page, driving licence (UAE, GCC, or international permit). Required under UAE RTA rental rules.</li>
            <li><strong>Booking details:</strong> pickup and return dates, delivery / collection address, selected vehicle, special requests.</li>
            <li><strong>Payment data:</strong> handled by our payment processors (see Section 5). We do not store full card numbers on our servers.</li>
            <li><strong>Correspondence:</strong> enquiry messages, WhatsApp chats, emails, and any content you share with our concierge team.</li>
          </ul>

          <h3 className="font-display text-lg font-medium text-white mt-4">2.2 Information created when you use our site</h3>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>Device &amp; technical data:</strong> IP address, browser type, operating system, referring URL, pages viewed, session duration.</li>
            <li><strong>Analytics &amp; cookies:</strong> identifiers set by Google Analytics, Umami, and Ahrefs Analytics (see Section 7).</li>
            <li><strong>Booking session data:</strong> items saved to your cart, forms partially completed, account preferences.</li>
          </ul>

          <h3 className="font-display text-lg font-medium text-white mt-4">2.3 Information from third parties</h3>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>ID verification results</strong> from our KYC partner (Veriff) confirming authenticity of submitted documents.</li>
            <li><strong>Payment confirmations</strong> from Stripe and NowPayments.</li>
            <li><strong>Traffic fine and Salik toll data</strong> from Dubai Police, RTA, and Salik for any violations or tolls incurred during your rental.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">3. How we use your data</h2>
          <p>We process personal data only for the purposes listed below, and only to the extent necessary for each purpose.</p>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>Provide the rental service:</strong> process your booking, prepare the rental agreement, deliver and collect the vehicle, handle any incident during the rental.</li>
            <li><strong>Verify your identity and eligibility</strong> to drive the vehicle, as required by RTA and our insurers.</li>
            <li><strong>Take payment and issue invoices,</strong> including security deposit authorisations and refunds.</li>
            <li><strong>Communicate with you</strong> about your booking, respond to questions, send booking confirmations, delivery windows, and concierge updates via email and WhatsApp.</li>
            <li><strong>Meet legal obligations</strong> including RTA rental registration, traffic fine reconciliation, Salik toll reconciliation, anti-money-laundering (AML) checks, and tax / VAT record-keeping.</li>
            <li><strong>Protect the vehicle and third parties:</strong> report accidents, pursue damage or fine recovery, enforce rental terms.</li>
            <li><strong>Improve our site and service:</strong> analytics, A/B testing, fraud prevention.</li>
            <li><strong>Marketing (opt-in only):</strong> send promotions or new-vehicle announcements, but only if you have agreed. You can withdraw consent at any time.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">4. Legal bases for processing</h2>
          <p>Under UAE PDPL we rely on one or more of the following legal bases for each processing activity:</p>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>Performance of a contract</strong> &mdash; to fulfil your rental booking.</li>
            <li><strong>Legal obligation</strong> &mdash; RTA, tax, AML, and traffic-enforcement requirements.</li>
            <li><strong>Legitimate interests</strong> &mdash; to operate, secure, and improve our services, prevent fraud, and recover debts &mdash; provided this is not overridden by your rights.</li>
            <li><strong>Your consent</strong> &mdash; for marketing communications and non-essential cookies. You may withdraw consent at any time.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">5. Who we share your data with</h2>
          <p>We do not sell your personal data. We share it only with the following categories of recipients, and only to the extent each needs to perform its role:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead className="text-white/70 text-left">
                <tr className="border-b border-white/15">
                  <th className="py-2 pr-4 font-medium">Recipient</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 font-medium">Location</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Booking database &amp; customer accounts</td><td className="py-2">EU (Frankfurt)</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Card payment processing &amp; deposit holds</td><td className="py-2">Ireland / USA</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">NowPayments</td><td className="py-2 pr-4">Cryptocurrency payment processing</td><td className="py-2">EU</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Veriff</td><td className="py-2 pr-4">Identity document verification</td><td className="py-2">Estonia (EU)</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">Transactional email delivery</td><td className="py-2">USA</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Meta (WhatsApp Business)</td><td className="py-2 pr-4">Customer messaging</td><td className="py-2">USA / Ireland</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Google Analytics 4 &amp; Google Tag Manager</td><td className="py-2 pr-4">Website analytics</td><td className="py-2">USA</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Umami</td><td className="py-2 pr-4">Privacy-focused analytics</td><td className="py-2">EU</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Ahrefs Analytics</td><td className="py-2 pr-4">SEO traffic analytics</td><td className="py-2">Singapore</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Website hosting &amp; content delivery</td><td className="py-2">USA / EU</td></tr>
                <tr><td className="py-2 pr-4">Dubai RTA, Dubai Police, Salik</td><td className="py-2 pr-4">Mandatory reporting of rentals, fines, tolls</td><td className="py-2">UAE</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/50 mt-3">
            We may also disclose personal data to insurers handling a claim, legal or tax advisors, debt-recovery agents, or law-enforcement bodies where legally required.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">6. International data transfers</h2>
          <p>
            Some of the processors listed above store or process personal data outside the UAE. When we transfer data internationally, we rely on the mechanisms permitted under UAE PDPL
            Article 22, including transfers to jurisdictions with an adequate level of protection and the use of standard contractual clauses or equivalent safeguards. If you want details of the
            specific safeguards in place for a given transfer, email <a className="underline underline-offset-4 hover:text-white" href="mailto:privacy@luxeclubrentals.com">privacy@luxeclubrentals.com</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">7. Cookies and tracking</h2>
          <p>We use cookies and similar technologies for three purposes:</p>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>Strictly necessary</strong> &mdash; to keep you signed in, remember your selected currency / language, secure the booking flow. These cannot be switched off.</li>
            <li><strong>Analytics</strong> &mdash; Google Analytics 4, Umami, Ahrefs Analytics. These help us understand which pages are useful and which are broken.</li>
            <li><strong>Marketing / attribution</strong> &mdash; identifiers set by ad platforms if you arrive from a paid campaign, so we can measure campaign effectiveness.</li>
          </ul>
          <p>
            You can block or clear cookies at any time from your browser settings. Blocking strictly necessary cookies will break parts of the booking flow.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">8. Data retention</h2>
          <p>We keep personal data only as long as we need it. Our default periods are:</p>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>Booking &amp; rental agreement records:</strong> 7 years after the end of the rental, in line with UAE tax and commercial record-keeping obligations.</li>
            <li><strong>Identity verification records:</strong> 5 years from the last rental, for AML and RTA audit purposes.</li>
            <li><strong>Payment records:</strong> retained by our payment processors per their own schedules, and referenced by us for 7 years for tax purposes.</li>
            <li><strong>WhatsApp and email correspondence:</strong> up to 3 years, or longer if an issue, claim, or fine is still open.</li>
            <li><strong>Website analytics:</strong> up to 26 months (Google Analytics default).</li>
            <li><strong>Marketing preferences:</strong> until you unsubscribe, plus 12 months for proof of consent.</li>
          </ul>
          <p>After the retention period ends we delete or anonymise the data unless we are required by law to keep it longer.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">9. Your rights under UAE PDPL</h2>
          <p>Subject to the conditions and limitations in UAE PDPL, you have the following rights:</p>
          <ul className="list-disc pl-6 space-y-1.5 marker:text-white/30">
            <li><strong>Access</strong> &mdash; ask what personal data we hold about you and obtain a copy.</li>
            <li><strong>Rectification</strong> &mdash; ask us to correct data that is inaccurate or incomplete.</li>
            <li><strong>Erasure</strong> &mdash; ask us to delete your data, where we do not need to keep it for a legal reason.</li>
            <li><strong>Restriction &amp; objection</strong> &mdash; ask us to stop or limit processing, especially for marketing.</li>
            <li><strong>Withdraw consent</strong> &mdash; at any time where we rely on consent (e.g. marketing, optional cookies).</li>
            <li><strong>Data portability</strong> &mdash; receive the data you have provided in a structured, machine-readable format.</li>
            <li><strong>Stop automated decision-making</strong> &mdash; we do not currently use automated decisions that produce legal effects, but if that changes you have the right to request human review.</li>
            <li><strong>Complain</strong> &mdash; lodge a complaint with the UAE Data Office if you believe we have not handled your data correctly.</li>
          </ul>
          <p>
            To exercise any of these rights, email <a className="underline underline-offset-4 hover:text-white" href="mailto:privacy@luxeclubrentals.com">privacy@luxeclubrentals.com</a>.
            We will respond within 30 days. We may need to verify your identity before releasing any data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">10. Security</h2>
          <p>
            We take reasonable technical and organisational measures to protect personal data against loss, misuse, and unauthorised access. These include TLS encryption in transit,
            encryption at rest for our booking database, access controls, least-privilege API keys, and regular review of who can see customer data. No system is perfectly secure, so
            we also maintain an incident-response process and will notify you and the UAE Data Office of any personal data breach that is likely to affect your rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">11. Children</h2>
          <p>
            Our services are directed at adults aged 21 and over (25 for supercar categories). We do not knowingly collect personal data from anyone under 18. If you believe a child has
            given us their personal data, contact us and we will delete it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">12. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The current version is always available at this URL, and the &ldquo;Last updated&rdquo; date at the top will change.
            Material changes will be highlighted on the homepage or in an email where we have your address.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-medium text-white">13. Contact us</h2>
          <p>
            Questions, requests, or complaints about this Privacy Policy or how we handle your personal data:
          </p>
          <div className="pl-4 border-l border-white/15 space-y-1 text-sm text-white/60">
            <p>LuxeClub Rentals</p>
            <p>Binary Tower, 32 Marasi Drive, Business Bay, Dubai, UAE</p>
            <p>Email: <a className="underline underline-offset-4 hover:text-white" href="mailto:privacy@luxeclubrentals.com">privacy@luxeclubrentals.com</a></p>
            <p>Phone / WhatsApp: +971 58 808 6137</p>
          </div>
        </section>

        <section className="pt-4 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="text-white/50 hover:text-white underline underline-offset-4">Home</Link>
          <Link href="/about" className="text-white/50 hover:text-white underline underline-offset-4">About</Link>
          <Link href="/contact" className="text-white/50 hover:text-white underline underline-offset-4">Contact</Link>
          <Link href="/faq" className="text-white/50 hover:text-white underline underline-offset-4">FAQ</Link>
        </section>
      </article>
    </main>
  )
}
