'use client'

import { useMemo, useState } from 'react'
import { VehicleCard } from './VehicleCard'
import { useTranslation } from '@/lib/i18n/context'

interface Vehicle {
  slug: string
  name: string
  category: string | null
  primary_image_url: string | null
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
}

interface VehicleGridProps {
  vehicles: Vehicle[]
}

// ---------------------------------------------------------------------------
// Brand & type matching — mirrors LuxeClub /garage filters
// ---------------------------------------------------------------------------

/** All brands available across scraped sources */
const BRANDS = [
  'Audi',
  'Porsche',
  'Bentley',
  'Maserati',
  'Aston Martin',
  'Range Rover',
  'Cadillac',
  'Rolls Royce',
  'Mercedes',
  'Lamborghini',
  'Ferrari',
  'McLaren',
  'BMW',
] as const

/** Car types for filtering */
const CAR_TYPES = [
  'Sports Cars',
  'SUV Cars',
  'Convertible Cars',
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

/**
 * SUV models — matched by keyword in vehicle name.
 * Covers: Range Rover variants, Cayenne, Bentayga, Cullinan, Escalade, DBX,
 * RSQ8, SQ7, G63, GLE, GLS, X5, X7, Urus, etc.
 */
const SUV_KEYWORDS = [
  'range rover', 'vogue', 'cayenne', 'bentayga', 'cullinan',
  'escalade', 'dbx', 'rsq8', 'sq7', 'sq8', 'g63', 'gle',
  'gls', 'x5', 'x7', 'urus', 'levante', 'macan', 'trackhawk',
  'purosangue', 'x6',
]

/**
 * Convertible / Spyder models — matched by keyword in vehicle name.
 * Covers: Spyder, Spider, Dawn, GTC, Cabriolet, Roadster, etc.
 */
const CONVERTIBLE_KEYWORDS = [
  'spyder', 'spider', 'dawn', 'gtc', 'cabriolet', 'cabrio',
  'roadster', 'convertible', 'carrera s spyder', 'portofino',
]

/**
 * Determine car type from the vehicle name (since DB category may be null).
 * Falls back to DB category if name doesn't match any known pattern.
 */
function extractCarType(name: string, category: string | null): string | null {
  const lower = name.toLowerCase()

  // Check convertible first (more specific — e.g. "911 Carrera S Spyder")
  if (CONVERTIBLE_KEYWORDS.some((kw) => lower.includes(kw))) return 'Convertible Cars'

  // Check SUV
  if (SUV_KEYWORDS.some((kw) => lower.includes(kw))) return 'SUV Cars'

  // Everything else is a sports car (coupes, sedans, performance cars)
  // This covers: RS7, RS6, RS5, RS3, R8, 911 Turbo S, GT3, GT3 RS,
  // Wraith, Continental GT, Vantage, MC20, AMG GT, etc.
  return 'Sports Cars'
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
          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap',
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
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap',
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

export function VehicleGrid({ vehicles }: VehicleGridProps) {
  const { t } = useTranslation()
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  // Pre-compute brand and car type for each vehicle
  const vehiclesWithMeta = useMemo(
    () =>
      vehicles.map((v) => ({
        ...v,
        brand: extractBrand(v.name),
        carType: extractCarType(v.name, v.category),
      })),
    [vehicles]
  )

  // Available brands — filtered by selected type so impossible combos are dimmed
  const availableBrands = useMemo(() => {
    const set = new Set<string>()
    vehiclesWithMeta.forEach((v) => {
      if (!BRANDS.includes(v.brand as typeof BRANDS[number])) return
      if (selectedType && v.carType !== selectedType) return
      set.add(v.brand)
    })
    return set
  }, [vehiclesWithMeta, selectedType])

  // Available types — filtered by selected brand so impossible combos are dimmed
  const availableTypes = useMemo(() => {
    const set = new Set<string>()
    vehiclesWithMeta.forEach((v) => {
      if (!v.carType || !CAR_TYPES.includes(v.carType as typeof CAR_TYPES[number])) return
      if (selectedBrand && v.brand !== selectedBrand) return
      set.add(v.carType)
    })
    return set
  }, [vehiclesWithMeta, selectedBrand])

  // Filter vehicles
  const filtered = useMemo(() => {
    return vehiclesWithMeta.filter((v) => {
      if (selectedBrand && v.brand !== selectedBrand) return false
      if (selectedType && v.carType !== selectedType) return false
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

  const hasActiveFilter = selectedBrand || selectedType

  return (
    <div className="space-y-8">
      {/* Filter pills */}
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-brand-muted text-sm">{t('catalogue.noMatch')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((vehicle, i) => (
            <div
              key={vehicle.slug}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <VehicleCard {...vehicle} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
