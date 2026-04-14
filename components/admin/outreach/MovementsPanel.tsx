'use client'

import { useEffect, useState } from 'react'
import { getRecentMovements, type MovementRow } from '@/app/actions/outreach'

export function MovementsPanel() {
  const [items, setItems] = useState<MovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    (async () => {
      const res = await getRecentMovements(14)
      if (!res.error) setItems(res.items)
      setLoading(false)
    })()
  }, [])

  if (loading || items.length === 0) return null

  // Split into movement events vs competitor/media detail rows
  const movements = items.filter((i) => {
    const kind = (i.details as { kind?: string } | null)?.kind
    return kind !== 'competitor_coverage' && kind !== 'media_match'
  })
  if (movements.length === 0) return null

  return (
    <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]"
      >
        <span className="font-display text-sm font-medium text-white uppercase tracking-wider">
          Recent editor movements ({movements.length})
        </span>
        <span className="text-white/50 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-white/[0.04] border-t border-brand-border">
          {movements.map((m) => (
            <div key={m.id} className="px-4 py-2.5 text-sm flex items-center gap-3">
              <span className={[
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                m.event_type === 'new' && 'bg-green-500/15 text-green-400',
                m.event_type === 'went_quiet' && 'bg-amber-400/15 text-amber-400',
                m.event_type === 'returned' && 'bg-brand-cyan/15 text-brand-cyan',
                m.event_type === 'moved_to' && 'bg-purple-400/15 text-purple-400',
              ].filter(Boolean).join(' ')}>
                {m.event_type.replace('_', ' ')}
              </span>
              <span className="text-white font-medium">
                {m.editor_name ?? (m.details as { first_name?: string; last_name?: string } | null)?.first_name + ' ' + ((m.details as { last_name?: string } | null)?.last_name ?? '')}
              </span>
              <span className="text-xs text-brand-muted">{m.outlet_name}</span>
              <span className="text-[11px] text-white/40 ml-auto">
                {new Date(m.detected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              {m.source_url && (
                <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-cyan hover:underline">
                  source ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
