'use client'

import { useMemo, useState } from 'react'
import { VehicleCard } from './VehicleCard'

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

/** Brands in the exact order shown on luxeclubrentals.com/garage */
const LUXECLUB_BRANDS = [
  'Audi',
  'Porsche',
  'Bentley',
  'Maserati',
  'Aston Martin',
  'Range Rover',
  'Cadillac',
  'Rolls Royce',
  'Mercedes',
] as const

/** Car types in the exact order shown on luxeclubrentals.com/garage */
const LUXECLUB_CAR_TYPES = [
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
  return name.split(' ')[0] ?? name
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
]

/**
 * Convertible / Spyder models — matched by keyword in vehicle name.
 * Covers: Spyder, Spider, Dawn, GTC, Cabriolet, Roadster, etc.
 */
const CONVERTIBLE_KEYWORDS = [
  'spyder', 'spider', 'dawn', 'gtc', 'cabriolet', 'cabrio',
  'roadster', 'convertible', 'carrera s spyder',
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
// Accordion filter dropdown — matches LuxeClub /garage design
// ---------------------------------------------------------------------------

interface FilterDropdownProps {
  label: string
  options: readonly string[]
  selected: string | null
  onSelect: (value: string | null) => void
  /** Only show options that have at least one vehicle */
  availableOptions?: Set<string>
}

function FilterDropdown({ label, options, selected, onSelect, availableOptions }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 group"
      >
        <span className="font-display text-2xl sm:text-3xl font-medium text-white tracking-tight">
          {label}
        </span>
        <svg
          className={[
            'w-5 h-5 text-white/70 transition-transform duration-300',
            open ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Options list */}
      <div
        className={[
          'overflow-hidden transition-all duration-500',
          open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="pb-2 space-y-0.5">
          {options.map((option) => {
            const isSelected = selected === option
            const isAvailable = !availableOptions || availableOptions.has(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => isAvailable && onSelect(isSelected ? null : option)}
                className={[
                  'w-full flex items-center justify-between py-3 px-1 group/item',
                  !isAvailable ? 'opacity-25 cursor-default' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-base sm:text-lg transition-colors duration-200',
                    isSelected
                      ? 'text-white font-medium'
                      : isAvailable
                        ? 'text-white/40 group-hover/item:text-white/70'
                        : 'text-white/20',
                  ].join(' ')}
                >
                  {option}
                </span>
                {/* Radio circle */}
                <span
                  className={[
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300',
                    isSelected
                      ? 'border-white bg-white'
                      : isAvailable
                        ? 'border-white/25 group-hover/item:border-white/40'
                        : 'border-white/10',
                  ].join(' ')}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main grid component
// ---------------------------------------------------------------------------

export function VehicleGrid({ vehicles }: VehicleGridProps) {
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
      if (!LUXECLUB_BRANDS.includes(v.brand as typeof LUXECLUB_BRANDS[number])) return
      if (selectedType && v.carType !== selectedType) return
      set.add(v.brand)
    })
    return set
  }, [vehiclesWithMeta, selectedType])

  // Available types — filtered by selected brand so impossible combos are dimmed
  const availableTypes = useMemo(() => {
    const set = new Set<string>()
    vehiclesWithMeta.forEach((v) => {
      if (!v.carType || !LUXECLUB_CAR_TYPES.includes(v.carType as typeof LUXECLUB_CAR_TYPES[number])) return
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
        <p className="text-brand-muted text-base">No vehicles available</p>
      </div>
    )
  }

  const hasActiveFilter = selectedBrand || selectedType

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      {/* Filter sidebar */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div data-lenis-prevent className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain space-y-0 scrollbar-hide">
          <FilterDropdown
            label="Brands"
            options={LUXECLUB_BRANDS}
            selected={selectedBrand}
            onSelect={setSelectedBrand}
            availableOptions={availableBrands}
          />

          {/* Separator */}
          <div className="h-px bg-white/[0.08]" />

          <FilterDropdown
            label="Cars Types"
            options={LUXECLUB_CAR_TYPES}
            selected={selectedType}
            onSelect={setSelectedType}
            availableOptions={availableTypes}
          />

          {/* Clear filters */}
          {hasActiveFilter && (
            <>
              <div className="h-px bg-white/[0.08] mt-2" />
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand(null)
                  setSelectedType(null)
                }}
                className="w-full mt-4 py-3 rounded-xl text-[13px] font-medium text-brand-muted hover:text-white border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300"
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Grid */}
      <div className="flex-1 min-w-0">
        {/* Results count */}
        <p className="text-[13px] text-brand-muted mb-6">
          {filtered.length} {filtered.length === 1 ? 'vehicle' : 'vehicles'}
          {selectedBrand && (
            <> by <span className="text-white font-medium">{selectedBrand}</span></>
          )}
          {selectedType && (
            <> in <span className="text-white font-medium">{selectedType}</span></>
          )}
        </p>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-brand-muted text-sm">No vehicles match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  )
}
