import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'LuxeClub Rentals — Dubai\'s premium luxury car rental service. 3+ years of experience, 500+ happy clients, curated fleet of 29 luxury vehicles with 24/7 concierge.',
  openGraph: {
    title: 'About LuxeClub Rentals — Dubai Luxury Car Hire',
    description:
      'More than a rental company — a passion for extraordinary driving experiences in Dubai. Curated fleet, personal service, complete transparency.',
    url: 'https://www.luxeclubrentals.ae/about',
  },
  alternates: { canonical: 'https://www.luxeclubrentals.ae/about' },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-luxury">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 py-24 sm:py-32 text-center">
        <p className="text-sm text-white/40 uppercase tracking-[0.2em] font-medium mb-4">
          Our Story
        </p>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white leading-[1.1]">
          The Story Behind<br />
          <span className="text-white/50">LuxeClub</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/40 font-light leading-relaxed">
          Built by a frustrated customer who decided to do it properly.
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
              Why I Started LuxeClub
            </h2>
            <p className="text-sm text-white/50 leading-relaxed">
              I&apos;m originally from the UK. I first came to Dubai as a tourist and, like most visitors, wanted to rent a nice car to enjoy the city properly. What I got instead was a nightmare. The car I was shown online looked nothing like what turned up. There were scratches they tried to pin on me at return. The deposit &ldquo;hold&rdquo; turned into a battle to get back. And when I called to complain, nobody picked up.
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              It happened again on my next trip. Different company, same story — hidden fees buried in the fine print, a vehicle that clearly hadn&apos;t been serviced properly, and that sinking feeling of being taken advantage of because I was a visitor who didn&apos;t know any better.
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              After moving to Dubai, I realised this wasn&apos;t just my experience — it was everyone&apos;s. Friends, colleagues, hotel guests I spoke to, all had the same complaints. So I decided to build the rental company I wished had existed when I first landed here.
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              LuxeClub is built on a simple promise: no games. The price you see is the price you pay. Every car is inspected before it goes out. Deposits are straightforward and returned without a fight. And if something goes wrong, you can actually reach a real person — me, if it comes to it.
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              I&apos;m not trying to be the biggest car rental in Dubai. I just want to be the one people actually trust.
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '3+', label: 'Years in Dubai' },
              { value: '500+', label: 'Happy Clients' },
              { value: '29', label: 'Luxury Vehicles' },
              { value: '24/7', label: 'Concierge Service' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="font-display text-3xl sm:text-4xl font-semibold text-white">{stat.value}</p>
                <p className="text-sm text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission statement */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-medium text-white mb-6">
          What Sets Us Apart
        </h2>
        <p className="text-white/50 leading-relaxed">
          Most rental companies in Dubai operate the same way — flashy photos, vague pricing, and a deposit process designed to work against you. We do the opposite. Our pricing is upfront with no hidden fees. Our cars are genuinely maintained, not just washed and sent out. And our deposits? You get them back. It really is that simple. We treat every customer the way I wanted to be treated when I was the one handing over my card.
        </p>
      </section>

      {/* Values cards */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Curated Excellence',
              description: 'Every vehicle is hand-selected and meticulously maintained. We don\u2019t do average — our fleet is a collection, not an inventory.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ),
            },
            {
              title: 'Personal Touch',
              description: 'No call centres, no bots. You get a direct line to our team. Need a car delivered at 3 AM? Consider it done.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              ),
            },
            {
              title: 'Complete Transparency',
              description: 'The price you see is the price you pay. Insurance included, no hidden deposits, no last-minute surcharges. Trust built on honesty.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 space-y-4 hover:border-white/[0.15] transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center text-white/70">
                {card.icon}
              </div>
              <h3 className="font-display text-lg font-medium text-white">{card.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
