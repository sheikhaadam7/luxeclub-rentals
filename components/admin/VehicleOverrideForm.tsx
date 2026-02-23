'use client'
import { useState, useTransition } from 'react'
import { updateVehicleAvailability } from '@/app/actions/admin'

interface VehicleOverrideFormProps {
  id: string
  slug: string
  name: string
  isAvailable: boolean
  overrideNotes: string
  scrapedAt: string | null
}

function formatScrapedAt(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function VehicleOverrideForm({
  id,
  slug,
  name,
  isAvailable,
  overrideNotes,
  scrapedAt,
}: VehicleOverrideFormProps) {
  const [available, setAvailable] = useState(isAvailable)
  const [notes, setNotes] = useState(overrideNotes)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateVehicleAvailability(id, available, notes)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Vehicle info */}
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-medium text-white truncate">{name}</p>
          <p className="text-xs text-brand-muted mt-0.5">
            /{slug} &middot; Last scraped: {formatScrapedAt(scrapedAt)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Availability toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-brand-muted uppercase tracking-wider">Available</span>
            <button
              type="button"
              role="switch"
              aria-checked={available}
              onClick={() => setAvailable(!available)}
              className={`relative inline-flex h-5 w-9 rounded-full border transition-colors duration-200 ${
                available
                  ? 'bg-brand-cyan border-brand-cyan'
                  : 'bg-white/10 border-brand-border'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                  available ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* Override notes */}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Override note (optional)"
            className="text-sm bg-brand-black border border-brand-border rounded px-3 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50 w-48"
          />

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
