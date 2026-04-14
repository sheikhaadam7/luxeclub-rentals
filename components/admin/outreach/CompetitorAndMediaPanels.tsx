'use client'

import { useEffect, useState } from 'react'
import { getRecentMovements, type MovementRow } from '@/app/actions/outreach'

/**
 * Two sibling panels sharing the same movement feed, filtered by details.kind.
 * Kept in one file so we only call getRecentMovements once.
 */
export function CompetitorAndMediaPanels() {
  const [items, setItems] = useState<MovementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const res = await getRecentMovements(30)
      if (!res.error) setItems(res.items)
      setLoading(false)
    })()
  }, [])

  if (loading) return null

  const competitor = items.filter(
    (i) => (i.details as { kind?: string } | null)?.kind === 'competitor_coverage'
  )
  const media = items.filter(
    (i) => (i.details as { kind?: string } | null)?.kind === 'media_match'
  )

  return (
    <>
      {competitor.length > 0 && <Panel title={`Competitor coverage detected (${competitor.length})`} items={competitor} accent="purple" />}
      {media.length > 0 && <Panel title={`Fresh media matches (${media.length})`} items={media} accent="cyan" />}
    </>
  )
}

function Panel({
  title, items, accent,
}: { title: string; items: MovementRow[]; accent: 'purple' | 'cyan' }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]"
      >
        <span className="font-display text-sm font-medium text-white uppercase tracking-wider">{title}</span>
        <span className="text-white/50 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="divide-y divide-white/[0.04] border-t border-brand-border">
          {items.slice(0, 20).map((m) => {
            const d = m.details as { title?: string; brand?: string; keyword?: string; snippet?: string } | null
            return (
              <div key={m.id} className="px-4 py-2.5 text-sm flex items-start gap-3">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                    accent === 'purple'
                      ? 'bg-purple-400/15 text-purple-400'
                      : 'bg-brand-cyan/15 text-brand-cyan'
                  }`}
                >
                  {d?.brand ?? d?.keyword ?? '—'}
                </span>
                <div className="flex-1 min-w-0">
                  {m.source_url ? (
                    <a
                      href={m.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-brand-cyan block truncate"
                    >
                      {d?.title ?? m.source_url}
                    </a>
                  ) : (
                    <span className="text-white">{d?.title ?? '(no title)'}</span>
                  )}
                  <p className="text-[11px] text-white/50 flex gap-2">
                    <span>{m.outlet_name}</span>
                    <span>·</span>
                    <span>{new Date(m.detected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
