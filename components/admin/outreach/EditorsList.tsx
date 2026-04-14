'use client'

import { useMemo, useState } from 'react'
import { EditorDetail } from './EditorDetail'

export interface EditorRow {
  id: string
  domain_id: string
  email: string
  first_name: string | null
  last_name: string | null
  position: string | null
  seniority: string | null
  department: string | null
  linkedin_url: string | null
  twitter_handle: string | null
  confidence: number | null
  relevance_score: number | null
  topical_score: number | null
  combined_score: number | null
  articles_fetched_at: string | null
  contacted_at: string | null
  bio_fetched_at: string | null
  bio_text: string | null
  bio_url: string | null
  ai_summary: string | null
  linkedin_title: string | null
  linkedin_scraped_at: string | null
  external_bio_text: string | null
  external_bio_url: string | null
  external_bio_source: string | null
  external_fetched_at: string | null
  twitter_bio: string | null
  // Joined fields
  outlet_name: string
  outlet_domain: string
  outlet_tier: string
  outlet_priority: string
}

type SortKey = 'profile' | 'topical' | 'combined' | 'name' | 'outlet'

function scorePillClass(score: number | null): string {
  if (score == null) return 'bg-white/5 text-white/40 border-white/10'
  if (score >= 80) return 'bg-green-500/15 text-green-400 border-green-500/30'
  if (score >= 60) return 'bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30'
  if (score >= 40) return 'bg-amber-400/15 text-amber-400 border-amber-400/30'
  if (score >= 20) return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}

function breakdown(profile: number | null, topical: number | null, combined: number | null): string {
  if (combined == null) return 'Not scored yet'
  if (topical == null) return `Profile-only: ${profile ?? 0}/100 (no articles indexed yet)`
  return `Profile ${profile ?? 0} × 60% + Topical ${topical} × 40% = ${combined}/100`
}

export function EditorsList({ editors }: { editors: EditorRow[] }) {
  const [minScore, setMinScore] = useState(40)
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [contactedFilter, setContactedFilter] = useState<'all' | 'contacted' | 'not-contacted'>('all')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [selectedEditor, setSelectedEditor] = useState<EditorRow | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('combined')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    const base = editors.filter((e) => {
      if ((e.combined_score ?? 0) < minScore) return false
      if (tierFilter !== 'all' && e.outlet_tier !== tierFilter) return false
      if (contactedFilter === 'contacted' && !e.contacted_at) return false
      if (contactedFilter === 'not-contacted' && e.contacted_at) return false
      return true
    })

    const dir = sortDir === 'desc' ? -1 : 1
    const keyer = (e: EditorRow): number | string => {
      switch (sortKey) {
        case 'profile': return e.relevance_score ?? -1
        case 'topical': return e.topical_score ?? -1
        case 'combined': return e.combined_score ?? -1
        case 'name': return [e.first_name, e.last_name].filter(Boolean).join(' ').toLowerCase()
        case 'outlet': return e.outlet_name.toLowerCase()
      }
    }
    return [...base].sort((a, b) => {
      const ka = keyer(a); const kb = keyer(b)
      if (ka < kb) return -1 * dir
      if (ka > kb) return 1 * dir
      return 0
    })
  }, [editors, minScore, tierFilter, contactedFilter, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'outlet' ? 'asc' : 'desc')
    }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return ''
    return sortDir === 'desc' ? ' ↓' : ' ↑'
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tiers = Array.from(new Set(editors.map((e) => e.outlet_tier))).sort()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-white">Discovered Editors</h3>
        <p className="text-xs text-brand-muted">
          {filtered.length} of {editors.length} editors
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-brand-surface border border-brand-border p-3 rounded">
        <div className="flex items-center gap-2">
          <label className="text-xs text-brand-muted">Min score:</label>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
            className="w-32 accent-brand-cyan"
          />
          <span className="text-xs text-white font-mono w-8">{minScore}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-brand-muted">Tier:</label>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-xs bg-brand-surface border border-white/10 text-white px-2 py-1 rounded"
          >
            <option value="all">All</option>
            {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-brand-muted">Status:</label>
          <select
            value={contactedFilter}
            onChange={(e) => setContactedFilter(e.target.value as 'all' | 'contacted' | 'not-contacted')}
            className="text-xs bg-brand-surface border border-white/10 text-white px-2 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="not-contacted">Not contacted</option>
            <option value="contacted">Contacted</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border p-6 rounded text-center">
          <p className="text-sm text-white/60">
            {editors.length === 0
              ? 'No editors discovered yet. Use the Discover editors button on a domain above.'
              : 'No editors match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-brand-border">
              <tr className="text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-white" onClick={() => toggleSort('name')}>Name{sortArrow('name')}</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-white" onClick={() => toggleSort('outlet')}>Outlet{sortArrow('outlet')}</th>
                <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('profile')} title="Profile score (Hunter data: title, seniority, tier)">Profile{sortArrow('profile')}</th>
                <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('topical')} title="Topical score (article history relevance)">Topical{sortArrow('topical')}</th>
                <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('combined')} title="60% profile + 40% topical">Combined{sortArrow('combined')}</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Links</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || '—'
                const isRevealed = revealed.has(e.id)
                return (
                  <tr
                    key={e.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => setSelectedEditor(e)}
                  >
                    <td className="px-4 py-3 text-white font-medium">{name}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{e.position ?? '—'}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{e.outlet_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded border font-mono text-[11px] font-semibold ${scorePillClass(e.relevance_score)}`}>
                        {e.relevance_score ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded border font-mono text-[11px] font-semibold ${scorePillClass(e.topical_score)}`}>
                        {e.topical_score ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        title={breakdown(e.relevance_score, e.topical_score, e.combined_score)}
                        className={`inline-block px-2.5 py-1 rounded border font-mono text-xs font-bold ${scorePillClass(e.combined_score)}`}
                      >
                        {e.combined_score != null ? `${e.combined_score}/100` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                      {isRevealed ? (
                        <a href={`mailto:${e.email}`} className="text-xs text-brand-cyan hover:underline font-mono">
                          {e.email}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleReveal(e.id)}
                          className="text-[11px] text-white/50 hover:text-white underline"
                        >
                          reveal
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs space-x-2" onClick={(ev) => ev.stopPropagation()}>
                      {e.linkedin_url && (
                        <a href={e.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">in</a>
                      )}
                      {e.twitter_handle && (
                        <a href={`https://twitter.com/${e.twitter_handle}`} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:underline">x</a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.contacted_at ? (
                        <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">contacted</span>
                      ) : (
                        <span className="text-[11px] text-white/40">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedEditor && (
        <EditorDetail editor={selectedEditor} onClose={() => setSelectedEditor(null)} />
      )}
    </div>
  )
}
