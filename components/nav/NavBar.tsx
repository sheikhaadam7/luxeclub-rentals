'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/actions/auth'
import { CurrencySelector, CurrencySelectorInline } from '@/components/nav/CurrencySelector'

const NAV_ITEMS_AUTH = [
  { href: '/catalogue', label: 'Cars' },
  { href: '/bookings', label: 'My Bookings' },
  { href: '/account', label: 'Account' },
  { href: '/contact', label: 'Contact' },
] as const

const NAV_ITEMS_PUBLIC = [
  { href: '/catalogue', label: 'Cars' },
  { href: '/contact', label: 'Contact' },
] as const

export function NavBar({ isAuthenticated = true }: { isAuthenticated?: boolean }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = isAuthenticated ? NAV_ITEMS_AUTH : NAV_ITEMS_PUBLIC

  function isActive(href: string) {
    if (href === '/catalogue') return pathname.startsWith('/catalogue') || pathname.startsWith('/book')
    return pathname.startsWith(href)
  }

  return (
    <nav className="glass border-b border-brand-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-lg font-semibold text-white tracking-tight transition-opacity duration-200 hover:opacity-70"
        >
          LuxeClub
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0.5">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={[
                'relative px-3.5 py-1.5 rounded-lg text-[13px] font-medium tracking-wide transition-all duration-200',
                isActive(href)
                  ? 'text-white bg-white/[0.08]'
                  : 'text-brand-muted hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {label}
            </Link>
          ))}

          <CurrencySelector />

          <div className="w-px h-4 bg-brand-border mx-2" />

          {isAuthenticated ? (
            <form action={logout}>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium tracking-wide text-brand-muted hover:text-white hover:bg-white/[0.04] transition-all duration-200"
              >
                Logout
              </button>
            </form>
          ) : (
            <Link
              href="/sign-in"
              className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium tracking-wide text-brand-muted hover:text-white hover:bg-white/[0.04] transition-all duration-200"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-brand-muted hover:text-white hover:bg-white/[0.06] transition-all duration-200"
          aria-label="Toggle menu"
        >
          <svg
            className={[
              'w-[18px] h-[18px] transition-transform duration-300',
              mobileOpen ? 'rotate-90' : '',
            ].join(' ')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      <div
        className={[
          'md:hidden overflow-hidden transition-all duration-300',
          mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="px-4 pb-4 pt-1 space-y-0.5">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={[
                'block px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200',
                isActive(href)
                  ? 'text-white bg-white/[0.08]'
                  : 'text-brand-muted hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {label}
            </Link>
          ))}
          <CurrencySelectorInline />
          {isAuthenticated ? (
            <form action={logout}>
              <button
                type="submit"
                className="w-full text-left px-4 py-3 rounded-xl text-[15px] font-medium text-brand-muted hover:text-white hover:bg-white/[0.04] transition-all duration-200"
              >
                Logout
              </button>
            </form>
          ) : (
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl text-[15px] font-medium text-brand-muted hover:text-white hover:bg-white/[0.04] transition-all duration-200"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
