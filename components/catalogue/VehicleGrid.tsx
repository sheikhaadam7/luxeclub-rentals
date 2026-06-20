'use client'

import { useMemo, useState } from 'react'
import { VehicleCard } from './VehicleCard'
import { useTranslation } from '@/lib/i18n/context'

interface Vehicle {
  slug: string
  name: string
  category: string | null
  categories: string[] | null
  primary_image_url: string | null
  image_urls: string[] | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
}

interface VehicleGridProps {
  vehicles: Vehicle[]
  initialBrand?: string | null
}

// ---------------------------------------------------------------------------
// Brand & type matching — mirrors LuxeClub /garage filters
// ---------------------------------------------------------------------------

/** All brands available across scraped sources */
const BRANDS = [
  'Aston Martin',
  'Audi',
  'Bentley',
  'BMW',
  'Cadillac',
  'Ferrari',
  'Lamborghini',
  'Maserati',
  'McLaren',
  'Mercedes',
  'Porsche',
  'Range Rover',
  'Rolls Royce',
] as const

/**
 * Canonical car types — read directly from `vehicles.categories` in Supabase.
 * Order here is the pill display order. Assignment is driven by the
 * spreadsheet workflow at `scripts/export-car-types.py` /
 * `scripts/import-car-types.py`.
 */
const CAR_TYPES = [
  'Sports',
  'SUV',
  'Convertible',
  'Sedan',
  'Coupe',
  'Family',
] as const

/** Multi-word brands that need prefix matching */
const MULTI_WORD_BRANDS = ['Aston Martin', 'Range Rover', 'Rolls Royce']

/** Extract the brand from a vehicle name */
function extractBrand(name: string): string {
  const lower = name.toLowerCase()
  for (const brand of MULTI_WORD_BRANDS) {
    if (lower.startsWith(brand.toLowerCase())) return brand
  }
  // Mercedes models often start with "Mercedes" or "G63 AMG" etc.
  if (lower.includes('mercedes') || lower.includes('amg') || lower.startsWith('g63')) {
    return 'Mercedes'
  }
  // Match single-word brands case-insensitively against BRANDS list
  const firstWord = name.split(' ')[0] ?? name
  const matchedBrand = BRANDS.find((b) => b.toLowerCase() === firstWord.toLowerCase())
  return matchedBrand ?? firstWord
}

// ---------------------------------------------------------------------------
// Pill chip filter row
// ---------------------------------------------------------------------------

interface PillFilterProps {
  options: readonly string[]
  selected: string | null
  onSelect: (value: string | null) => void
  availableOptions?: Set<string>
}

function PillFilter({ options, selected, onSelect, availableOptions }: PillFilterProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {/* All pill */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={[
          'px-4 py-2 rounded-none text-sm font-medium transition-all duration-200 border whitespace-nowrap',
          !selected
            ? 'bg-white text-black border-white'
            : 'bg-transparent text-white/60 border-white/[0.12] hover:border-white/30 hover:text-white',
        ].join(' ')}
      >
        {t('catalogue.all')}
      </button>
      {options.map((option) => {
        const isSelected = selected === option
        const isAvailable = !availableOptions || availableOptions.has(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => isAvailable && onSelect(isSelected ? null : option)}
            className={[
              'px-4 py-2 rounded-none text-sm font-medium transition-all duration-200 border whitespace-nowrap',
              isSelected
                ? 'bg-white text-black border-white'
                : isAvailable
                  ? 'bg-transparent text-white/60 border-white/[0.12] hover:border-white/30 hover:text-white'
                  : 'bg-transparent text-white/20 border-white/[0.06] cursor-default',
            ].join(' ')}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main grid component
// ---------------------------------------------------------------------------

export function VehicleGrid({ vehicles, initialBrand }: VehicleGridProps) {
  const { t } = useTranslation()
  const [selectedBrand, setSelectedBrand] = useState<string | null>(
    BRANDS.find((b) => b.toLowerCase() === initialBrand?.toLowerCase()) ?? null
  )
  const [selectedType, setSelectedType] = useState<string | null>(null)

  // Pre-compute brand for each vehicle. Categories come straight from the DB array.
  const vehiclesWithMeta = useMemo(
    () =>
      vehicles.map((v) => ({
        ...v,
        brand: extractBrand(v.name),
        categories: v.categories ?? [],
      })),
    [vehicles]
  )

  // Available brands — filtered by selected type so impossible combos are dimmed
  const availableBrands = useMemo(() => {
    const set = new Set<string>()
    vehiclesWithMeta.forEach((v) => {
      if (!BRANDS.includes(v.brand as typeof BRANDS[number])) return
      if (selectedType && !v.categories.includes(selectedType)) return
      set.add(v.brand)
    })
    return set
  }, [vehiclesWithMeta, selectedType])

  // Available types — filtered by selected brand so impossible combos are dimmed
  const availableTypes = useMemo(() => {
    const set = new Set<string>()
    vehiclesWithMeta.forEach((v) => {
      if (selectedBrand && v.brand !== selectedBrand) return
      v.categories.forEach((c) => {
        if (CAR_TYPES.includes(c as typeof CAR_TYPES[number])) set.add(c)
      })
    })
    return set
  }, [vehiclesWithMeta, selectedBrand])

  // Filter vehicles
  const filtered = useMemo(() => {
    return vehiclesWithMeta.filter((v) => {
      if (selectedBrand && v.brand !== selectedBrand) return false
      if (selectedType && !v.categories.includes(selectedType)) return false
      return true
    })
  }, [vehiclesWithMeta, selectedBrand, selectedType])

  if (vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-brand-muted text-base">{t('catalogue.noVehicles')}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filter pills */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 mb-8">
        <div className="space-y-4">
          {/* Brand pills */}
          <div>
            <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">{t('catalogue.brand')}</p>
            <PillFilter
              options={BRANDS}
              selected={selectedBrand}
              onSelect={setSelectedBrand}
              availableOptions={availableBrands}
            />
          </div>

          {/* Type pills */}
          <div>
            <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">{t('catalogue.type')}</p>
            <PillFilter
              options={CAR_TYPES}
              selected={selectedType}
              onSelect={setSelectedType}
              availableOptions={availableTypes}
            />
          </div>
        </div>

        {/* Results count */}
        <p className="text-[13px] text-brand-muted">
          {filtered.length} {filtered.length === 1 ? t('catalogue.vehicle') : t('catalogue.vehicles')}
          {selectedBrand && (
            <> {t('catalogue.by')} <span className="text-white font-medium">{selectedBrand}</span></>
          )}
          {selectedType && (
            <> {t('catalogue.in')} <span className="text-white font-medium">{selectedType}</span></>
          )}
        </p>
      </div>

      {/* Grid — full width */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-brand-muted text-sm">{t('catalogue.noMatch')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-brand-border">
          {filtered.map((vehicle) => (
            <VehicleCard key={vehicle.slug} {...vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}
