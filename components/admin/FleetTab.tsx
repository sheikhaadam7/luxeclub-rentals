'use client'
import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  getFleetData,
  addVehicle,
  updateVehicle,
  toggleVehicleActive,
  updateVehicleAvailability,
  addAvailabilityBlock,
  removeAvailabilityBlock,
  type FleetVehicle,
  type FleetData,
  type AvailabilityBlock,
} from '@/app/actions/admin'

// ─── Helpers ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const minutes = Math.floor(diff / (1000 * 60))
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Toggle Switch ───────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-xs text-brand-muted uppercase tracking-wider">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full border transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
          checked
            ? 'bg-brand-cyan border-brand-cyan'
            : 'bg-white/10 border-brand-border'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

// ─── Add Vehicle Form ────────────────────────────────────────

function AddVehicleForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('Sedan')
  const [dailyRate, setDailyRate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleNameChange(v: string) {
    setName(v)
    setSlug(slugify(v))
  }

  function handleSubmit() {
    setError(null)
    setSuccess(false)
    const rate = parseFloat(dailyRate)
    if (!name.trim() || !slug.trim() || !category.trim() || isNaN(rate) || rate <= 0) {
      setError('All fields are required and daily rate must be a positive number.')
      return
    }
    startTransition(async () => {
      const result = await addVehicle({ name: name.trim(), slug: slug.trim(), category: category.trim(), daily_rate: rate })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setName('')
        setSlug('')
        setCategory('Sedan')
        setDailyRate('')
        setTimeout(() => {
          setSuccess(false)
          setOpen(false)
          onSuccess()
        }, 1200)
      }
    })
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-medium text-white">Add Vehicle</h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs px-3 py-1.5 rounded border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
        >
          {open ? 'Cancel' : '+ New Vehicle'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-brand-muted uppercase tracking-wider mb-1">
                Vehicle Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Ferrari 488 Spider"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-3 py-2 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-muted uppercase tracking-wider mb-1">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. ferrari-488-spider"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-3 py-2 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
              <p className="text-xs text-brand-muted/60 mt-0.5">Auto-generated from name</p>
            </div>
            <div>
              <label className="block text-xs text-brand-muted uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-3 py-2 text-white focus:outline-none focus:border-brand-cyan/50"
              >
                <option>Sedan</option>
                <option>SUV</option>
                <option>Sports</option>
                <option>Convertible</option>
                <option>Luxury</option>
                <option>Supercar</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-brand-muted uppercase tracking-wider mb-1">
                Daily Rate (AED)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-3 py-2 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-400">Vehicle added successfully.</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="text-sm px-4 py-2 rounded bg-brand-cyan text-black font-medium hover:bg-brand-cyan/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Adding...' : 'Add Vehicle'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Availability Block Row ──────────────────────────────────

function AvailabilityBlockRow({
  block,
  onRemove,
}: {
  block: AvailabilityBlock
  onRemove: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvailabilityBlock(block.id)
      if (!result.error) {
        onRemove(block.id)
      }
    })
  }

  return (
    <div className="flex items-center gap-2 bg-white/5 rounded px-2 py-1 text-xs">
      <span className="text-white/80">
        {block.start_date} — {block.end_date}
      </span>
      {block.reason && (
        <span className="text-brand-muted truncate max-w-[120px]" title={block.reason}>
          · {block.reason}
        </span>
      )}
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="ml-auto text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
        aria-label="Remove block"
      >
        ×
      </button>
    </div>
  )
}

// ─── Add Availability Block Form ─────────────────────────────

function AddBlockForm({
  vehicleId,
  onSuccess,
}: {
  vehicleId: string
  onSuccess: (block: AvailabilityBlock) => void
}) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    if (!startDate || !endDate) {
      setError('Start and end dates are required.')
      return
    }
    startTransition(async () => {
      const result = await addAvailabilityBlock(vehicleId, startDate, endDate, reason || undefined)
      if (result.error) {
        setError(result.error)
      } else {
        // Optimistically add the block
        onSuccess({
          id: crypto.randomUUID(),
          vehicle_id: vehicleId,
          start_date: startDate,
          end_date: endDate,
          reason: reason || null,
        })
        setStartDate('')
        setEndDate('')
        setReason('')
        setOpen(false)
      }
    })
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-brand-cyan/70 hover:text-brand-cyan transition-colors"
        >
          + Add Block
        </button>
      ) : (
        <div className="mt-2 space-y-2 bg-white/5 rounded p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-brand-muted mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-muted mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
          </div>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full text-xs bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded bg-brand-cyan text-black font-medium hover:bg-brand-cyan/90 transition-colors disabled:opacity-40"
            >
              {isPending ? 'Saving...' : 'Save Block'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null) }}
              className="text-xs px-3 py-1.5 rounded border border-brand-border text-brand-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Vehicle Card ────────────────────────────────────────────

