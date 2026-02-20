import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  // getClaims() validates the JWT signature — contains email, sub, etc. from the JWT payload
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims ?? null

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-2xl font-semibold">Welcome to LuxeClub</h1>
      {claims?.email && (
        <p className="text-white/60 text-sm">{claims.email}</p>
      )}
      <form action={logout}>
        <button
          type="submit"
          className="px-6 py-2 border border-white/20 text-white/80 text-sm hover:border-white/40 transition-colors"
        >
          Sign out
        </button>
      </form>
    </main>
  )
}
