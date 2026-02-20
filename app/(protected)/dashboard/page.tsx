import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  // getClaims() validates JWT signature — returns { data: { claims: JwtPayload } }, not { user }
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims ?? null

  return (
    <main className="min-h-screen bg-luxury flex flex-col">
      {/* Top navigation bar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
        <span className="font-display text-lg font-semibold text-white tracking-tight">
          LuxeClub
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs text-brand-muted hover:text-white transition-colors uppercase tracking-wider"
          >
            Sign out
          </button>
        </form>
      </nav>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <h2 className="font-display text-2xl text-white font-medium">
          Your fleet awaits
        </h2>
        <p className="text-sm text-brand-muted text-center max-w-xs">
          Browse our collection of luxury vehicles and find your perfect ride.
        </p>
        {claims?.email && (
          <p className="text-[11px] text-white/20">{claims.email}</p>
        )}

        {/* Catalogue CTA */}
        <Link
          href="/catalogue"
          className="mt-2 flex items-center gap-3 bg-brand-surface border border-brand-border rounded-[--radius-card] px-6 py-4 hover:border-brand-cyan/30 transition-colors duration-200 group"
        >
          <div className="space-y-0.5">
            <p className="font-display text-base font-medium text-white group-hover:text-brand-cyan transition-colors">
              Explore Our Collection
            </p>
            <p className="text-xs text-brand-muted">
              View available vehicles, specs, and rates
            </p>
          </div>
          <svg
            className="w-4 h-4 text-brand-cyan flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </main>
  )
}