function VehicleCard({
  vehicle,
  onUpdated,
}: {
  vehicle: FleetVehicle
  onUpdated: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(vehicle.availability_blocks)
  const [isPendingActive, startActiveTransition] = useTransition()
  const [isPendingAvail, startAvailTransition] = useTransition()
  const [isPendingEdit, startEditTransition] = useTransition()
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaved, setEditSaved] = useState(false)

  // Edit form fields
  const [dailyRate, setDailyRate] = useState(vehicle.daily_rate?.toString() ?? '')
  const [weeklyRate, setWeeklyRate] = useState(vehicle.weekly_rate?.toString() ?? '')
  const [monthlyRate, setMonthlyRate] = useState(vehicle.monthly_rate?.toString() ?? '')
  const [depositAmount, setDepositAmount] = useState(vehicle.deposit_amount?.toString() ?? '')
  const [gpsDeviceId, setGpsDeviceId] = useState(vehicle.gps_device_id ?? '')
  const [overrideNotes, setOverrideNotes] = useState(vehicle.override_notes ?? '')

  function handleToggleActive(val: boolean) {
    startActiveTransition(async () => {
      await toggleVehicleActive(vehicle.id, val)
      onUpdated()
    })
  }

  function handleToggleAvail(val: boolean) {
    startAvailTransition(async () => {
      await updateVehicleAvailability(vehicle.id, val, overrideNotes)
      onUpdated()
    })
  }

  function handleSaveEdit() {
    setEditError(null)
    setEditSaved(false)
    startEditTransition(async () => {
      const result = await updateVehicle(vehicle.id, {
        daily_rate: dailyRate ? parseFloat(dailyRate) : undefined,
        weekly_rate: weeklyRate ? parseFloat(weeklyRate) : null,
        monthly_rate: monthlyRate ? parseFloat(monthlyRate) : null,
        deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
        gps_device_id: gpsDeviceId || null,
        override_notes: overrideNotes || null,
      })
      if (result.error) {
        setEditError(result.error)
      } else {
        setEditSaved(true)
        setTimeout(() => setEditSaved(false), 2000)
        onUpdated()
      }
    })
  }

  function handleBlockAdded(block: AvailabilityBlock) {
    setBlocks((prev) => [...prev, block])
  }

  function handleBlockRemoved(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className={`bg-brand-surface border rounded-[var(--radius-card)] p-4 space-y-3 transition-opacity ${!vehicle.is_active ? 'opacity-60 border-red-500/30' : 'border-brand-border'}`}>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-base font-medium text-white truncate">{vehicle.name}</p>
            {vehicle.category && (
              <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded">
                {vehicle.category}
              </span>
            )}
            {!vehicle.is_active && (
              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                Deactivated
              </span>
            )}
          </div>
          <p className="text-xs text-brand-muted mt-0.5">
            /{vehicle.slug}
            {vehicle.daily_rate ? ` · AED ${vehicle.daily_rate.toLocaleString()}/day` : ''}
            {vehicle.gps_device_id ? ` · GPS: ${vehicle.gps_device_id}` : ''}
          </p>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-3 items-center">
          <Toggle
            label="Active"
            checked={vehicle.is_active}
            onChange={handleToggleActive}
            disabled={isPendingActive}
          />
          <Toggle
            label="Available"
            checked={vehicle.is_available}
            onChange={handleToggleAvail}
            disabled={isPendingAvail}
          />
          <button
            type="button"
            onClick={() => setEditOpen((o) => !o)}
            className="text-xs px-3 py-1.5 rounded border border-brand-border text-brand-muted hover:text-white hover:border-brand-cyan/50 transition-colors"
          >
            {editOpen ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editOpen && (
        <div className="border-t border-brand-border pt-3 space-y-3">
          <p className="text-xs text-brand-muted uppercase tracking-wider font-medium">Edit Pricing &amp; Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-brand-muted mb-1">Daily Rate (AED)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-muted mb-1">Weekly Rate (AED)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={weeklyRate}
                onChange={(e) => setWeeklyRate(e.target.value)}
                placeholder="Optional"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-muted mb-1">Monthly Rate (AED)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
                placeholder="Optional"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-muted mb-1">Deposit (AED)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-brand-muted mb-1">GPS Device ID</label>
              <input
                type="text"
                value={gpsDeviceId}
                onChange={(e) => setGpsDeviceId(e.target.value)}
                placeholder="e.g. tracker-001"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-muted mb-1">Override Notes</label>
              <input
                type="text"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Admin notes (optional)"
                className="w-full text-sm bg-brand-black border border-brand-border rounded px-2 py-1.5 text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-cyan/50"
              />
            </div>
          </div>

          {editError && <p className="text-xs text-red-400">{editError}</p>}

          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={isPendingEdit}
            className="text-xs px-3 py-1.5 rounded border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPendingEdit ? 'Saving...' : editSaved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Availability blocks */}
      <div className="border-t border-brand-border pt-3 space-y-2">
        <p className="text-xs text-brand-muted uppercase tracking-wider font-medium">
          Availability Blocks {blocks.length > 0 && `(${blocks.length})`}
        </p>
        {blocks.length > 0 && (
          <div className="space-y-1">
            {blocks.map((block) => (
              <AvailabilityBlockRow
                key={block.id}
                block={block}
                onRemove={handleBlockRemoved}
              />
            ))}
          </div>
        )}
        <AddBlockForm vehicleId={vehicle.id} onSuccess={handleBlockAdded} />
      </div>
    </div>
  )
}

// ─── Main FleetTab ───────────────────────────────────────────

export function FleetTab() {
  const [data, setData] = useState<FleetData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const result = await getFleetData()
    if ('error' in result) {
      setLoadError(result.error)
    } else {
      setData(result)
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
          <div key={i} className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-[var(--radius-card)] p-4">
        <p className="text-red-400 text-sm">Failed to load fleet data: {loadError}</p>
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

  const { vehicles, lastRun, isStale } = data!

  return (
    <div className="space-y-6">
      {/* Staleness alert */}
      {isStale && (
        <div className="flex items-start gap-3 bg-amber-400/10 border border-amber-400/30 rounded-[var(--radius-card)] px-4 py-3">
          <svg
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div>
            <p className="text-amber-400 text-sm font-medium">
              Scraper data is stale
              {lastRun ? ` — last run was ${timeAgo(lastRun.ran_at)}` : ' — no scraper runs found'}
            </p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              Vehicle data may be outdated. Run{' '}
              <code className="font-mono">npm run scrape</code> to refresh.
            </p>
          </div>
        </div>
      )}

      {/* Scraper error alert */}
      {lastRun?.status === 'error' && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-[var(--radius-card)] px-4 py-3">
          <svg
            className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <div>
            <p className="text-red-400 text-sm font-medium">Last scraper run failed</p>
            {lastRun.error_msg && (
              <p className="text-red-400/70 text-xs mt-0.5 font-mono">
                {lastRun.error_msg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scraper status card */}
      <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5">
        <h2 className="font-display text-lg font-medium text-white mb-3">Scraper Status</h2>
        {lastRun ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">Last Run</p>
              <p className="text-white">{formatDate(lastRun.ran_at)}</p>
              <p className="text-brand-muted text-xs mt-0.5">{timeAgo(lastRun.ran_at)}</p>
            </div>
            <div>
              <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">
                Vehicles Scraped
              </p>
              <p className="text-white">{lastRun.vehicle_count ?? 'Unknown'}</p>
            </div>
            <div>
              <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">Status</p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wider ${
                  lastRun.status === 'success'
                    ? 'bg-green-500/20 text-green-400'
                    : lastRun.status === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {lastRun.status}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-brand-muted text-sm">
            No scraper runs found. Run{' '}
            <code className="font-mono text-xs bg-white/10 px-1 py-0.5 rounded">
              npm run scrape
            </code>{' '}
            to populate the database.
          </p>
        )}
      </div>

      {/* Add Vehicle */}
      <AddVehicleForm onSuccess={fetchData} />

      {/* Vehicle list */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-medium text-white">
          Vehicles ({vehicles.length})
        </h2>
        {vehicles.length === 0 ? (
          <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-brand-muted text-sm">
              No vehicles in database. Run the scraper first or add one above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} onUpdated={fetchData} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
