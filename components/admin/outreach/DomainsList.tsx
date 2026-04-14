'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  discoverEditors,
  refreshDomainMetrics,
  refreshAllDomainMetrics,
  updateDomainPriorityScore,
} from '@/app/actions/outreach'
import { GlassTooltip } from '@/components/ui/GlassTooltip'

interface Domain {
  id: string
  domain: string
  outlet_name: string
  tier: string
  priority: string
  priority_score: number | null
  dr: number | null
  monthly_traffic: number | null
  metrics_fetched_at: string | null
  notes: string | null
  hunter_searched_at: string | null
}

const TIER_STYLES: Record<string, string> = {
  UAE: 'bg-green-500/20 text-green-400',
  Expat: 'bg-emerald-500/20 text-emerald-400',
  UK: 'bg-blue-500/20 text-blue-400',
  Germany: 'bg-purple-500/20 text-purple-400',
  Russia: 'bg-rose-500/20 text-rose-400',
  Europe: 'bg-indigo-500/20 text-indigo-400',
  Global: 'bg-white/10 text-white/70',
}

const DR_FLOOR = 40

function priorityColor(score: number | null): string {
  if (score == null) return 'bg-white/10 text-white/60'
  if (score >= 80) return 'bg-green-500/20 text-green-400'
  if (score >= 60) return 'bg-brand-cyan/20 text-brand-cyan'
  if (score >= 40) return 'bg-amber-400/20 text-amber-400'
  return 'bg-red-500/15 text-red-400'
}

