import { unstable_cache } from 'next/cache'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VehicleCard } from '@/components/catalogue/VehicleCard'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { CurrencyProvider } from '@/lib/currency/context'
import { LanguageProvider } from '@/lib/i18n/context'
import { T } from '@/components/ui/T'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { LazyVideo } from '@/components/ui/LazyVideo'

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

const TESTIMONIALS = [
  {
    name: 'Ahmed K.',
    location: 'Dubai Marina',
    text: 'Exceptional service from start to finish. The Rolls Royce Cullinan was immaculate and delivered right to my hotel at 6 AM. The driver was professional and the handover took less than 5 minutes. I\'ve rented from three other companies in Dubai — LuxeClub is on another level entirely.',
    rating: 5,
  },
  {
    name: 'Sarah M.',
    location: 'Palm Jumeirah',
    text: 'Rented the Porsche 911 GT3 for a weekend getaway to Hatta. The booking process was seamless and the car was in perfect condition. My only minor note would be that I wished they had a wider colour selection, but the white looked stunning anyway. Truly a premium experience.',
    rating: 4,
  },
  {
    name: 'James L.',
    location: 'Downtown Dubai',
    text: 'Best luxury car rental in Dubai, hands down. I\'m a returning customer — this was my fourth rental with LuxeClub. The Bentley Continental GT exceeded all expectations. What sets them apart is the personal touch: they remembered my preferences from last time and had everything ready. Professional team and competitive pricing.',
    rating: 5,
  },
  {
    name: 'Fatima R.',
    location: 'Business Bay',
    text: 'Used LuxeClub for a corporate event — rented three vehicles and everything was handled flawlessly. Their team coordinated delivery to three different locations simultaneously. The attention to detail is unmatched. Already booked again for our annual gala.',
    rating: 5,
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HomePage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const isAuthenticated = !!claimsData?.claims

  // Fetch vehicles with a 5-minute cache so the DB isn't hit on every page load
  const getFeaturedVehicles = unstable_cache(
    async () => {
      const adminSupabase = createAdminClient()
      const { data } = await adminSupabase
        .from('vehicles')
        .select('slug, name, category, primary_image_url, daily_rate, weekly_rate, monthly_rate')
        .eq('is_available', true)
        .order('name')
      return data
    },
    ['featured-vehicles'],
    { revalidate: 300 },
  )
  const featuredVehicles = await getFeaturedVehicles()

  const all = featuredVehicles ?? []
  const dayOffset = Math.floor(Date.now() / 86_400_000) % Math.max(all.length, 1)
  const shuffled = all.length <= 3
    ? all
    : Array.from({ length: 3 }, (_, i) => all[(dayOffset + i * 7) % all.length])

  return (
    <LanguageProvider>
    <CurrencyProvider>
      <NavBar isAuthenticated={isAuthenticated} />
      <main className="min-h-screen bg-luxury">
        {/* Hero section with video background */}
        <div className="relative flex flex-col items-center justify-center gap-10 px-4 py-24 sm:py-36 overflow-hidden">
          {/* Hero poster — LCP element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-poster.jpg"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Deferred background video — loads after page is interactive */}
          <LazyVideo
            webmSrc="/hero-bg.webm"
            mp4Src="/hero-bg.mp4"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Subtle gradient for text readability */}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

          <div className="relative z-10 text-center space-y-6">
            <span className="animate-fade-in-left block text-xs sm:text-sm tracking-[0.25em] uppercase text-white/40 font-light" style={{ animationDelay: '0ms' }}>
              LuxeClub
            </span>
            <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-medium tracking-tight leading-[1.05]">
              <span className="animate-fade-in-left block" style={{ animationDelay: '80ms' }}>
                <span className="text-white"><T k="home.heroTitle1" /></span>
              </span>
              <span className="animate-fade-in-left block" style={{ animationDelay: '160ms' }}>
                <span className="text-brand-cyan"><T k="home.heroTitle2" /></span>
                <span className="text-white/50"> .</span>
              </span>
            </h1>
            <p className="animate-fade-in-left text-lg sm:text-xl text-white/40 font-light" style={{ animationDelay: '240ms' }}>
              <T k="home.heroSubtitle" />
            </p>
          </div>

          {/* Garage CTA */}
          <Link
            href="/catalogue"
            className="animate-fade-in-left relative z-10 px-16 py-5 bg-white text-black text-lg font-semibold hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300 ease-out"
            style={{ animationDelay: '320ms' }}
          >
            <T k="home.exploreFleet" />
          </Link>

        </div>


        {/* Trust stats bar */}
        <section className="border-y border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  <p className="text-lg font-bold text-white"><T k="home.fleetSize" /></p>
                </div>
                <p className="text-xs text-white/40"><T k="home.fleetLabel" /></p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-amber-400/60" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <p className="text-lg font-bold text-white">4.9</p>
                </div>
                <p className="text-xs text-white/40"><T k="home.googleRating" /></p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-brand-cyan/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="text-lg font-bold text-white"><T k="home.dubaiDelivery" /></p>
                </div>
                <p className="text-xs text-white/40"><T k="home.dubaiDeliveryLabel" /></p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-green-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <p className="text-lg font-bold text-white"><T k="home.insuranceIncluded" /></p>
                </div>
                <p className="text-xs text-white/40"><T k="home.insuranceLabel" /></p>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted by strip */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-xs text-white/25 uppercase tracking-[0.2em] font-medium mb-6"><T k="home.featuredIn" /></p>
          <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-16">
            {[
              { src: '/logos/gulf-news.svg', alt: 'Gulf News', width: 200 },
              { src: '/logos/timeout.svg', alt: 'Time Out Dubai', width: 180 },
              { src: '/logos/luxury-lifestyle.svg', alt: 'Luxury Lifestyle', width: 210 },
              { src: '/logos/arabian-business.svg', alt: 'Arabian Business', width: 210 },
            ].map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={56}
                className="opacity-60 hover:opacity-90 transition-opacity duration-300"
              />
            ))}
          </div>
        </section>

        {/* What we do */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <ScrollReveal>
            <h3 className="font-display text-3xl sm:text-4xl font-medium text-white mb-10">
              <T k="home.whatWeDo" />
            </h3>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Luxury Car Rentals */}
            <ScrollReveal delay={100}>
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden h-full group">
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1756139258136-2ec452dfa3cc?w=800&q=75"
                    alt="Two sports cars parked under a structure"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover img-zoom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="p-6 text-center space-y-3">
                  <h4 className="font-display text-xl font-medium text-white"><T k="home.luxuryCarRentals" /></h4>
                  <p className="text-sm text-white/40 leading-relaxed">
                    <T k="home.luxuryCarRentalsDesc" />
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Chauffeur Service */}
            <ScrollReveal delay={250}>
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden h-full group">
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=75"
                    alt="Professional chauffeur driving"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover img-zoom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="p-6 text-center space-y-3">
                  <h4 className="font-display text-xl font-medium text-white"><T k="home.chauffeurService" /></h4>
                  <p className="text-sm text-white/40 leading-relaxed">
                    <T k="home.chauffeurServiceDesc" />
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Pick Up and Drop Off — full width */}
          <ScrollReveal delay={400}>
            <div className="border border-white/[0.08] rounded-2xl overflow-hidden group">
              <div className="relative h-52 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1770901157799-75ac60e5758e?w=800&q=75"
                  alt="Hand holding car key in front of black Porsche"
                  fill
                  sizes="(max-width: 768px) 100vw, 100vw"
                  className="object-cover img-zoom"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="p-6 text-center space-y-3">
                <h4 className="font-display text-xl font-medium text-white"><T k="home.pickUpDropOff" /></h4>
                <p className="text-sm text-white/40 leading-relaxed">
                  <T k="home.pickUpDropOffDesc" />
                </p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
          <div className="text-center space-y-2 mb-12">
            <h3 className="font-display text-3xl sm:text-4xl font-medium text-white">
              <T k="home.howItWorks" />
            </h3>
            <p className="text-sm text-brand-muted">
              <T k="home.howItWorksSubtitle" />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border border-white/[0.12] flex items-center justify-center">
                <span className="text-sm font-bold text-brand-cyan">01</span>
              </div>
              <h4 className="font-display text-lg font-medium text-white"><T k="home.step1Title" /></h4>
              <p className="text-sm text-white/40 leading-relaxed"><T k="home.step1Desc" /></p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border border-white/[0.12] flex items-center justify-center">
                <span className="text-sm font-bold text-brand-cyan">02</span>
              </div>
              <h4 className="font-display text-lg font-medium text-white"><T k="home.step2Title" /></h4>
              <p className="text-sm text-white/40 leading-relaxed"><T k="home.step2Desc" /></p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border border-white/[0.12] flex items-center justify-center">
                <span className="text-sm font-bold text-brand-cyan">03</span>
              </div>
              <h4 className="font-display text-lg font-medium text-white"><T k="home.step3Title" /></h4>
              <p className="text-sm text-white/40 leading-relaxed"><T k="home.step3Desc" /></p>
            </div>
          </div>
        </section>

        {/* Featured vehicles */}
        {shuffled.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
            <div className="text-center space-y-2 mb-10">
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                <T k="home.featuredVehicles" />
              </h3>
              <p className="text-sm text-brand-muted">
                <T k="home.featuredVehiclesSubtitle" />
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {shuffled.map((vehicle, i) => (
                <div
                  key={vehicle.slug}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <VehicleCard {...vehicle} />
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/catalogue"
                className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors duration-300"
              >
                <T k="home.viewAllVehicles" />
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>
        )}

        {/* Testimonials */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <div className="text-center space-y-2 mb-10">
            <h3 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              <T k="home.testimonials" />
            </h3>
            <p className="text-sm text-brand-muted">
              <T k="home.testimonialsSubtitle" />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((item) => (
              <div
                key={item.name}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4 hover:border-white/[0.15] transition-all duration-300"
              >
                <StarRating count={item.rating} />
                <p className="text-sm text-white/80 leading-relaxed">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-sm font-semibold text-white/60">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-white/40">{item.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* Final CTA */}
        <section className="relative border-t border-white/[0.06] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-cyan/[0.02] to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center relative z-10 space-y-6">
            <h3 className="font-display text-3xl sm:text-4xl font-medium text-white">
              <T k="home.ctaTitle" />
            </h3>
            <p className="text-base text-white/40 leading-relaxed">
              <T k="home.ctaSubtitle" />
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/catalogue"
                className="px-10 py-4 rounded-xl bg-brand-cyan text-white text-base font-semibold hover:bg-brand-cyan-hover shadow-[0_0_20px_rgba(201,169,110,0.15)] hover:shadow-[0_0_30px_rgba(201,169,110,0.25)] transition-all duration-300"
              >
                <T k="home.browseFleet" />
              </Link>
              <Link
                href="/contact"
                className="px-10 py-4 rounded-xl border border-white/[0.12] text-white text-base font-semibold hover:bg-white/[0.04] hover:border-white/[0.2] transition-all duration-300"
              >
                <T k="home.getInTouch" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </CurrencyProvider>
    </LanguageProvider>
  )
}
