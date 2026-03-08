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
              <Link href="/rent-cheap-car-in-dubai" className="text-sm text-white/60 hover:text-white transition-colors duration-300">Affordable Rentals</Link>
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
              <a href="mailto:hello@luxeclubrentals.com" className="text-sm text-white/60 hover:text-white transition-colors duration-300 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                hello@luxeclubrentals.com
              </a>
            </div>
          </div>

          {/* Socials */}
          <div className="space-y-3">
            <h4 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">{t('footer.followUs')}</h4>
            <div className="flex items-center gap-4">
              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="#"
                aria-label="TikTok"
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.13a8.16 8.16 0 005.58 2.2V11.3a4.85 4.85 0 01-3.77-1.84V6.69h3.77z" />
                </svg>
              </a>

              {/* Snapchat */}
              <a
                href="#"
                aria-label="Snapchat"
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.04-.012.06-.012.1-.012.16 0 .3.044.42.137.18.134.24.33.24.493 0 .372-.36.678-.93.856-.33.105-.73.18-1.08.24-.12.03-.21.044-.27.06-.27.045-.39.12-.42.27-.03.12-.03.24-.06.36-.03.12-.06.27-.06.36 0 .12.06.224.18.27.36.135.75.24 1.17.36.66.18 1.35.36 1.95.66.18.09.33.21.42.36.06.12.09.24.09.36 0 .39-.33.72-.87.93-.63.24-1.47.36-2.34.42-.03.03-.06.12-.09.24-.03.09-.06.18-.12.3-.09.18-.24.3-.48.3h-.03c-.18 0-.39-.06-.66-.12-.33-.06-.75-.15-1.29-.15-.15 0-.33 0-.48.03-.6.06-1.11.36-1.59.66-.72.42-1.38.78-2.34.78-.03 0-.06 0-.09-.003-.03.003-.06.003-.09.003-.96 0-1.62-.36-2.34-.78-.48-.3-.99-.6-1.59-.66-.18-.03-.33-.03-.48-.03-.54 0-.96.09-1.29.15-.27.06-.48.12-.66.12h-.03c-.24 0-.39-.12-.48-.3-.06-.12-.09-.21-.12-.3-.03-.12-.06-.21-.09-.24-.87-.06-1.71-.18-2.34-.42-.54-.21-.87-.54-.87-.93 0-.12.03-.24.09-.36.09-.15.24-.27.42-.36.6-.3 1.29-.48 1.95-.66.42-.12.81-.225 1.17-.36.12-.045.18-.15.18-.27 0-.09-.03-.24-.06-.36-.03-.12-.03-.24-.06-.36-.03-.15-.15-.225-.42-.27-.06-.015-.15-.03-.27-.06-.36-.06-.75-.135-1.08-.24-.57-.18-.93-.484-.93-.856 0-.163.06-.36.24-.493.12-.09.26-.137.42-.137.04 0 .06 0 .1.012.26.09.62.228.92.214.2 0 .33-.045.4-.09-.01-.165-.02-.33-.03-.51l-.002-.06c-.105-1.628-.23-3.654.3-4.847C5.653 1.069 9.01.793 10 .793h.012z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} LuxeClub Rentals. {t('footer.rights')}
          </p>
          <p className="text-xs text-white/25">
            {t('footer.location')}
          </p>
        </div>
      </div>
    </footer>
  )
}
