'use client'
import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  getVehicleLocations,
  updateVehicleLocation,
  type VehicleLocation,
} from '@/app/actions/admin'

// ─── Dubai Landmarks ─────────────────────────────────────────

const LANDMARKS = [
  { label: 'Dubai Mall', lat: 25.1972, lng: 55.2744 },
  { label: 'Burj Al Arab', lat: 25.1412, lng: 55.1853 },
  { label: 'JBR Walk', lat: 25.0780, lng: 55.1340 },
  { label: 'Dubai Marina', lat: 25.0805, lng: 55.1403 },
  { label: 'DIFC Gate', lat: 25.2137, lng: 55.2825 },
  { label: 'Palm Jumeirah', lat: 25.1124, lng: 55.1390 },
  { label: 'Downtown Dubai', lat: 25.1885, lng: 55.2726 },
  { label: 'Dubai Airport (T3)', lat: 25.2532, lng: 55.3657 },
  { label: 'Business Bay', lat: 25.1860, lng: 55.2620 },
  { label: 'City Walk', lat: 25.2070, lng: 55.2600 },
] as const

// ─── Vehicle Location Row ────────────────────────────────────

function VehicleLocationRow({
  vehicle,
  onUpdated,
}: {
  vehicle: VehicleLocation
  onUpdated: () => void
}) {
  const [lat, setLat] = useState(vehicle.lat?.toString() ?? '')
  const [lng, setLng] = useState(vehicle.lng?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleLandmark(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = parseInt(e.target.value, 10)
    if (isNaN(idx)) return
    const lm = LANDMARKS[idx]
    setLat(lm.lat.toString())
    setLng(lm.lng.toString())
  }

  function handleSubmit() {
    setError(null)
    setSaved(false)
    const parsedLat = parseFloat(lat)
    const parsedLng = parseFloat(lng)
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError('Latitude and longitude must be valid numbers.')
      return
    }
    startTransition(async () => {
      const result = await updateVehicleLocation(vehicle.id, parsedLat, parsedLng)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        onUpdated()
      }
    })
  }

  const hasLocation = vehicle.lat !== null && vehicle.lng !== null

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-medium text-white truncate">
            {vehicle.name}
          </p>
          <p className="text-xs text-brand-muted">/{vehicle.slug}</p>
        </div>
        <div className="flex-shrink-0">
          {hasLocation ? (
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {vehicle.lat!.toFixed(4)}, {vehicle.lng!.toFixed(4)}
            </span>
          ) : (
            <span className="text-xs bg-white/10 text-brand-muted px-2 py-0.5 rounded">
              No location set
            </span>
          )}
        </div>
      </div>

      {/* Edit row */}
      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-brand-muted mb-1">Latitude</label>
            <input
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 25.1972"
              className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
            />
          </div>
          <div>
            <label className="block text-xs text-brand-muted mb-1">Longitude</label>
            <input
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="e.g. 55.2744"
              className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <select
            onChange={handleLandmark}
            defaultValue=""
            className="text-xs bg-brand-black border border-brand-border rounded px-2 py-1.5 text-brand-muted focus:outline-none focus:border-brand-cyan/50"
          >
            <option value="" disabled>
              Quick-set...
            </option>
            {LANDMARKS.map((lm, i) => (
              <option key={lm.label} value={i}>
                {lm.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded bg-brand-cyan text-black font-medium hover:bg-brand-cyan/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? 'Saving...' : saved ? 'Saved' : 'Update'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Last updated */}
      {vehicle.location_updated_at && (
        <p className="text-xs text-brand-muted/60">
          Last updated: {new Date(vehicle.location_updated_at).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </p>
      )}
    </div>
  )
}

// ─── Main LocationsTab ───────────────────────────────────────

export function LocationsTab() {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const result = await getVehicleLocations()
    if ('error' in result) {
      setLoadError(result.error)
    } else {
      setVehicles(result)
      setLoadError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] h-24 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-[var(--radius-card)] p-4">
        <p className="text-red-400 text-sm">Failed to load locations: {loadError}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-2 text-xs text-red-400 underline hover:text-red-300"
        >
          Retry
        </button>
      </div>
    )
  }

  const withLocation = vehicles.filter((v) => v.lat !== null)
  const withoutLocation = vehicles.filter((v) => v.lat === null)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <h2 className="font-display text-lg font-medium text-white mb-2">
          Vehicle Locations
        </h2>
        <p className="text-sm text-brand-muted">
          Manually set GPS coordinates for each vehicle. Use the landmark dropdown for
          quick Dubai locations. These coordinates are shown on the live tracking map.
        </p>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-green-400">
            {withLocation.length} with location
          </span>
          <span className="text-brand-muted">
            {withoutLocation.length} without location
          </span>
        </div>
      </div>

      {/* Vehicle list */}
      <div className="space-y-3">
        {vehicles.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-brand-muted text-sm">
              No active vehicles found. Add vehicles in the Fleet tab first.
            </p>
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <VehicleLocationRow
              key={vehicle.id}
              vehicle={vehicle}
              onUpdated={fetchData}
            />
          ))
        )}
      </div>
    </div>
  )
}
