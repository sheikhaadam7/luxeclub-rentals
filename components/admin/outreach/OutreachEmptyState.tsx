'use client'

import { useState, useTransition } from 'react'
import { seedDomains } from '@/app/actions/outreach'

export function OutreachEmptyState() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function handleSeed() {
    setResult(null)
    startTransition(async () => {
      const res = await seedDomains()
      if (res.error) {
        setResult({ ok: false, message: res.error })
      } else {
        setResult({
          ok: true,
          message: `Seeded ${res.inserted} domains (${res.skipped} already existed).`,
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-white">Outreach</h2>
        <p className="text-sm text-brand-muted mt-1">
          No target outlets loaded yet. Seed from <code className="text-brand-cyan">docs/seo/hunter-domains.csv</code> to get started.
        </p>
      </div>

      <div className="bg-brand-surface border border-brand-border p-8 rounded text-center space-y-4">
        <p className="text-white/70 text-sm max-w-md mx-auto">
          This will populate the outreach_domains table with 35 target publications across UAE, Europe, and global tiers.
        </p>
        <button
          type="button"
          onClick={handleSeed}
          disabled={isPending}
          className="px-6 py-2.5 bg-brand-cyan text-white text-sm font-medium hover:bg-brand-cyan-hover transition-colors disabled:opacity-50"
        >
          {isPending ? 'Seeding…' : 'Seed domains from CSV'}
        </button>
        {result && (
          <p className={`text-sm ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
            {result.message}
          </p>
        )}
      </div>
    </div>
  )
}
