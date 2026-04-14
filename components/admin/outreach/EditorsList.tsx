'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditorDetail } from './EditorDetail'
import {
  recalculateAllArticleScores,
  deleteEditors,
  setEditorsContacted,
  rescoreEditors,
  classifyBeatsBulk,
} from '@/app/actions/outreach'
import { GlassTooltip } from '@/components/ui/GlassTooltip'

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
  beats: string[] | null
  beat_summary: string | null
  beats_classified_at: string | null
  pitch_preferences: Record<string, unknown> | null
  preferences_scraped_at: string | null
  last_seen_at: string | null
  went_quiet_at: string | null
  // Joined fields
  outlet_name: string
  outlet_domain: string
  outlet_tier: string
  outlet_priority: string
  outlet_dr: number | null
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
  if (topical == null) return `Match-only: ${profile ?? 0}/100 (no articles indexed yet)`
  return `Match ${profile ?? 0} × 60% + Coverage ${topical} × 40% = ${combined}/100`
}

export function EditorsList({ editors }: { editors: EditorRow[] }) {
  const [minOverall, setMinOverall] = useState(40)
  const [minMatch, setMinMatch] = useState(0)
  const [minCoverage, setMinCoverage] = useState(0)
  const [minDr, setMinDr] = useState(0)
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [contactedFilter, setContactedFilter] = useState<'all' | 'contacted' | 'not-contacted'>('all')
  const [search, setSearch] = useState('')
  const [beatFilter, setBeatFilter] = useState<string>('all')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [selectedEditor, setSelectedEditor] = useState<EditorRow | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('combined')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const router = useRouter()
  const [isRecalc, startRecalcTransition] = useTransition()
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isBulkBusy, startBulkTransition] = useTransition()
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function flashBulk(text: string) {
    setBulkMessage(text)
    setTimeout(() => setBulkMessage(null), 4000)
  }

  function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Permanently delete ${selected.size} editor(s)? Articles and pitch history will also be removed.`)) return
    startBulkTransition(async () => {
      const ids = [...selected]
      const res = await deleteEditors(ids)
      if (res.error) flashBulk(`Delete failed: ${res.error}`)
      else {
        flashBulk(`Deleted ${res.deleted} editor(s)`)
        setSelected(new Set())
        router.refresh()
      }
    })
  }

  function handleDeleteOne(id: string, name: string) {
    if (!confirm(`Delete ${name}? Their articles and any pitch history will also be removed.`)) return
    startBulkTransition(async () => {
      const res = await deleteEditors([id])
      if (res.error) flashBulk(`Delete failed: ${res.error}`)
      else {
        flashBulk(`Deleted ${name}`)
        setSelected((prev) => {
          const next = new Set(prev); next.delete(id); return next
        })
        router.refresh()
      }
    })
  }

  function handleBulkContact(contacted: boolean) {
    if (selected.size === 0) return
    startBulkTransition(async () => {
      const res = await setEditorsContacted([...selected], contacted)
      if (res.error) flashBulk(`Update failed: ${res.error}`)
      else {
        flashBulk(`Marked ${res.updated} as ${contacted ? 'contacted' : 'not contacted'}`)
        setSelected(new Set())
        router.refresh()
      }
    })
  }

  function handleBulkRescore() {
    if (selected.size === 0) return
    startBulkTransition(async () => {
      const res = await rescoreEditors([...selected])
      if (res.error) flashBulk(`Rescore failed: ${res.error}`)
      else {
        flashBulk(`Rescored ${res.updated} editor(s)`)
        router.refresh()
      }
    })
  }

  function handleBulkClassifyBeats() {
    if (selected.size === 0) return
    if (!confirm(`Run beat classification for ${selected.size} editor(s)? Uses ~1 Claude Haiku call each.`)) return
    flashBulk('Classifying beats…')
    startBulkTransition(async () => {
      const res = await classifyBeatsBulk([...selected])
      if (res.error) flashBulk(`Failed: ${res.error}`)
      else {
        flashBulk(`Classified beats for ${res.updated} editor(s)`)
        router.refresh()
      }
    })
  }

  function handleBulkExport() {
    if (selected.size === 0) return
    const rows = editors.filter((e) => selected.has(e.id))
    const header = [
      'Name', 'Email', 'Position', 'Department', 'Outlet', 'Domain',
      'Location', 'DR', 'Match', 'Coverage', 'Overall',
      'LinkedIn', 'Twitter', 'Contacted',
    ]
    const csv = [
      header.join(','),
      ...rows.map((e) => [
        [e.first_name, e.last_name].filter(Boolean).join(' '),
        e.email, e.position ?? '', e.department ?? '',
        e.outlet_name, e.outlet_domain, e.outlet_tier, e.outlet_dr ?? '',
        e.relevance_score ?? '', e.topical_score ?? '', e.combined_score ?? '',
        e.linkedin_url ?? '', e.twitter_handle ?? '',
        e.contacted_at ? new Date(e.contacted_at).toISOString() : '',
      ].map((v) => {
        const s = String(v).replace(/"/g, '""')
        return /[,"\n]/.test(s) ? `"${s}"` : s
      }).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `editors-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    flashBulk(`Exported ${rows.length} row(s) to CSV`)
  }

  function handleRecalculate() {
    setRecalcMessage('Recalculating…')
    startRecalcTransition(async () => {
      const res = await recalculateAllArticleScores()
      if (res.error) {
        setRecalcMessage(`Failed: ${res.error}`)
      } else {
        setRecalcMessage(`Updated ${res.articles} articles, ${res.editors} editors`)
        router.refresh()
      }
      setTimeout(() => setRecalcMessage(null), 5000)
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = editors.filter((e) => {
      if ((e.combined_score ?? 0) < minOverall) return false
      if ((e.relevance_score ?? 0) < minMatch) return false
      if ((e.topical_score ?? 0) < minCoverage) return false
      if (minDr > 0 && (e.outlet_dr ?? 0) < minDr) return false
      if (tierFilter !== 'all' && e.outlet_tier !== tierFilter) return false
      if (beatFilter !== 'all' && !(e.beats ?? []).includes(beatFilter)) return false
      if (contactedFilter === 'contacted' && !e.contacted_at) return false
      if (contactedFilter === 'not-contacted' && e.contacted_at) return false
      if (q) {
        const haystack = [
          e.first_name, e.last_name,
          `${e.first_name ?? ''} ${e.last_name ?? ''}`,
          e.email, e.position, e.outlet_name, e.outlet_domain,
          e.department,
          e.beat_summary,
          ...(e.beats ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
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
  }, [editors, minOverall, minMatch, minCoverage, minDr, tierFilter, contactedFilter, beatFilter, search, sortKey, sortDir])

  const allBeats = useMemo(() => {
    const set = new Set<string>()
    for (const e of editors) for (const b of e.beats ?? []) set.add(b)
    return Array.from(set).sort()
  }, [editors])

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
        <div className="flex items-center gap-3">
          {recalcMessage && <span className="text-xs text-white/60">{recalcMessage}</span>}
          <button
            type="button"
            onClick={() => router.refresh()}
            title="Re-fetch the editor list from the database"
            className="px-3 py-1.5 text-xs border border-white/15 text-white hover:bg-white/5 transition-colors rounded"
          >
            ↻ Refresh list
          </button>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={isRecalc}
            className="px-3 py-1.5 text-xs border border-white/15 text-white hover:bg-white/5 transition-colors rounded disabled:opacity-50"
            title="Re-score every stored article + editor with the current scoring rules. Use after tweaking weights."
          >
            {isRecalc ? 'Recalculating…' : 'Recalculate scores'}
          </button>
          <p className="text-xs text-brand-muted">
            {filtered.length} of {editors.length} editors
          </p>
        </div>
      </div>

      {/* Search + filter panel */}
      <div className="bg-brand-surface border border-brand-border p-3 rounded space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, outlet, email, job title, department…"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-cyan"
        />
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-brand-muted w-[60px]">Overall</label>
            <input type="range" min={0} max={100} value={minOverall}
              onChange={(e) => setMinOverall(parseInt(e.target.value, 10))}
              className="w-28 accent-brand-cyan" />
            <span className="text-xs text-white font-mono w-8">{minOverall}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-brand-muted w-[60px]">Match</label>
            <input type="range" min={0} max={100} value={minMatch}
              onChange={(e) => setMinMatch(parseInt(e.target.value, 10))}
              className="w-28 accent-brand-cyan" />
            <span className="text-xs text-white font-mono w-8">{minMatch}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-brand-muted w-[70px]">Coverage</label>
            <input type="range" min={0} max={100} value={minCoverage}
              onChange={(e) => setMinCoverage(parseInt(e.target.value, 10))}
              className="w-28 accent-brand-cyan" />
            <span className="text-xs text-white font-mono w-8">{minCoverage}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-brand-muted w-[50px]">DR ≥</label>
            <input type="range" min={0} max={100} value={minDr}
              onChange={(e) => setMinDr(parseInt(e.target.value, 10))}
              className="w-28 accent-brand-cyan" />
            <span className="text-xs text-white font-mono w-8">{minDr}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-brand-muted">Location:</label>
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
            <label className="text-xs text-brand-muted">Beat:</label>
            <select
              value={beatFilter}
              onChange={(e) => setBeatFilter(e.target.value)}
              className="text-xs bg-brand-surface border border-white/10 text-white px-2 py-1 rounded"
            >
              <option value="all">All</option>
              {allBeats.map((b) => <option key={b} value={b}>{b}</option>)}
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
          {(search || minOverall > 0 || minMatch > 0 || minCoverage > 0 || minDr > 0 || tierFilter !== 'all' || contactedFilter !== 'all' || beatFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch(''); setMinOverall(0); setMinMatch(0); setMinCoverage(0); setMinDr(0)
                setTierFilter('all'); setContactedFilter('all'); setBeatFilter('all')
              }}
              className="text-[11px] text-white/50 hover:text-white underline ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar — appears when at least one editor is selected */}
      {selected.size > 0 && (
        <div className="bg-brand-cyan/[0.08] border border-brand-cyan/30 rounded p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-white font-medium mr-2">{selected.size} selected</span>
          <button
            type="button" onClick={handleBulkDelete} disabled={isBulkBusy}
            className="px-3 py-1.5 text-xs bg-red-500/15 border border-red-500/40 text-red-300 rounded hover:bg-red-500/25 transition-colors disabled:opacity-50"
          >
            🗑 Delete
          </button>
          <button
            type="button" onClick={() => handleBulkContact(true)} disabled={isBulkBusy}
            className="px-3 py-1.5 text-xs bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded hover:bg-amber-400/20 transition-colors disabled:opacity-50"
          >
            Mark contacted
          </button>
          <button
            type="button" onClick={() => handleBulkContact(false)} disabled={isBulkBusy}
            className="px-3 py-1.5 text-xs border border-white/15 text-white/70 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Mark not contacted
          </button>
          <button
            type="button" onClick={handleBulkRescore} disabled={isBulkBusy}
            className="px-3 py-1.5 text-xs border border-white/15 text-white/70 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Rescore
          </button>
          <button
            type="button" onClick={handleBulkClassifyBeats} disabled={isBulkBusy}
            className="px-3 py-1.5 text-xs border border-white/15 text-white/70 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Classify beats
          </button>
          <button
            type="button" onClick={handleBulkExport} disabled={isBulkBusy}
            className="px-3 py-1.5 text-xs border border-white/15 text-white/70 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button" onClick={() => setSelected(new Set())} disabled={isBulkBusy}
            className="text-[11px] text-white/50 hover:text-white underline ml-auto"
          >
            Clear selection
          </button>
          {bulkMessage && <span className="text-xs text-white/70 w-full">{bulkMessage}</span>}
        </div>
      )}

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
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all visible editors"
                    checked={filtered.length > 0 && filtered.every((e) => selected.has(e.id))}
                    onChange={(ev) => {
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (ev.target.checked) filtered.forEach((e) => next.add(e.id))
                        else filtered.forEach((e) => next.delete(e.id))
                        return next
                      })
                    }}
                    className="accent-brand-cyan cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-white" onClick={() => toggleSort('name')}>
                  <GlassTooltip label="Full name as reported by Hunter.io. Click a row to view the editor's detail panel (articles, bios, pitch composer).">
                    <span>Name{sortArrow('name')}</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium">
                  <GlassTooltip label="Job title from Hunter.io. May be null or stale — the scorer also reads LinkedIn title, outlet bio, external bio, Twitter bio, and AI summary to fill in gaps." width="w-72">
                    <span>Position</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-white" onClick={() => toggleSort('outlet')}>
                  <GlassTooltip label="Publication the editor works at. Click to sort alphabetically.">
                    <span>Outlet{sortArrow('outlet')}</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('profile')}>
                  <GlassTooltip label="Match score (0–100). Is this the right role at the right outlet? Combines job title, department, seniority, Hunter confidence, outlet priority, and any enrichment text (LinkedIn, bios, AI summary)." width="w-80">
                    <span>Match{sortArrow('profile')}</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('topical')}>
                  <GlassTooltip label="Coverage score (0–100). Do they actually write about our topic? The average of their top 5 indexed articles, scored by keyword tiers (brands, luxury/travel, geography)." width="w-80">
                    <span>Coverage{sortArrow('topical')}</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:text-white" onClick={() => toggleSort('combined')}>
                  <GlassTooltip label="Overall score (0–100). Weighted average of Match (60%) and Coverage (40%). Falls back to Match-only until articles are fetched. Sort the list by this column by default.">
                    <span>Overall{sortArrow('combined')}</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium">
                  <GlassTooltip label="Email from Hunter.io. Hidden behind a 'reveal' click to avoid accidental paste into client-visible fields.">
                    <span>Email</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium">
                  <GlassTooltip label="External profile links: LinkedIn (in) and Twitter/X (x). Opens in a new tab.">
                    <span>Links</span>
                  </GlassTooltip>
                </th>
                <th className="px-4 py-3 font-medium">
                  <GlassTooltip label="'contacted' means we've marked this editor as reached out to — either manually via the bulk action bar or automatically after sending a pitch." width="w-72">
                    <span>Status</span>
                  </GlassTooltip>
                </th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || '—'
                const isRevealed = revealed.has(e.id)
                const isSelected = selected.has(e.id)
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer ${isSelected ? 'bg-brand-cyan/[0.04]' : ''}`}
                    onClick={() => setSelectedEditor(e)}
                  >
                    <td className="px-3 py-3" onClick={(ev) => ev.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(e.id)}
                        aria-label={`Select ${name}`}
                        className="accent-brand-cyan cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{name}</span>
                        {(e.pitch_preferences as { no_pr?: boolean } | null)?.no_pr && (
                          <span
                            title="Editor has publicly stated they don't accept PR pitches"
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30"
                          >
                            no PR
                          </span>
                        )}
                        {e.went_quiet_at && (
                          <span
                            title={`No new byline since ${new Date(e.went_quiet_at).toLocaleDateString()}`}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20"
                          >
                            quiet
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-white/70">{e.position ?? '—'}</div>
                      {e.beats && e.beats.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {e.beats.slice(0, 3).map((b) => (
                            <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-cyan/[0.08] text-brand-cyan/90 border border-brand-cyan/20">
                              {b}
                            </span>
                          ))}
                          {e.beats.length > 3 && (
                            <span title={e.beats.slice(3).join(', ')} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                              +{e.beats.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
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
                    <td className="px-3 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDeleteOne(e.id, name)}
                        disabled={isBulkBusy}
                        title="Delete this editor"
                        aria-label={`Delete ${name}`}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition-colors disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
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
