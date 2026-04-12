import { unstable_cache } from 'next/cache'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VehicleCard } from '@/components/catalogue/VehicleCard'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { ChatWidget } from '@/components/ui/ChatWidget'
import { CurrencyProvider } from '@/lib/currency/context'
import { LanguageProvider } from '@/lib/i18n/context'
import { T } from '@/components/ui/T'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { LazyVideo } from '@/components/ui/LazyVideo'
import { TestimonialCarousel } from '@/components/ui/TestimonialCarousel'
import { HeroSearch } from '@/components/ui/HeroSearch'
import { BrandGrid } from '@/components/ui/BrandGrid'
import { getGoogleReviews } from '@/lib/google/reviews'

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
        .select('slug, name, category, primary_image_url, image_urls, daily_rate, weekly_rate, monthly_rate')
        .eq('is_available', true)
        .order('name')
      return data
    },
    ['featured-vehicles'],
    { revalidate: 300 },
  )
  const [featuredVehicles, googleReviews] = await Promise.all([
    getFeaturedVehicles(),
    getGoogleReviews(),
  ])

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
        <div className="relative flex flex-col items-center justify-center gap-6 sm:gap-10 px-4 py-24 sm:py-36">
          {/* Hero poster — LCP element */}
          <Image
            src="/hero-poster.jpg"
            alt="Luxury car hero background"
            fill
            priority
            sizes="100vw"
            className="object-cover"
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
            <span className="animate-fade-in-left block font-display text-4xl sm:text-5xl font-semibold text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]" style={{ animationDelay: '0ms' }}>
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

          {/* Search bar */}
          <HeroSearch vehicles={all.map((v) => ({ slug: v.slug, name: v.name, primary_image_url: v.primary_image_url, daily_rate: v.daily_rate }))} />

          {/* Garage CTA */}
          <Link
            href="/catalogue"
            className="animate-fade-in-left relative z-10 px-10 sm:px-16 py-4 sm:py-5 bg-white text-black text-base sm:text-lg font-semibold hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300 ease-out"
            style={{ animationDelay: '320ms' }}
          >
            <T k="home.exploreFleet" />
          </Link>

          {/* Crypto accepted */}
          <div className="animate-fade-in-left relative z-10 flex flex-col items-center gap-3" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-4">
              {/* Bitcoin */}
              <svg className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-[0_0_8px_rgba(247,147,26,0.4)]" viewBox="0 0 32 32" fill="#F7931A">
                <path d="M23.03 14.34c.32-2.13-.97-3.28-2.63-4.04l.54-2.16-1.31-.33-.52 2.1c-.35-.09-.7-.17-1.05-.24l.53-2.11-1.31-.33-.54 2.16c-.28-.07-.57-.13-.84-.2l.01-.01-1.81-.45-.35 1.4s.97.22.95.24c.53.13.63.49.61.77l-.61 2.46c.04.01.08.02.13.04l-.13-.03-.86 3.44c-.07.16-.23.41-.6.32.01.02-.95-.24-.95-.24L11.5 18.6l1.71.43c.32.08.63.16.94.24l-.54 2.18 1.31.33.54-2.17c.36.1.71.19 1.05.28l-.54 2.15 1.31.33.54-2.17c2.23.42 3.91.25 4.62-1.77.57-1.63-.03-2.57-1.2-3.18.86-.2 1.5-.76 1.67-1.93zM20.54 18c-.4 1.63-3.14.75-4.03.53l.72-2.88c.89.22 3.74.66 3.31 2.35zm.41-4.18c-.37 1.48-2.65.73-3.38.54l.65-2.61c.74.18 3.12.53 2.73 2.07z" />
              </svg>
              {/* Ethereum */}
              <svg className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-[0_0_8px_rgba(98,126,234,0.4)]" viewBox="0 0 32 32" fill="#627EEA">
                <path d="M16 2l-.22.74V20.3l.22.22.22-.12L24 16.06 16 2z" opacity="0.6" />
                <path d="M16 2L8 16.06l8 4.34V2z" />
                <path d="M16 22.08l-.12.15v6.53l.12.35L24 17.74l-8 4.34z" opacity="0.6" />
                <path d="M16 29.11v-7.03L8 17.74l8 11.37z" />
                <path d="M16 20.4l8-4.34-8-3.63v7.97z" opacity="0.2" />
                <path d="M8 16.06l8 4.34v-7.97l-8 3.63z" opacity="0.6" />
              </svg>
              {/* USDT / Tether */}
              <svg className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-[0_0_8px_rgba(38,161,123,0.4)]" viewBox="0 0 32 32" fill="#26A17B">
                <path d="M18.15 17.14c-.12.01-.58.04-1.66.04-0.86 0-1.47-.03-1.68-.04-3.33-.15-5.81-.73-5.81-1.42s2.48-1.27 5.81-1.43v2.27c.21.01.84.06 1.69.06 1.03 0 1.52-.05 1.65-.06v-2.27c3.32.16 5.79.74 5.79 1.43s-2.47 1.27-5.79 1.42zm0-3.09v-2.03h4.65V8.87H9.22v3.15h4.64v2.03c-3.77.17-6.6.93-6.6 1.83s2.83 1.66 6.6 1.83v6.55h3.29v-6.55c3.76-.17 6.58-.93 6.58-1.83s-2.82-1.66-6.58-1.83z" />
              </svg>
            </div>
            <p className="text-sm sm:text-base font-medium text-white/70 tracking-wide">
              Crypto Payments Accepted
            </p>
          </div>

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

        {/* Browse by Brand */}
        <BrandGrid />

        {/* What we do */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <ScrollReveal>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-white mb-10">
              <T k="home.whatWeDo" />
            </h2>
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
                  <h3 className="font-display text-xl font-medium text-white"><T k="home.luxuryCarRentals" /></h3>
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
                  <h3 className="font-display text-xl font-medium text-white"><T k="home.chauffeurService" /></h3>
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
                <h3 className="font-display text-xl font-medium text-white"><T k="home.pickUpDropOff" /></h3>
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
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-white">
              <T k="home.howItWorks" />
            </h2>
            <p className="text-sm text-brand-muted">
              <T k="home.howItWorksSubtitle" />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border border-brand-purple/30 flex items-center justify-center">
                <span className="text-sm font-bold text-brand-purple">01</span>
              </div>
              <h3 className="font-display text-lg font-medium text-white"><T k="home.step1Title" /></h3>
              <p className="text-sm text-white/40 leading-relaxed"><T k="home.step1Desc" /></p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border border-brand-purple/30 flex items-center justify-center">
                <span className="text-sm font-bold text-brand-purple">02</span>
              </div>
              <h3 className="font-display text-lg font-medium text-white"><T k="home.step2Title" /></h3>
              <p className="text-sm text-white/40 leading-relaxed"><T k="home.step2Desc" /></p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full border border-brand-purple/30 flex items-center justify-center">
                <span className="text-sm font-bold text-brand-purple">03</span>
              </div>
              <h3 className="font-display text-lg font-medium text-white"><T k="home.step3Title" /></h3>
              <p className="text-sm text-white/40 leading-relaxed"><T k="home.step3Desc" /></p>
            </div>
          </div>
        </section>

        {/* Featured vehicles */}
        {shuffled.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
            <div className="text-center space-y-2 mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                <T k="home.featuredVehicles" />
              </h2>
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
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              <T k="home.testimonials" />
            </h2>
            <p className="text-sm text-brand-muted">
              <T k="home.testimonialsSubtitle" />
            </p>
          </div>
          <TestimonialCarousel reviews={googleReviews} />
        </section>
        {/* Final CTA */}
        <section className="relative border-t border-white/[0.06] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-cyan/[0.02] to-transparent pointer-events-none" />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center relative z-10 space-y-6">
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-white">
              <T k="home.ctaTitle" />
            </h2>
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
                className="px-10 py-4 rounded-xl border border-white/[0.12] text-white text-base font-semibold hover:bg-brand-purple/[0.06] hover:border-brand-purple/40 hover:text-brand-purple transition-all duration-300"
              >
                <T k="home.getInTouch" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
      <ChatWidget />
    </CurrencyProvider>
    </LanguageProvider>
  )
}
