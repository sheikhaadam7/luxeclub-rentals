'use client'

import { useState } from 'react'
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
  // Joined fields
  outlet_name: string
  outlet_domain: string
  outlet_tier: string
  outlet_priority: string
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-white/40'
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-brand-cyan'
  if (score >= 40) return 'text-amber-400'
  return 'text-white/50'
}

export function EditorsList({ editors }: { editors: EditorRow[] }) {
  const [minScore, setMinScore] = useState(0)
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [contactedFilter, setContactedFilter] = useState<'all' | 'contacted' | 'not-contacted'>('all')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [selectedEditor, setSelectedEditor] = useState<EditorRow | null>(null)

  const filtered = editors.filter((e) => {
    if ((e.combined_score ?? 0) < minScore) return false
    if (tierFilter !== 'all' && e.outlet_tier !== tierFilter) return false
    if (contactedFilter === 'contacted' && !e.contacted_at) return false
    if (contactedFilter === 'not-contacted' && e.contacted_at) return false
    return true
  })

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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Outlet</th>
                <th className="px-4 py-3 font-medium text-right">Profile</th>
                <th className="px-4 py-3 font-medium text-right">Topical</th>
                <th className="px-4 py-3 font-medium text-right">Combined</th>
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
                    <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${scoreColor(e.relevance_score)}`}>
                      {e.relevance_score ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${scoreColor(e.topical_score)}`}>
                      {e.topical_score ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${scoreColor(e.combined_score)}`}>
                      {e.combined_score ?? '—'}
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
