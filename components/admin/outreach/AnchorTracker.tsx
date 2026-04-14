import { createAdminClient } from '@/lib/supabase/admin'
import { computeAnchorMix, computeUrlDistribution, ANCHOR_TARGETS } from '@/lib/outreach/tracker'

export async function AnchorTracker() {
  const admin = createAdminClient()
  const [mix, urls] = await Promise.all([
    computeAnchorMix(admin),
    computeUrlDistribution(admin),
  ])

  if (mix.total === 0) {
    return null // Don't show anything until first pitch sent
  }

  const rows: Array<{ type: keyof typeof ANCHOR_TARGETS; label: string }> = [
    { type: 'branded', label: 'Branded' },
    { type: 'url', label: 'URL' },
    { type: 'generic', label: 'Generic' },
    { type: 'partial', label: 'Partial' },
    { type: 'exact', label: 'Exact' },
  ]

  return (
    <div className="bg-brand-surface border border-brand-border rounded p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-white">Anchor Mix & URL Distribution</h3>
        <p className="text-xs text-brand-muted">{mix.total} live pitches</p>
      </div>

      {/* Anchor mix */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-brand-muted">Anchor Mix</p>
        <div className="space-y-1.5">
          {rows.map(({ type, label }) => {
            const actual = mix.percents[type]
            const target = ANCHOR_TARGETS[type]
            const delta = actual - target
            const status = Math.abs(delta) <= 5 ? 'ok' : delta > 0 ? 'over' : 'under'
            const color = status === 'ok' ? 'text-green-400' : status === 'over' ? 'text-amber-400' : 'text-white/60'
            return (
              <div key={type} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-white/70">{label}</span>
                <div className="flex-1 h-2 bg-white/5 rounded overflow-hidden relative">
                  <div className={`h-full ${status === 'over' ? 'bg-amber-400/60' : status === 'under' ? 'bg-brand-cyan/40' : 'bg-green-400/60'}`} style={{ width: `${actual}%` }} />
                  <div className="absolute top-0 h-full w-px bg-white/40" style={{ left: `${target}%` }} title={`Target: ${target}%`} />
                </div>
                <span className={`font-mono w-16 text-right ${color}`}>
                  {actual}% / {target}%
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-white/40 mt-1">
          Vertical line = target. Green = within 5% of target. Amber = over-indexed (slow down on this anchor type).
        </p>
      </div>

      {/* Target URL distribution */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-brand-muted">Target URL Distribution</p>
        <div className="space-y-1">
          {urls.byUrl.slice(0, 10).map((u) => {
            const isHomepage = u.url === '/' || u.url === '/home'
            const flag = isHomepage && u.percent > 25
            return (
              <div key={u.url} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-white/70 truncate flex-1">{u.url}</span>
                <span className={`font-mono ${flag ? 'text-red-400' : 'text-white/80'}`}>
                  {u.count} ({u.percent}%)
                </span>
              </div>
            )
          })}
        </div>
        {urls.homepagePercent > 25 && (
          <p className="text-[11px] text-red-400 mt-1">
            ⚠ Homepage at {urls.homepagePercent}%. Target: max 25%. Diversify next pitches to inner pages.
          </p>
        )}
      </div>
    </div>
  )
}
