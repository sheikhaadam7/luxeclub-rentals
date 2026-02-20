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

      {/* Content area — placeholder until Phase 2 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <h2 className="font-display text-2xl text-white font-medium">
          Your fleet awaits
        </h2>
        <p className="text-sm text-brand-muted text-center max-w-xs">
          Car catalogue coming in the next phase. You&apos;re authenticated.
        </p>
        {claims?.email && (
          <p className="text-[11px] text-white/20">{claims.email}</p>
        )}
      </div>
    </main>
  )
}
