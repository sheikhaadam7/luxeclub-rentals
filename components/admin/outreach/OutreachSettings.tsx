'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  listCompetitorBrands,
  createCompetitorBrand,
  toggleCompetitorBrand,
  deleteCompetitorBrand,
  listMonitorKeywords,
  createMonitorKeyword,
  toggleMonitorKeyword,
  deleteMonitorKeyword,
  getRecentJobRuns,
} from '@/app/actions/outreach'

interface Brand { id: string; name: string; aliases: string[]; notes: string | null; active: boolean }
interface Keyword { id: string; keyword: string; notes: string | null; active: boolean }
interface JobRun {
  id: string
  job_name: string
  started_at: string
  finished_at: string | null
  items_processed: number
  errors_count: number
  summary: Record<string, unknown> | null
}

export function OutreachSettings() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'brands' | 'keywords' | 'jobs'>('brands')
  const [brands, setBrands] = useState<Brand[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [jobs, setJobs] = useState<JobRun[]>([])
  const [busy, startTransition] = useTransition()
  const [brandName, setBrandName] = useState('')
  const [brandAliases, setBrandAliases] = useState('')
  const [newKeyword, setNewKeyword] = useState('')

  async function reloadAll() {
    const [b, k, j] = await Promise.all([
      listCompetitorBrands(),
      listMonitorKeywords(),
      getRecentJobRuns(10),
    ])
    if (!b.error) setBrands(b.items)
    if (!k.error) setKeywords(k.items)
    if (!j.error) setJobs(j.items)
  }

  useEffect(() => {
    if (expanded) reloadAll()
  }, [expanded])

  function addBrand() {
    if (!brandName.trim()) return
    startTransition(async () => {
      await createCompetitorBrand(brandName, brandAliases)
      setBrandName(''); setBrandAliases('')
      await reloadAll()
      router.refresh()
    })
  }
  function addKeyword() {
    if (!newKeyword.trim()) return
    startTransition(async () => {
      await createMonitorKeyword(newKeyword)
      setNewKeyword('')
      await reloadAll()
      router.refresh()
    })
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-display text-sm font-medium text-white uppercase tracking-wider">
          Outreach Settings
        </span>
        <span className="text-white/50 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="border-t border-brand-border p-4 space-y-4">
          <div className="flex gap-2">
            {(['brands', 'keywords', 'jobs'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${tab === t ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30' : 'border border-white/10 text-white/60 hover:bg-white/5'}`}
              >
                {t === 'brands' ? 'Competitor brands' : t === 'keywords' ? 'Monitor keywords' : 'Recent job runs'}
              </button>
            ))}
          </div>

          {tab === 'brands' && (
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[11px] text-brand-muted">Brand name</label>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Exotic Cars Dubai"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-brand-muted">Aliases (comma separated)</label>
                  <input
                    value={brandAliases}
                    onChange={(e) => setBrandAliases(e.target.value)}
                    placeholder="alt spellings, old names"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={addBrand}
                  disabled={busy}
                  className="px-3 py-2 text-xs bg-brand-cyan text-white rounded hover:bg-brand-cyan-hover disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {brands.length === 0 ? (
                <p className="text-xs text-white/40 italic">No competitor brands yet.</p>
              ) : (
                <div className="space-y-1">
                  {brands.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 text-sm bg-white/[0.02] border border-white/[0.05] rounded px-3 py-2">
                      <span className={b.active ? 'text-white' : 'text-white/40 line-through'}>{b.name}</span>
                      {b.aliases.length > 0 && (
                        <span className="text-[11px] text-white/50">[{b.aliases.join(', ')}]</span>
                      )}
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await toggleCompetitorBrand(b.id, !b.active); await reloadAll() })}
                        className="ml-auto text-[11px] text-white/60 hover:text-white underline"
                      >
                        {b.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Delete "${b.name}"?`)) startTransition(async () => { await deleteCompetitorBrand(b.id); await reloadAll() }) }}
                        className="text-[11px] text-red-400 hover:text-red-300 underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'keywords' && (
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[11px] text-brand-muted">Keyword / phrase</label>
                  <input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder='e.g. "supercar Dubai"'
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={addKeyword}
                  disabled={busy}
                  className="px-3 py-2 text-xs bg-brand-cyan text-white rounded hover:bg-brand-cyan-hover disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {keywords.length === 0 ? (
                <p className="text-xs text-white/40 italic">No monitor keywords yet.</p>
              ) : (
                <div className="space-y-1">
                  {keywords.map((k) => (
                    <div key={k.id} className="flex items-center gap-2 text-sm bg-white/[0.02] border border-white/[0.05] rounded px-3 py-2">
                      <span className={k.active ? 'text-white' : 'text-white/40 line-through'}>{k.keyword}</span>
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await toggleMonitorKeyword(k.id, !k.active); await reloadAll() })}
                        className="ml-auto text-[11px] text-white/60 hover:text-white underline"
                      >
                        {k.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Delete "${k.keyword}"?`)) startTransition(async () => { await deleteMonitorKeyword(k.id); await reloadAll() }) }}
                        className="text-[11px] text-red-400 hover:text-red-300 underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'jobs' && (
            <div className="space-y-1">
              {jobs.length === 0 ? (
                <p className="text-xs text-white/40 italic">No job runs recorded yet.</p>
              ) : jobs.map((j) => (
                <div key={j.id} className="text-[11px] bg-white/[0.02] border border-white/[0.05] rounded px-3 py-2 flex items-center gap-3">
                  <span className="text-white font-mono">{j.job_name}</span>
                  <span className="text-white/50">{new Date(j.started_at).toLocaleString()}</span>
                  <span className="text-white/70">{j.items_processed} items</span>
                  {j.errors_count > 0 && <span className="text-red-400">{j.errors_count} errors</span>}
                  <span className="text-white/40 font-mono text-[10px] ml-auto">
                    {j.summary ? JSON.stringify(j.summary) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
