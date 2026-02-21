import { createClient } from '@/lib/supabase/server'
import AccountProfileForm from './AccountProfileForm'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, home_address')
    .eq('id', user.id)
    .single()

  const memberSince = new Date(user.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">

        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">Account</h1>
          <p className="text-base text-brand-muted">Manage your profile.</p>
        </div>

        {/* Account Details */}
        <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <h2 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium mb-4">Account Details</h2>
          <div className="divide-y divide-white/[0.06]">
            <div className="flex items-start justify-between gap-4 py-3.5">
              <span className="text-sm text-white/50">Email</span>
              <span className="text-sm text-white font-medium">{user.email}</span>
            </div>
            <div className="flex items-start justify-between gap-4 py-3.5">
              <span className="text-sm text-white/50">Member since</span>
              <span className="text-sm text-white font-medium">{memberSince}</span>
            </div>
          </div>
        </section>

        {/* Editable Profile — Phone & Address */}
        <AccountProfileForm
          initialPhone={profile?.phone ?? ''}
          initialAddress={profile?.home_address ?? ''}
        />

        {/* Saved Cards */}
        <section className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <h2 className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium mb-4">Saved Cards</h2>
          <div className="flex items-center gap-4 py-4 text-center">
            <div className="w-full space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <p className="text-sm text-white/40">No saved cards yet</p>
              <p className="text-xs text-white/25">Cards will be saved automatically after your first booking payment.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
