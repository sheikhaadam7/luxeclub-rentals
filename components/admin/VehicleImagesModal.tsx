'use client'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  uploadVehicleImage,
  deleteVehicleImage,
  updateVehicleImageOrder,
} from '@/app/actions/admin'
import { compressImage } from '@/lib/compressImage'

// ── Types ──────────────────────────────────────────────────────────────────

type VehicleSnapshot = {
  id: string
  slug: string
  name: string
  primary_image_url: string | null
  image_urls: string[] | null
  updated_at: string
}

type PendingUpload = {
  id: string
  filename: string
  phase: 'converting' | 'compressing' | 'uploading' | 'done' | 'error'
  originalSize: number
  newSize?: number
  errorMessage?: string
}

interface Props {
  vehicle: VehicleSnapshot
  onClose: () => void
  onVehicleChanged: (v: VehicleSnapshot) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const HEIC_TYPES = new Set(['image/heic', 'image/heif'])
const HEIC_EXTS = /\.(heic|heif)$/i

function isHeic(file: File): boolean {
  return HEIC_TYPES.has(file.type) || HEIC_EXTS.test(file.name)
}

// ── Component ──────────────────────────────────────────────────────────────

export function VehicleImagesModal({ vehicle: initial, onClose, onVehicleChanged }: Props) {
  const [vehicle, setVehicle] = useState<VehicleSnapshot>(initial)
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [reorderDragIndex, setReorderDragIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const gallery = vehicle.image_urls ?? []
  const primary = vehicle.primary_image_url
  const hover = gallery.find((u) => u !== primary) ?? null

  // Push local changes up so FleetTab's list stays in sync.
  useEffect(() => {
    onVehicleChanged(vehicle)
  }, [vehicle, onVehicleChanged])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Upload flow ─────────────────────────────────────────────────────────

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const list = Array.from(files).filter((f) => f.type.startsWith('image/') || isHeic(f))
      if (list.length === 0) return

      // Add all as pending immediately so the user sees them.
      const newPending: PendingUpload[] = list.map((f) => ({
        id: crypto.randomUUID(),
        filename: f.name,
        phase: isHeic(f) ? 'converting' : 'compressing',
        originalSize: f.size,
      }))
      setPending((prev) => [...prev, ...newPending])

      // Upload in parallel — one Promise per file.
      await Promise.all(
        list.map(async (file, i) => {
          const pendingId = newPending[i].id
          try {
            const setPhase = (patch: Partial<PendingUpload>) =>
              setPending((prev) => prev.map((p) => (p.id === pendingId ? { ...p, ...patch } : p)))

            const compressed = await compressImage(file)
            setPhase({ phase: 'uploading', newSize: compressed.blob.size })

            const fd = new FormData()
            fd.append('file', compressed.blob, compressed.filename)
            fd.append('vehicleId', vehicle.id)
            fd.append('filename', compressed.filename)

            const res = await uploadVehicleImage(vehicle.slug, fd)
            if (res.error || !res.url) {
              setPhase({ phase: 'error', errorMessage: res.error ?? 'Upload failed' })
              return
            }
            setPhase({ phase: 'done' })

            // Append the new URL to the local snapshot. We don't have the fresh
            // updated_at back — refetch is simpler and keeps optimistic-locking
            // sane. Since the RPC bumped the row, refetch is required anyway.
            setVehicle((v) => ({
              ...v,
              image_urls: [...(v.image_urls ?? []), res.url!],
              // updated_at will be corrected on next mutation via `conflict` -> latest refresh
            }))
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            const looksHeic = isHeic(file)
            setPending((prev) =>
              prev.map((p) =>
                p.id === pendingId
                  ? {
                      ...p,
                      phase: 'error',
                      errorMessage: looksHeic
                        ? 'HEIC conversion failed. Enable iPhone Settings → Camera → Formats → Most Compatible, or convert to JPG first.'
                        : message,
                    }
                  : p,
              ),
            )
          }
        }),
      )
    },
    [vehicle.id, vehicle.slug],
  )

  // ── Delete flow ─────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (url: string) => {
      if (!confirm('Delete this image? This cannot be undone.')) return
      setError(null)

      const res = await deleteVehicleImage(vehicle.id, url, vehicle.updated_at)

      if (res.conflict && res.latest) {
        setVehicle((v) => ({
          ...v,
          primary_image_url: res.latest!.primary_image_url,
          image_urls: res.latest!.image_urls,
          updated_at: res.latest!.updated_at,
        }))
        setError('Another edit landed first. State reloaded — try again.')
        return
      }

