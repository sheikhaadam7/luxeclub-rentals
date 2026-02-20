'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { getPendingKYC, reviewKYC, type PendingKYCEntry } from '@/app/actions/admin'

export function KYCTab() {
  const [entries, setEntries] = useState<PendingKYCEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionResults, setActionResults] = useState<
    Record<string, { success?: string; error?: string }>
  >({})
  const [isPending, startTransition] = useTransition()

  const fetchPendingKYC = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getPendingKYC()
    if ('error' in result) {
      setError(result.error)
    } else {
      setEntries(result)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPendingKYC()
  }, [fetchPendingKYC])

  function handleReview(userId: string, decision: 'verified' | 'rejected') {
    startTransition(async () => {
      setActionResults((prev) => ({
        ...prev,
        [userId]: {},
      }))
      const result = await reviewKYC(userId, decision)
      if (result.error) {
        setActionResults((prev) => ({
          ...prev,
          [userId]: { error: result.error ?? undefined },
        }))
      } else {
        setActionResults((prev) => ({
          ...prev,
          [userId]: {
            success:
              decision === 'verified'
                ? 'Identity approved'
                : 'Identity rejected',
          },
        }))
        // Refetch list after action
        await fetchPendingKYC()
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-brand-surface border border-brand-border rounded-[--radius-card] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load KYC queue: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl font-semibold text-white">
          Identity Verifications
        </h2>
        {entries.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
            {entries.length} pending
          </span>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-brand-muted text-sm">
            No pending identity verifications.
          </p>
        </div>
      )}

      {/* Pending verification cards */}
      <div className="space-y-4">
        {entries.map((entry) => {
          const result = actionResults[entry.userId]
          const submittedDate = new Date(entry.createdAt).toLocaleDateString(
            'en-AE',
            {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }
          )

          return (
            <div
              key={entry.userId}
              className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                {/* User info */}
                <div className="space-y-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {entry.email || entry.userId}
                  </p>
                  <p className="text-brand-muted text-xs">
                    Submitted {submittedDate}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                      {entry.kycStatus}
                    </span>
                    {entry.kycSessionId && (
                      <span className="text-brand-muted text-xs truncate max-w-[160px]">
                        Session: {entry.kycSessionId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(entry.userId, 'verified')}
                    disabled={isPending}
                    className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(entry.userId, 'rejected')}
                    disabled={isPending}
                    className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Action result feedback */}
              {result?.success && (
                <p className="mt-3 text-green-400 text-xs">{result.success}</p>
              )}
              {result?.error && (
                <p className="mt-3 text-red-400 text-xs">{result.error}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
