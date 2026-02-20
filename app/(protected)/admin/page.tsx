import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminDashboardData } from '@/app/actions/admin'
import { VehicleOverrideForm } from '@/components/admin/VehicleOverrideForm'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const minutes = Math.floor(diff / (1000 * 60))
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
}

export default async function AdminPage() {
  // Admin role check
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

  // Fetch dashboard data
  const result = await getAdminDashboardData()

  if ('error' in result) {
    return (
      <main className="min-h-screen bg-luxury flex items-center justify-center">
        <p className="text-red-400 text-sm">Error loading admin data: {result.error}</p>
      </main>
    )
  }

  const { lastRun, vehicles, isStale } = result

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="font-display text-3xl font-semibold text-white tracking-tight">
            Fleet Management
          </h1>
          <p className="text-brand-muted text-sm mt-1">
            Admin control panel — manage vehicle availability and monitor scraper health
          </p>
        </div>

        {/* Staleness alert */}
        {isStale && (
          <div className="flex items-start gap-3 bg-amber-400/10 border border-amber-400/30 rounded-[--radius-card] px-4 py-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-amber-400 text-sm font-medium">
                Scraper data is stale
                {lastRun ? ` — last run was ${timeAgo(lastRun.ran_at)}` : ' — no scraper runs found'}
              </p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                Vehicle data may be outdated. Run <code className="font-mono">npm run scrape</code> to refresh.
              </p>
            </div>
          </div>
        )}

        {/* Scraper error alert */}
        {lastRun?.status === 'error' && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-[--radius-card] px-4 py-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <p className="text-red-400 text-sm font-medium">Last scraper run failed</p>
              {lastRun.error_msg && (
                <p className="text-red-400/70 text-xs mt-0.5 font-mono">{lastRun.error_msg}</p>
              )}
            </div>
          </div>
        )}

        {/* Scraper run info */}
        <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-5">
          <h2 className="font-display text-lg font-medium text-white mb-3">
            Scraper Status
          </h2>
          {lastRun ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">Last Run</p>
                <p className="text-white">{formatDate(lastRun.ran_at)}</p>
                <p className="text-brand-muted text-xs mt-0.5">{timeAgo(lastRun.ran_at)}</p>
              </div>
              <div>
                <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">Vehicles Scraped</p>
                <p className="text-white">{lastRun.vehicle_count ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">Status</p>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wider ${
                    lastRun.status === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : lastRun.status === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {lastRun.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-brand-muted text-sm">
              No scraper runs found. Run <code className="font-mono text-xs bg-white/10 px-1 py-0.5 rounded">npm run scrape</code> to populate the database.
            </p>
          )}
        </div>

        {/* Vehicle list */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-medium text-white">
            Vehicles ({vehicles.length})
          </h2>

          {vehicles.length === 0 ? (
            <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6 text-center">
              <p className="text-brand-muted text-sm">No vehicles in database. Run the scraper first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <VehicleOverrideForm
                  key={vehicle.id}
                  id={vehicle.id}
                  slug={vehicle.slug}
                  name={vehicle.name}
                  isAvailable={vehicle.is_available}
                  overrideNotes={vehicle.override_notes ?? ''}
                  scrapedAt={vehicle.scraped_at}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
