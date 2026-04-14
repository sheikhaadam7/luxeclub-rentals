'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getPitchFollowUps, markPitchDormant, type PitchFollowUp } from '@/app/actions/outreach'

export function FollowUpsPanel() {
  const router = useRouter()
  const [items, setItems] = useState<PitchFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [busy, startTransition] = useTransition()

  async function load() {
    setLoading(true)
    const res = await getPitchFollowUps()
    if (!res.error) setItems(res.items)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function handleDormant(pitchId: string) {
    startTransition(async () => {
      await markPitchDormant(pitchId)
      await load()
      router.refresh()
    })
  }

  const dueSoon = items.filter((i) => i.bucket === 'due_soon')
  const dormant = items.filter((i) => i.bucket === 'dormant')

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-medium text-white uppercase tracking-wider">
            Follow-ups due
          </span>
          <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
            {dueSoon.length} due
          </span>
          {dormant.length > 0 && (
            <span className="text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
              {dormant.length} dormant
            </span>
          )}
        </div>
        <span className="text-white/50 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="divide-y divide-white/[0.04] border-t border-brand-border">
          {items.map((i) => (
            <div key={i.pitchId} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium truncate">{i.editorName}</span>
                  <span className="text-xs text-brand-muted">·</span>
                  <span className="text-xs text-brand-muted truncate">{i.outletName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      i.bucket === 'dormant'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-amber-400/15 text-amber-400'
                    }`}
                  >
                    {i.daysSinceSent}d
                  </span>
                </div>
                <p className="text-xs text-white/60 truncate mt-0.5">{i.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDormant(i.pitchId)}
                disabled={busy}
                className="px-2.5 py-1 text-[11px] border border-white/15 text-white/70 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Mark dormant
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