      if (res.error) {
        setError(res.error)
        return
      }

      // Success: mirror in local state.
      setVehicle((v) => {
        const nextImages = (v.image_urls ?? []).filter((u) => u !== url)
        const nextPrimary = v.primary_image_url === url ? null : v.primary_image_url
        return {
          ...v,
          image_urls: nextImages,
          primary_image_url: nextPrimary,
          updated_at: new Date().toISOString(), // approximate; corrected on next mutation
        }
      })
    },
    [vehicle.id, vehicle.updated_at],
  )

  // ── Order + slot flow ───────────────────────────────────────────────────

  const applyOrder = useCallback(
    async (nextPrimary: string | null, nextGallery: string[]) => {
      setError(null)
      // Optimistic local update
      const snapshotBefore = vehicle
      setVehicle((v) => ({
        ...v,
        primary_image_url: nextPrimary,
        image_urls: nextGallery.filter((u) => u !== nextPrimary),
      }))

      const res = await updateVehicleImageOrder(
        vehicle.id,
        nextPrimary,
        nextGallery,
        vehicle.updated_at,
      )

      if (res.conflict && res.latest) {
        setVehicle((v) => ({
          ...v,
          primary_image_url: res.latest!.primary_image_url,
          image_urls: res.latest!.image_urls,
          updated_at: res.latest!.updated_at,
        }))
        setError('Another edit landed first. State reloaded — try again.')
        return
      }

      if (res.error) {
        // Roll back to prior local state.
        setVehicle(snapshotBefore)
        setError(res.error)
        return
      }

      setVehicle((v) => ({ ...v, updated_at: new Date().toISOString() }))
    },
    [vehicle],
  )

  const setAsMaster = (url: string) => {
    const nextGallery = gallery.filter((u) => u !== url)
    if (primary && primary !== url) nextGallery.unshift(primary)
    applyOrder(url, nextGallery)
  }

  const setAsHover = (url: string) => {
    if (url === primary) return
    const withoutUrl = gallery.filter((u) => u !== url)
    applyOrder(primary, [url, ...withoutUrl])
  }

  const clearPrimary = () => {
    if (!primary) return
    applyOrder(null, [primary, ...gallery])
  }

  const reorderGallery = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const next = [...gallery]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    applyOrder(primary, next)
  }

  // ── Dropzone handlers ───────────────────────────────────────────────────

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  // Portal-render to document.body so no ancestor opacity/transform/filter
  // can leak into the modal (a `position: fixed` child still inherits
  // ancestor `opacity`, which is exactly what happened when this modal was
  // rendered inside a deactivated vehicle card that had opacity-60).
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.97)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-auto"
        style={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#111827' }}>Manage images</h2>
            <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
              {vehicle.name} <span style={{ color: '#9ca3af' }}>·</span> <code style={{ color: '#374151' }}>{vehicle.slug}</code>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-70 transition-opacity text-3xl leading-none font-bold"
            style={{ color: '#6b7280' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: '#fee2e2', border: '2px solid #dc2626', color: '#991b1b' }}
          >
            {error}
          </div>
        )}

        {/* Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* MASTER slot */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#111827' }}>Master image</p>
              <p className="text-xs" style={{ color: '#6b7280' }}>Shown first on the detail page</p>
            </div>
            <SlotBox url={primary} onClear={primary ? clearPrimary : undefined} ratio="aspect-video" placeholder="No master image set — drag one from the gallery below, or upload." />
          </div>

          {/* HOVER slot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#111827' }}>Hover image</p>
              <p className="text-xs" style={{ color: '#6b7280' }}>On catalogue-card hover</p>
            </div>
            <SlotBox url={hover} onClear={undefined} ratio="aspect-video" placeholder="No hover image — first non-master image is used." />
          </div>
        </div>

        {/* Gallery */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#111827' }}>Gallery ({gallery.length})</p>
          {gallery.length === 0 && pending.length === 0 && (
            <div
              className="rounded-lg px-4 py-6 text-sm text-center font-medium"
              style={{ backgroundColor: '#e5e7eb', border: '3px solid #dc2626', color: '#4b5563' }}
            >
              No images yet. Drop some below.
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((url, i) => (
              <div
                key={url}
                draggable
                onDragStart={() => setReorderDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (reorderDragIndex !== null) {
                    reorderGallery(reorderDragIndex, i)
                  }
                  setReorderDragIndex(null)
                }}
                onDragEnd={() => setReorderDragIndex(null)}
                className={`relative group aspect-video rounded-lg overflow-hidden cursor-move transition-opacity ${
                  reorderDragIndex === i ? 'opacity-40' : ''
                }`}
                style={{
                  backgroundColor: '#e5e7eb',
                  border: url === primary
                    ? '3px solid #0891b2'
                    : url === hover && url !== primary
                      ? '3px solid #f59e0b'
                      : '3px solid #dc2626',
                }}
              >
                <Image src={url} alt="" fill sizes="200px" className="object-cover" unoptimized />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 text-xs" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
                  <button
                    type="button"
                    onClick={() => setAsMaster(url)}
                    disabled={url === primary}
                    className="w-full px-2 py-1 rounded font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#0891b2', color: '#ffffff' }}
                  >
                    {url === primary ? '✓ Master' : 'Set as master'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsHover(url)}
                    disabled={url === primary || url === hover}
                    className="w-full px-2 py-1 rounded font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#f59e0b', color: '#111827' }}
                  >
                    {url === hover && url !== primary ? '✓ Hover' : 'Set as hover'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(url)}
                    className="w-full px-2 py-1 rounded font-semibold"
                    style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {pending.map((p) => (
              <div
                key={p.id}
                className="relative aspect-video rounded-lg overflow-hidden"
                style={{ backgroundColor: '#e5e7eb', border: '3px solid #dc2626' }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs p-2 text-center space-y-1" style={{ color: '#1f2937' }}>
                  <p className="font-semibold truncate w-full">{p.filename}</p>
                  {p.phase === 'converting' && <p style={{ color: '#4b5563' }}>Converting HEIC…</p>}
                  {p.phase === 'compressing' && <p style={{ color: '#4b5563' }}>Compressing…</p>}
                  {p.phase === 'uploading' && (
                    <p style={{ color: '#4b5563' }}>
                      Uploading… {formatBytes(p.originalSize)} → {p.newSize ? formatBytes(p.newSize) : '…'}
                    </p>
                  )}
                  {p.phase === 'done' && (
                    <p style={{ color: '#16a34a' }}>
                      ✓ {formatBytes(p.originalSize)} → {formatBytes(p.newSize ?? 0)}
                    </p>
                  )}
                  {p.phase === 'error' && (
                    <p className="leading-tight" style={{ color: '#dc2626' }}>✗ {p.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {pending.some((p) => p.phase === 'done' || p.phase === 'error') && (
            <button
              type="button"
              onClick={() => setPending((prev) => prev.filter((p) => p.phase !== 'done' && p.phase !== 'error'))}
              className="text-xs hover:underline transition-colors"
              style={{ color: '#4b5563' }}
            >
              Clear finished uploads
            </button>
          )}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl px-6 py-12 text-center cursor-pointer transition-all"
          style={{
            backgroundColor: isDragOver ? '#fef2f2' : '#e5e7eb',
            border: '3px solid #dc2626',
          }}
        >
          <p className="text-base font-semibold" style={{ color: '#111827' }}>
            Drop images here or click to upload
          </p>
          <p className="text-xs mt-1" style={{ color: '#4b5563' }}>
            JPEG, PNG, WebP, HEIC. Compressed to WebP (max ~800KB, 2400px) before upload.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#111827', color: '#ffffff' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── SlotBox — the master / hover preview containers ────────────────────────

function SlotBox({
  url,
  onClear,
  ratio,
  placeholder,
}: {
  url: string | null
  onClear?: () => void
  ratio: string
  placeholder: string
}) {
  if (!url) {
    return (
      <div
        className={`${ratio} rounded-xl flex items-center justify-center p-4`}
        style={{ backgroundColor: '#e5e7eb', border: '3px solid #dc2626' }}
      >
        <p className="text-sm text-center font-semibold" style={{ color: '#991b1b' }}>{placeholder}</p>
      </div>
    )
  }
  return (
    <div className={`${ratio} relative rounded-xl overflow-hidden`} style={{ backgroundColor: '#e5e7eb', border: '3px solid #dc2626' }}>
      <Image src={url} alt="" fill sizes="600px" className="object-cover" unoptimized />
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: '#111827', color: '#ffffff' }}
          title="Clear this slot"
        >
          Clear
        </button>
      )}
    </div>
  )
}
