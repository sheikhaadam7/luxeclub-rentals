import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { FleetTab } from '@/components/admin/FleetTab'
import { BookingsTab } from '@/components/admin/BookingsTab'
import { PaymentsTab } from '@/components/admin/PaymentsTab'
import { AnalyticsTab } from '@/components/admin/AnalyticsTab'
import { LocationsTab } from '@/components/admin/LocationsTab'

type TabId = 'fleet' | 'bookings' | 'payments' | 'analytics' | 'locations'
const VALID_TABS: TabId[] = ['fleet', 'bookings', 'payments', 'analytics', 'locations']

interface AdminPageProps {
  searchParams: Promise<{ tab?: string }>
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 bg-brand-surface border border-brand-border rounded-[--radius-card] animate-pulse"
        />
      ))}
    </div>
  )
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
            Fleet, bookings, payments, analytics, and locations
          </p>
        </div>

        {/* Tab navigation */}
        <AdminTabs activeTab={activeTab} />

        {/* Tab content */}
        {activeTab === 'fleet' && (
          <Suspense fallback={<TabSkeleton />}>
            <FleetTab />
          </Suspense>
        )}
        {activeTab === 'bookings' && (
          <Suspense fallback={<TabSkeleton />}>
            <BookingsTab />
          </Suspense>
        )}
        {activeTab === 'payments' && (
          <Suspense fallback={<TabSkeleton />}>
            <PaymentsTab />
          </Suspense>
        )}
        {activeTab === 'analytics' && (
          <Suspense fallback={<TabSkeleton />}>
            <AnalyticsTab />
          </Suspense>
        )}
        {activeTab === 'locations' && (
          <Suspense fallback={<TabSkeleton />}>
            <LocationsTab />
          </Suspense>
        )}

      </div>
    </main>
  )
}
