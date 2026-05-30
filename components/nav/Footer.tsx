'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-white/[0.06] bg-black/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">

          {/* Brand */}
          <div className="space-y-3">
            <h4 className="font-display text-xl font-medium bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">LuxeClub</h4>
            <p className="text-sm text-white/40 leading-relaxed italic">
              {t('footer.tagline')}
            </p>
            <div className="flex flex-col gap-1.5 pt-1">
              <p className="text-xs text-white/30 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                {t('footer.licensedRTA')}
              </p>
              <p className="text-xs text-white/30 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('footer.concierge247')}
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">{t('footer.quickLinks')}</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/catalogue" className="text-sm text-white/60 hover:text-white transition-colors duration-300">
                {t('footer.fleet')}
              </Link>
              <Link href="/faq" className="text-sm text-white/60 hover:text-white transition-colors duration-300">
                {t('footer.faq')}
              </Link>
              <Link href="/contact" className="text-sm text-white/60 hover:text-white transition-colors duration-300">
                {t('footer.contactUs')}
              </Link>
              <Link href="/about" className="text-sm text-white/60 hover:text-white transition-colors duration-300">
                {t('footer.aboutUs')}
              </Link>
              <Link href="/guides" className="text-sm text-white/60 hover:text-white transition-colors duration-300">
                {t('footer.guides')}
              </Link>
              <Link href="/account" className="text-sm text-white/60 hover:text-white transition-colors duration-300">
                {t('footer.account')}
              </Link>
            </nav>
          </div>

          {/* Rent by Brand */}
          <div className="space-y-3">
            <h4 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Rent by Brand</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/rent-lamborghini-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Lamborghini</Link>
              <Link href="/rent-ferrari-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Ferrari</Link>
              <Link href="/rent-rolls-royce-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Rolls Royce</Link>
              <Link href="/rent-bentley-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Bentley</Link>
              <Link href="/rent-porsche-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Porsche</Link>
              <Link href="/rent-mercedes-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Mercedes</Link>
              <Link href="/rent-range-rover-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Range Rover</Link>
              <Link href="/rent-mclaren-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">McLaren</Link>
              <Link href="/rent-aston-martin-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Aston Martin</Link>
              <Link href="/rent-bmw-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">BMW</Link>
              <Link href="/rent-audi-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Audi</Link>
              <Link href="/rent-maserati-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Maserati</Link>
              <Link href="/rent-cadillac-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Cadillac</Link>
            </nav>
          </div>

          {/* Rent by Type */}
          <div className="space-y-3">
            <h4 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Rent by Type</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/rent-luxury-suv-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Luxury SUVs</Link>
              <Link href="/rent-sports-car-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Sports Cars</Link>
              <Link href="/rent-convertible-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Convertibles</Link>
              <Link href="/rent-luxury-car-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Luxury Cars</Link>
              <Link href="/rent-supercar-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Supercars</Link>
              <Link href="/rent-exotic-car-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Exotic Cars</Link>
              <Link href="/rent-cheap-car-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Affordable Rentals</Link>
            </nav>
          </div>

          {/* Popular Searches */}
          <div className="space-y-3">
            <h4 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Popular Searches</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/car-rental-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Car Rental Dubai</Link>
              <Link href="/luxury-car-rental-no-deposit-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">No Deposit Rental</Link>
              <Link href="/rent-luxury-suv-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Luxury SUV Rental</Link>
              <Link href="/rent-supercar-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Supercar Rental</Link>
              <Link href="/rent-cheap-car-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Affordable Rental</Link>
              <Link href="/catalogue" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Monthly Rental</Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">{t('footer.contact')}</h4>
            <div className="flex flex-col gap-2.5">
              <a href="https://maps.google.com/?q=Binary+Tower+Marasi+Drive+Business+Bay+Dubai" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors duration-300 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Binary Tower, 32 Marasi Drive, Business Bay, Dubai, UAE
              </a>
              <a href="tel:+971588086137" className="text-sm text-white/60 hover:text-white transition-colors duration-300 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                +971 58 808 6137
              </a>
              <a href="mailto:bookings@luxeclubrentals.com" className="text-sm text-white/60 hover:text-white transition-colors duration-300 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                bookings@luxeclubrentals.com
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} LuxeClub Rentals. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/25">
            <Link href="/privacy" className="hover:text-white/60 transition-colors duration-300">Privacy Policy</Link>
            <span>{t('footer.location')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
