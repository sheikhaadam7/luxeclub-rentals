'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { discoverEditors } from '@/app/actions/outreach'

interface Domain {
  id: string
  domain: string
  outlet_name: string
  tier: string
  priority: string
  notes: string | null
  hunter_searched_at: string | null
}

const PRIORITY_STYLES: Record<string, string> = {
  P1: 'bg-brand-cyan/20 text-brand-cyan',
  P2: 'bg-amber-400/20 text-amber-400',
  P3: 'bg-white/10 text-white/60',
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

export function DomainsList({ domains }: { domains: Domain[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({})

  function handleDiscover(domainId: string) {
    setBusyId(domainId)
    setResults((r) => ({ ...r, [domainId]: undefined as unknown as { ok: boolean; message: string } }))
    startTransition(async () => {
      const res = await discoverEditors(domainId)
      if (res.error) {
        setResults((r) => ({ ...r, [domainId]: { ok: false, message: res.error! } }))
      } else {
        setResults((r) => ({
          ...r,
          [domainId]: {
            ok: true,
            message: `+${res.inserted} editors (${res.skipped} skipped)`,
          },
        }))
        router.refresh()
      }
      setBusyId(null)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-white">Target Outlets</h3>
        <p className="text-xs text-brand-muted">{domains.length} domains</p>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-brand-border">
            <tr className="text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-4 py-3 font-medium">Outlet</th>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Discovered</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => {
              const result = results[d.id]
              const isBusy = isPending && busyId === d.id
              return (
                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">{d.outlet_name}</td>
                  <td className="px-4 py-3 text-brand-muted font-mono text-xs">{d.domain}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${TIER_STYLES[d.tier] ?? 'bg-white/10 text-white/60'}`}>
                      {d.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${PRIORITY_STYLES[d.priority] ?? 'bg-white/10 text-white/60'}`}>
                      {d.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {d.hunter_searched_at
                      ? new Date(d.hunter_searched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-y-1">
                    <button
                      type="button"
                      onClick={() => handleDiscover(d.id)}
                      disabled={isBusy}
                      className="px-3 py-1.5 text-xs border border-white/15 text-white hover:bg-white/5 transition-colors rounded disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isBusy ? 'Searching…' : d.hunter_searched_at ? 'Re-discover' : 'Discover editors'}
                    </button>
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
