'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { logout } from '@/app/actions/auth'
import { CurrencySelector, CurrencySelectorInline } from '@/components/nav/CurrencySelector'
import { LanguageSelector, LanguageSelectorInline } from '@/components/nav/LanguageSelector'
import { useTranslation } from '@/lib/i18n/context'
import { BackgroundMusic } from '@/components/ui/BackgroundMusic'

export function NavBar({ isAuthenticated = true }: { isAuthenticated?: boolean }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()

  const navItems = isAuthenticated
    ? [
        { href: '/catalogue', label: t('nav.cars') },
        { href: '/bookings', label: t('nav.bookings') },
        { href: '/account', label: t('nav.account') },
        { href: '/contact', label: t('nav.contact') },
      ]
    : [
        { href: '/catalogue', label: t('nav.cars') },
        { href: '/booking-lookup', label: t('nav.manageBookings') },
        { href: '/contact', label: t('nav.contact') },
      ]

  function isActive(href: string) {
    if (href === '/catalogue') return pathname.startsWith('/catalogue') || pathname.startsWith('/book/')
    return pathname.startsWith(href)
  }

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Close on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Build menu items (links + auth — currency/language are separate at bottom)
  const menuItems: Array<{ type: 'link'; href: string; label: string } | { type: 'auth' }> = [
    ...navItems.map((item) => ({ type: 'link' as const, ...item })),
    { type: 'auth' },
  ]

  return (
    <>
      <nav className="glass border-b border-brand-border sticky top-0 z-[70]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-3xl font-semibold text-white tracking-tight transition-opacity duration-200 hover:opacity-70 animate-fade-in-left"
          >
            <span className="block">LuxeClub</span>
            <span className="block text-[10px] font-body text-white/30 font-normal tracking-wide">
              {t('nav.tagline')}
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'relative px-4 py-2 rounded-lg text-[15px] font-medium tracking-wide transition-all duration-200',
                  isActive(href)
                    ? 'text-white bg-white/[0.08]'
                    : 'text-brand-muted hover:text-white hover:bg-white/[0.04]',
                ].join(' ')}
              >
                {label}
              </Link>
            ))}

            <CurrencySelector />
            <div className="w-1.5" />
            <LanguageSelector />
            <div className="w-px h-4 bg-brand-border mx-2" />
            <BackgroundMusic />
            <div className="w-px h-4 bg-brand-border mx-2" />

            {isAuthenticated ? (
              <form action={logout}>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-[15px] font-medium tracking-wide text-brand-muted hover:text-white hover:bg-white/[0.04] transition-all duration-200"
                >
                  {t('nav.logout')}
                </button>
              </form>
            ) : (
              <Link
                href="/sign-in"
                className="px-4 py-2 rounded-lg text-[15px] font-medium tracking-wide text-brand-muted hover:text-white hover:bg-white/[0.04] transition-all duration-200"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>

          {/* Mobile hamburger — animated 3-line → X morph */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden relative flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors duration-200"
            aria-label="Toggle menu"
          >
            <div className="w-[18px] h-[14px] relative">
              <span
                className="absolute left-0 w-full h-[1.5px] bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)]"
                style={{
                  top: mobileOpen ? '6px' : '0px',
                  transform: mobileOpen ? 'rotate(45deg)' : 'rotate(0)',
                }}
              />
              <span
                className="absolute left-0 top-[6px] w-full h-[1.5px] bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)]"
                style={{
                  opacity: mobileOpen ? 0 : 1,
                  transform: mobileOpen ? 'scaleX(0)' : 'scaleX(1)',
                }}
              />
              <span
                className="absolute left-0 w-full h-[1.5px] bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)]"
                style={{
                  top: mobileOpen ? '6px' : '12px',
                  transform: mobileOpen ? 'rotate(-45deg)' : 'rotate(0)',
                }}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile overlay + panel */}
      <div
        className={[
          'fixed inset-0 z-[60] md:hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          mobileOpen ? 'visible' : 'invisible pointer-events-none',
        ].join(' ')}
      >
        {/* Backdrop */}
        <div
          onClick={closeMobile}
          className={[
            'absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />

        {/* Panel — full height below navbar, flex column so currency/language stick to bottom */}
        <div
          className={[
            'absolute top-16 left-0 right-0 bottom-0 bg-[#0a0a0a]/95 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col',
            mobileOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-4 opacity-0',
          ].join(' ')}
        >
          {/* Nav links + auth */}
          <div className="px-5 pt-3 pb-4 space-y-1 flex-1">
            {menuItems.map((item, i) => {
              const delay = `${60 + i * 40}ms`
              const staggerStyle = {
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(-8px)',
                transition: `opacity 400ms cubic-bezier(0.32,0.72,0,1) ${mobileOpen ? delay : '0ms'}, transform 400ms cubic-bezier(0.32,0.72,0,1) ${mobileOpen ? delay : '0ms'}`,
              }

              if (item.type === 'link') {
                return (
                  <div key={item.href} style={staggerStyle}>
                    <Link
                      href={item.href}
                      onClick={closeMobile}
                      className={[
                        'flex items-center px-4 py-3.5 rounded-2xl text-[16px] font-medium tracking-[-0.01em] transition-colors duration-200 active:scale-[0.98]',
                        isActive(item.href)
                          ? 'text-white bg-white/[0.08]'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.05] active:bg-white/[0.08]',
                      ].join(' ')}
                    >
                      {item.label}
                    </Link>
                  </div>
                )
              }

              // Auth item
              const authDelay = `${60 + i * 40}ms`
              return (
                <div key="auth" style={{
                  opacity: mobileOpen ? 1 : 0,
                  transform: mobileOpen ? 'translateY(0)' : 'translateY(-8px)',
                  transition: `opacity 400ms cubic-bezier(0.32,0.72,0,1) ${mobileOpen ? authDelay : '0ms'}, transform 400ms cubic-bezier(0.32,0.72,0,1) ${mobileOpen ? authDelay : '0ms'}`,
                }}>
                  <div className="mx-4 my-2 border-t border-white/[0.06]" />
                  {isAuthenticated ? (
                    <form action={logout}>
                      <button
                        type="submit"
                        className="w-full text-left flex items-center px-4 py-3.5 rounded-2xl text-[16px] font-medium tracking-[-0.01em] text-white/60 hover:text-white hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors duration-200 active:scale-[0.98]"
                      >
                        {t('nav.logout')}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href="/sign-in"
                      onClick={closeMobile}
                      className="flex items-center px-4 py-3.5 rounded-2xl text-[16px] font-medium tracking-[-0.01em] text-white/60 hover:text-white hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors duration-200 active:scale-[0.98]"
                    >
                      {t('nav.signIn')}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>

          {/* Currency + Language selectors — pinned to bottom */}
          <div
            className="px-6 pb-8 pt-2 border-t border-white/[0.06] space-y-2"
            style={{
              opacity: mobileOpen ? 1 : 0,
              transform: mobileOpen ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 400ms cubic-bezier(0.32,0.72,0,1) ${mobileOpen ? `${60 + menuItems.length * 40}ms` : '0ms'}, transform 400ms cubic-bezier(0.32,0.72,0,1) ${mobileOpen ? `${60 + menuItems.length * 40}ms` : '0ms'}`,
            }}
          >
            <CurrencySelectorInline />
            <LanguageSelectorInline />
            <div className="flex items-center gap-2 px-2 py-2">
              <BackgroundMusic />
              <span className="text-xs text-white/40">Music</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