function formatTraffic(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

type DomainSortKey = 'outlet' | 'tier' | 'dr' | 'traffic' | 'priority' | 'discovered'

export function DomainsList({ domains }: { domains: Domain[] }) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<DomainSortKey>('priority')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sortedDomains = useMemo(() => {
    const dir = sortDir === 'desc' ? -1 : 1
    const keyer = (d: Domain): number | string => {
      switch (sortKey) {
        case 'outlet': return d.outlet_name.toLowerCase()
        case 'tier': return d.tier.toLowerCase()
        case 'dr': return d.dr ?? -1
        case 'traffic': return d.monthly_traffic ?? -1
        case 'priority': return d.priority_score ?? -1
        case 'discovered': return d.hunter_searched_at ? new Date(d.hunter_searched_at).getTime() : -1
      }
    }
    return [...domains].sort((a, b) => {
      const ka = keyer(a); const kb = keyer(b)
      if (ka < kb) return -1 * dir
      if (ka > kb) return 1 * dir
      return 0
    })
  }, [domains, sortKey, sortDir])

  function toggleDomainSort(key: DomainSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'outlet' || key === 'tier' ? 'asc' : 'desc')
    }
  }

  function sortArrow(key: DomainSortKey) {
    if (sortKey !== key) return ''
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }
  const [discoverBusy, setDiscoverBusy] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [metricsBusy, setMetricsBusy] = useState<string | null>(null)
  const [batchBusy, setBatchBusy] = useState(false)
  const [batchMessage, setBatchMessage] = useState<string | null>(null)
  const [editingScore, setEditingScore] = useState<string | null>(null)
  const [scoreDraft, setScoreDraft] = useState<string>('')

  async function handleDiscover(domainId: string) {
    setDiscoverBusy((prev) => {
      const next = new Set(prev); next.add(domainId); return next
    })
    setResults((r) => {
      const next = { ...r }; delete next[domainId]; return next
    })
    try {
      const res = await discoverEditors(domainId)
      if (res.error) {
        setResults((r) => ({ ...r, [domainId]: { ok: false, message: res.error! } }))
      } else {
        const enrichedText = typeof res.enriched === 'number'
          ? `, enriched top ${res.enriched}`
          : ''
        setResults((r) => ({
          ...r,
          [domainId]: { ok: true, message: `+${res.inserted} editors (${res.skipped} skipped${enrichedText})` },
        }))
        router.refresh()
      }
    } finally {
      setDiscoverBusy((prev) => {
        const next = new Set(prev); next.delete(domainId); return next
      })
    }
  }

  async function handleDiscoverAll() {
    if (!confirm(`Discover editors across all ${sortedDomains.length} outlets in parallel? This will fire ${sortedDomains.length} Hunter searches at once.`)) return
    await Promise.all(sortedDomains.map((d) => handleDiscover(d.id)))
  }

  async function handleRefreshMetrics(domainId: string) {
    setMetricsBusy(domainId)
    const res = await refreshDomainMetrics(domainId)
    if (res.error) {
      setResults((r) => ({ ...r, [domainId]: { ok: false, message: res.error! } }))
    } else {
      router.refresh()
    }
    setMetricsBusy(null)
  }

  async function handleRefreshAll() {
    setBatchBusy(true)
    setBatchMessage('Fetching from Ahrefs…')
    const res = await refreshAllDomainMetrics()
    if (res.error) {
      setBatchMessage(`Failed: ${res.error}`)
    } else {
      setBatchMessage(`Updated ${res.updated}${res.failed ? ` (${res.failed} failed)` : ''}`)
      router.refresh()
    }
    setBatchBusy(false)
    setTimeout(() => setBatchMessage(null), 4000)
  }

  function beginEditScore(d: Domain) {
    setEditingScore(d.id)
    setScoreDraft(String(d.priority_score ?? 50))
  }

  async function commitScore(domainId: string) {
    const n = parseInt(scoreDraft, 10)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setEditingScore(null)
      return
    }
    setEditingScore(null)
    const res = await updateDomainPriorityScore(domainId, n)
    if (!res.error) router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-white">Target Outlets</h3>
        <div className="flex items-center gap-3">
          {batchMessage && (
            <span className="text-xs text-white/60">{batchMessage}</span>
          )}
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={batchBusy}
            className="px-3 py-1.5 text-xs border border-white/15 text-white hover:bg-white/5 transition-colors rounded disabled:opacity-50"
          >
            {batchBusy ? 'Refreshing…' : 'Refresh all metrics'}
          </button>
          <button
            type="button"
            onClick={handleDiscoverAll}
            disabled={discoverBusy.size > 0}
            className="px-3 py-1.5 text-xs bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/25 transition-colors rounded disabled:opacity-50"
          >
            {discoverBusy.size > 0 ? `Discovering ${discoverBusy.size}…` : 'Discover all'}
          </button>
          <p className="text-xs text-brand-muted">{domains.length} domains</p>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-brand-border">
            <tr className="text-left text-xs uppercase tracking-wider text-brand-muted">
              <th onClick={() => toggleDomainSort('outlet')} className="px-4 py-3 font-medium cursor-pointer select-none hover:text-white">
                <GlassTooltip label="Publication or brand name.">
                  <span>Outlet{sortArrow('outlet')}</span>
                </GlassTooltip>
              </th>
              <th className="px-4 py-3 font-medium">
                <GlassTooltip label="Root domain used by Hunter, Serper, and Ahrefs lookups.">
                  <span>Domain</span>
                </GlassTooltip>
              </th>
              <th onClick={() => toggleDomainSort('tier')} className="px-4 py-3 font-medium cursor-pointer select-none hover:text-white">
                <GlassTooltip label="Audience locality — who primarily reads this outlet (UAE, Expat, UK, Germany, Russia, Global, etc.).">
                  <span>Location{sortArrow('tier')}</span>
                </GlassTooltip>
              </th>
              <th onClick={() => toggleDomainSort('dr')} className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white">
                <GlassTooltip label="Domain Rating from Ahrefs (0–100). Measures the strength of the site's backlink profile and is a good proxy for the SEO value of a link. Outlets with DR below 40 are flagged with a warning badge.">
                  <span>DR{sortArrow('dr')}</span>
                </GlassTooltip>
              </th>
              <th onClick={() => toggleDomainSort('traffic')} className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white">
                <GlassTooltip label="Estimated monthly organic search traffic from Ahrefs (sum across subdomains where available). Display-only — not used in scoring.">
                  <span>Traffic{sortArrow('traffic')}</span>
                </GlassTooltip>
              </th>
              <th onClick={() => toggleDomainSort('priority')} className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white">
                <GlassTooltip label="Editorial priority score (0–100). Our rubric: section fit (does the outlet have a Motors/Travel/Luxury section?) + geographic fit (UAE > expat > UK/DE/RU) + reachability (smaller outlets respond to cold pitches). Click a row value to edit." width="w-80">
                  <span>Priority{sortArrow('priority')}</span>
                </GlassTooltip>
              </th>
              <th onClick={() => toggleDomainSort('discovered')} className="px-4 py-3 font-medium cursor-pointer select-none hover:text-white">
                <GlassTooltip label="Last time we ran Hunter to pull editors from this outlet.">
                  <span>Discovered{sortArrow('discovered')}</span>
                </GlassTooltip>
              </th>
              <th className="px-4 py-3 font-medium text-right">
                <GlassTooltip label="Refresh Ahrefs DR + traffic metrics, or run Hunter editor discovery.">
                  <span>Actions</span>
                </GlassTooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDomains.map((d) => {
              const result = results[d.id]
              const isBusy = discoverBusy.has(d.id)
              const isMetricsBusy = metricsBusy === d.id
              const drLow = d.dr != null && d.dr < DR_FLOOR
              return (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">
                    <div className="flex items-center gap-2">
                      {d.outlet_name}
                      {drLow && (
                        <span
                          title={`DR ${d.dr} is below the ${DR_FLOOR} threshold — pitches here will have lower SEO value.`}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30"
                        >
                          DR&lt;{DR_FLOOR}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-muted font-mono text-xs">{d.domain}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${TIER_STYLES[d.tier] ?? 'bg-white/10 text-white/60'}`}>
                      {d.tier}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs ${drLow ? 'text-red-400' : 'text-white/70'}`}>
                    {d.dr ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-white/70">
                    {formatTraffic(d.monthly_traffic)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingScore === d.id ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={scoreDraft}
                        autoFocus
                        onChange={(e) => setScoreDraft(e.target.value)}
                        onBlur={() => commitScore(d.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitScore(d.id)
                          if (e.key === 'Escape') setEditingScore(null)
                        }}
                        className="w-14 bg-brand-surface border border-brand-cyan text-white text-xs font-mono rounded px-2 py-0.5 text-right outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEditScore(d)}
                        title="Click to edit priority score (0-100)"
                        className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded ${priorityColor(d.priority_score)} hover:ring-1 hover:ring-white/20`}
                      >
                        {d.priority_score ?? '—'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {d.hunter_searched_at
                      ? new Date(d.hunter_searched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-y-1">
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleRefreshMetrics(d.id)}
                        disabled={isMetricsBusy}
                        className="px-2 py-1 text-[11px] border border-white/15 text-white/70 hover:bg-white/5 transition-colors rounded disabled:opacity-50"
                        title={d.metrics_fetched_at ? `Last fetched ${new Date(d.metrics_fetched_at).toLocaleString()}` : 'Fetch DR + traffic from Ahrefs'}
                      >
                        {isMetricsBusy ? '…' : '↻ metrics'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscover(d.id)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs border border-white/15 text-white hover:bg-white/5 transition-colors rounded disabled:opacity-50 disabled:cursor-wait"
                      >
                        {isBusy ? 'Searching…' : d.hunter_searched_at ? 'Re-discover' : 'Discover editors'}
                      </button>
                    </div>
                    {result && (
                      <p className={`text-[11px] ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {result.message}
                      </p>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
