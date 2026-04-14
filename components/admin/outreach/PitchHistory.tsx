'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePitchStatus } from '@/app/actions/outreach'

export interface PitchRow {
  id: string
  pitch_angle: string
  subject: string
  target_url: string
  anchor_type: string
  anchor_text: string
  status: string
  sent_at: string | null
  replied_at: string | null
  published_at: string | null
  published_url: string | null
  notes: string | null
  // Joined fields
  editor_name: string
  outlet_name: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  sent: 'bg-brand-cyan/20 text-brand-cyan',
  replied: 'bg-amber-400/20 text-amber-400',
  published: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
}

export function PitchHistory({ pitches }: { pitches: PitchRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [publishedUrlInput, setPublishedUrlInput] = useState('')

  function handleStatusChange(pitchId: string, newStatus: 'replied' | 'published' | 'rejected', metadata?: { publishedUrl?: string }) {
    setBusyId(pitchId)
    startTransition(async () => {
      await updatePitchStatus(pitchId, newStatus, metadata)
      router.refresh()
      setBusyId(null)
      setExpandedId(null)
      setPublishedUrlInput('')
    })
  }

  if (pitches.length === 0) {
    return (
      <div className="bg-brand-surface border border-brand-border p-6 rounded text-center">
        <p className="text-sm text-white/60">No pitches sent yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-medium text-white">Pitch History</h3>
      <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-brand-border">
            <tr className="text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-4 py-3 font-medium">Editor</th>
              <th className="px-4 py-3 font-medium">Outlet</th>
              <th className="px-4 py-3 font-medium">Angle</th>
              <th className="px-4 py-3 font-medium">Anchor</th>
              <th className="px-4 py-3 font-medium">Target URL</th>
              <th className="px-4 py-3 font-medium">Sent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Update</th>
            </tr>
          </thead>
          <tbody>
            {pitches.map((p) => {
              const isExpanded = expandedId === p.id
              const isBusy = isPending && busyId === p.id
              return (
                <>
                  <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white">{p.editor_name}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs">{p.outlet_name}</td>
                    <td className="px-4 py-3 text-xs text-white/70">{p.pitch_angle.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-white/70">{p.anchor_type}</div>
                      <div className="text-white/40 font-mono text-[11px] truncate max-w-[140px]">{p.anchor_text}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-white/60 truncate max-w-[160px]">{p.target_url}</td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {p.sent_at
                        ? new Date(p.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${STATUS_STYLES[p.status] ?? 'bg-white/10 text-white/60'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'sent' && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          className="text-[11px] text-white/70 hover:text-white underline"
                        >
                          {isExpanded ? 'close' : 'update'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-white/[0.02]">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(p.id, 'replied')}
                            disabled={isBusy}
                            className="px-3 py-1.5 text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/30 disabled:opacity-50"
                          >
                            Mark replied
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(p.id, 'rejected')}
                            disabled={isBusy}
                            className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Mark rejected
                          </button>
                          <div className="flex gap-2 items-center">
                            <input
                              type="url"
                              placeholder="Published article URL"
                              value={publishedUrlInput}
                              onChange={(e) => setPublishedUrlInput(e.target.value)}
                              className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white w-64"
                            />
                            <button
                              type="button"
                              onClick={() => handleStatusChange(p.id, 'published', { publishedUrl: publishedUrlInput })}
                              disabled={isBusy || !publishedUrlInput}
                              className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 disabled:opacity-50"
                            >
                              Mark published
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
