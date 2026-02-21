import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VehicleCard } from '@/components/catalogue/VehicleCard'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { CurrencyProvider } from '@/lib/currency/context'

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

  // Fetch 3 vehicles for the preview — rotate daily using a date-based offset
  // Use admin client to bypass RLS so vehicles show for unauthenticated visitors
  const adminSupabase = createAdminClient()
  const { data: featuredVehicles } = await adminSupabase
    .from('vehicles')
    .select('slug, name, category, primary_image_url, daily_rate, weekly_rate, monthly_rate')
    .eq('is_available', true)
    .order('name')

  const all = featuredVehicles ?? []
  const dayOffset = Math.floor(Date.now() / 86_400_000) % Math.max(all.length, 1)
  const shuffled = all.length <= 3
    ? all
    : Array.from({ length: 3 }, (_, i) => all[(dayOffset + i * 7) % all.length])

  return (
    <CurrencyProvider>
      <NavBar isAuthenticated={isAuthenticated} />
      <main className="min-h-screen bg-luxury">
        {/* Hero section with video background */}
        <div className="relative flex flex-col items-center justify-center gap-10 px-4 py-24 sm:py-36 overflow-hidden">
          {/* Background video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>

          {/* Subtle gradient for text readability */}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

          <div className="relative z-10 text-center space-y-6">
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-medium tracking-tight leading-[1.05]">
              <span className="animate-fade-in-left block" style={{ animationDelay: '0ms' }}>
                <span className="text-white/50">LuxeClub,</span>
              </span>
              <span className="animate-fade-in-left block" style={{ animationDelay: '200ms' }}>
                <span className="text-white">Car Rentals</span>
                <span className="text-white/50"> .</span>
              </span>
            </h1>
            <p className="animate-fade-in-left text-lg sm:text-xl text-white/40 font-light" style={{ animationDelay: '400ms' }}>
              Dubai&apos;s most trusted luxury car rental.
            </p>
          </div>

          {/* Garage CTA */}
          <Link
            href="/catalogue"
            className="animate-fade-in-left relative z-10 px-16 py-5 rounded-xl bg-white text-black text-lg font-semibold hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300 ease-out"
            style={{ animationDelay: '600ms' }}
          >
            Explore Our Fleet
          </Link>
        </div>

        {/* Trust stats bar */}
        <section className="border-y border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <p className="text-lg font-bold text-white">500+</p>
                </div>
                <p className="text-xs text-white/40">Clients Served</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-amber-400/60" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <p className="text-lg font-bold text-white">4.9</p>
                </div>
                <p className="text-xs text-white/40">Google Rating</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-green-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <p className="text-lg font-bold text-white">Licensed</p>
                </div>
                <p className="text-xs text-white/40">Licensed &amp; Insured</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-bold text-white">24/7</p>
                </div>
                <p className="text-xs text-white/40">Support Available</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted by strip */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-xs text-white/25 uppercase tracking-[0.2em] font-medium mb-6">As Featured In</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {['Gulf News', 'Time Out Dubai', 'Luxury Lifestyle', 'Arabian Business'].map((name) => (
              <span key={name} className="text-sm font-medium text-white/15 tracking-wide">{name}</span>
            ))}
          </div>
        </section>

        {/* What we do */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <h3 className="font-display text-3xl sm:text-4xl font-medium text-white mb-10">
            What we do
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Luxury Car Rentals */}
            <div className="border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-center py-10">
                <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                  </svg>
                </div>
              </div>
              <div className="p-6 text-center space-y-3">
                <h4 className="font-display text-xl font-medium text-white">Luxury Car Rentals</h4>
                <p className="text-sm text-white/40 leading-relaxed">
                  Luxury and supercar rentals, making a riveting offer to clients around the world to gain a taste of opulent luxury.
                </p>
              </div>
            </div>

            {/* Chauffeur Service */}
            <div className="border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-center py-10">
                <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
              </div>
              <div className="p-6 text-center space-y-3">
                <h4 className="font-display text-xl font-medium text-white">Chauffeur Service</h4>
                <p className="text-sm text-white/40 leading-relaxed">
                  We offer a round the clock bespoke chauffeur service with one of our ride in style fleet vehicles.
                </p>
              </div>
            </div>
          </div>

          {/* Pick Up and Drop Off — full width */}
          <div className="border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-center py-10">
              <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center">
                <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
            </div>
            <div className="p-6 text-center space-y-3">
              <h4 className="font-display text-xl font-medium text-white">Pick Up and Drop Off</h4>
              <p className="text-sm text-white/40 leading-relaxed">
                We offer a pick up and drop off service anywhere within Dubai.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
          <div className="text-center space-y-2 mb-12">
            <h3 className="font-display text-3xl sm:text-4xl font-medium text-white">
              How It Works
            </h3>
            <p className="text-sm text-brand-muted">
              From browsing to driving — in three simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Choose Your Car',
                description: 'Browse our curated fleet and find the perfect vehicle for your occasion. Filter by category, price or style.',
              },
              {
                step: '02',
                title: 'Book Instantly',
                description: 'Select your dates and pay securely online. No hidden fees — the price you see is the price you pay.',
              },
              {
                step: '03',
                title: 'We Deliver',
                description: 'We bring the car to you anywhere in Dubai, or pick up from our Downtown location. It\'s that simple.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full border border-white/[0.12] flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-cyan">{item.step}</span>
                </div>
                <h4 className="font-display text-lg font-medium text-white">{item.title}</h4>
                <p className="text-sm text-white/40 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured vehicles */}
        {shuffled.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
            <div className="text-center space-y-2 mb-10">
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                Featured Vehicles
              </h3>
              <p className="text-sm text-brand-muted">
                A selection from our premium fleet
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
                View all vehicles
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
              What Our Clients Say
            </h3>
            <p className="text-sm text-brand-muted">
              Trusted by discerning drivers across Dubai
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4 hover:border-white/[0.15] transition-all duration-300"
              >
                <StarRating count={t.rating} />
                <p className="text-sm text-white/80 leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-sm font-semibold text-white/60">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.location}</p>
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
              Ready to Drive Something Extraordinary?
            </h3>
            <p className="text-base text-white/40 leading-relaxed">
              Browse our fleet, pick your dates, and we&apos;ll handle the rest. Free delivery, insurance included, and 24/7 support.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/catalogue"
                className="px-10 py-4 rounded-xl bg-brand-cyan text-white text-base font-semibold hover:bg-brand-cyan-hover shadow-[0_0_20px_rgba(160,165,173,0.15)] hover:shadow-[0_0_30px_rgba(160,165,173,0.25)] transition-all duration-300"
              >
                Browse Fleet
              </Link>
              <Link
                href="/contact"
                className="px-10 py-4 rounded-xl border border-white/[0.12] text-white text-base font-semibold hover:bg-white/[0.04] hover:border-white/[0.2] transition-all duration-300"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </CurrencyProvider>
  )
}
