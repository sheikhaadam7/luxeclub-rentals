import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { FleetTab } from '@/components/admin/FleetTab'
import { BookingsTab } from '@/components/admin/BookingsTab'

type TabId = 'fleet' | 'bookings' | 'kyc' | 'payments' | 'analytics'
const VALID_TABS: TabId[] = ['fleet', 'bookings', 'kyc', 'payments', 'analytics']

interface AdminPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  // Admin role check — preserved exactly from original
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', claims.sub)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Resolve tab from URL search params (async in Next.js 15)
  const { tab: rawTab } = await searchParams
  const activeTab: TabId = VALID_TABS.includes(rawTab as TabId)
    ? (rawTab as TabId)
    : 'fleet'

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="font-display text-3xl font-semibold text-white tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-brand-muted text-sm mt-1">
            Fleet, bookings, identity, payments, and analytics
          </p>
        </div>

        {/* Tab navigation */}
        <AdminTabs activeTab={activeTab} />

        {/* Tab content */}
        {activeTab === 'fleet' && <FleetTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'kyc' && (
          <div className="text-brand-muted text-sm">
            Identity verification management — coming soon
          </div>
        )}
        {activeTab === 'payments' && (
          <div className="text-brand-muted text-sm">
            Payment management — coming soon
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="text-brand-muted text-sm">
            Analytics dashboard — coming soon
          </div>
        )}

      </div>
    </main>
  )
}
