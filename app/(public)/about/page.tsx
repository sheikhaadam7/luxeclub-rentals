import type { Metadata } from 'next'
import { T } from '@/components/ui/T'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'LuxeClub Rentals — Dubai\'s premium luxury car rental service. 3+ years of experience, 500+ happy clients, curated fleet of 29 luxury vehicles with 24/7 concierge.',
  openGraph: {
    title: 'About LuxeClub Rentals — Dubai Luxury Car Hire',
    description:
      'More than a rental company — a passion for extraordinary driving experiences in Dubai. Curated fleet, personal service, complete transparency.',
    url: 'https://luxeclubrentals.com/about',
  },
  alternates: { canonical: 'https://luxeclubrentals.com/about' },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-luxury">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 py-24 sm:py-32 text-center">
        <p className="text-sm text-white/40 uppercase tracking-[0.2em] font-medium mb-4">
          <T k="about.ourStory" />
        </p>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white leading-[1.1]">
          <T k="about.heroTitle1" /><br />
          <span className="text-white/50">LuxeClub</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/40 font-light leading-relaxed">
          <T k="about.heroSubtitle" />
        </p>
      </div>

      {/* Founder section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14">
          {/* Avatar placeholder */}
          <div className="flex-shrink-0">
            <div className="w-36 h-36 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
              <svg className="w-16 h-16 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>

          {/* Story */}
          <div className="space-y-4 text-center md:text-left">
            <h2 className="font-display text-2xl font-medium text-white">
              <T k="about.founderTitle" />
            </h2>
            <p className="text-sm text-white/50 leading-relaxed">
              <T k="about.founderP1" />
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              <T k="about.founderP2" />
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              <T k="about.founderP3" />
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              <T k="about.founderP4" />
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              <T k="about.founderP5" />
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <p className="font-display text-3xl sm:text-4xl font-semibold text-white">3+</p>
              <p className="text-sm text-white/40"><T k="about.yearsInDubai" /></p>
            </div>
            <div className="space-y-1">
              <p className="font-display text-3xl sm:text-4xl font-semibold text-white">500+</p>
              <p className="text-sm text-white/40"><T k="about.happyClients" /></p>
            </div>
            <div className="space-y-1">
              <p className="font-display text-3xl sm:text-4xl font-semibold text-white">29</p>
              <p className="text-sm text-white/40"><T k="about.luxuryVehicles" /></p>
            </div>
            <div className="space-y-1">
              <p className="font-display text-3xl sm:text-4xl font-semibold text-white">24/7</p>
              <p className="text-sm text-white/40"><T k="about.conciergeService" /></p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission statement */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-medium text-white mb-6">
          <T k="about.whatSetsUsApart" />
        </h2>
        <p className="text-white/50 leading-relaxed">
          <T k="about.whatSetsUsApartDesc" />
        </p>
      </section>

      {/* Values cards */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Curated Excellence */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 space-y-4 hover:border-white/[0.15] transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center text-white/70">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-medium text-white"><T k="about.curatedExcellence" /></h3>
            <p className="text-sm text-white/40 leading-relaxed"><T k="about.curatedExcellenceDesc" /></p>
          </div>

          {/* Personal Touch */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 space-y-4 hover:border-white/[0.15] transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center text-white/70">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-medium text-white"><T k="about.personalTouch" /></h3>
            <p className="text-sm text-white/40 leading-relaxed"><T k="about.personalTouchDesc" /></p>
          </div>

          {/* Complete Transparency */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 space-y-4 hover:border-white/[0.15] transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center text-white/70">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-medium text-white"><T k="about.completeTransparency" /></h3>
            <p className="text-sm text-white/40 leading-relaxed"><T k="about.completeTransparencyDesc" /></p>
          </div>
        </div>
      </section>
    </main>
  )
}
