'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { VehicleCard } from './VehicleCard'
import { useTranslation } from '@/lib/i18n/context'

// URL slug helpers. "Rolls Royce" -> "rolls-royce"; "SUV" -> "suv"; "7-Seater"
// already contains a hyphen so lowercasing preserves it. Round-trip via fromSlug
// picks the canonical BRANDS / CAR_TYPES value back out.
const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
function fromSlug<T extends readonly string[]>(slug: string | null | undefined, list: T): T[number] | null {
  if (!slug) return null
  return list.find((item) => toSlug(item) === slug) ?? null
}

interface Vehicle {
  slug: string
  name: string
  brand: string | null
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
  initialCategory?: string | null
}

// ---------------------------------------------------------------------------
// Brand & type matching — mirrors LuxeClub /garage filters
// ---------------------------------------------------------------------------

/** All brands we support as top-level filter chips. Union of LuxeClub's current
 *  fleet + VIP's 27 brand pages (verified 2026-09-17). Alphabetized. Chips with
 *  no matching vehicles are disabled by PillFilter via `availableOptions`. */
const BRANDS = [
  'Aston Martin',
  'Audi',
  'Bentley',
  'BMW',
  'Brabus',
  'Cadillac',
  'Chevrolet',
  'Corvette',
  'Dodge',
  'Ferrari',
  'Ford',
  'GMC',
  'Infiniti',
  'Jaguar',
  'Lamborghini',
  'Land Rover',
  'Maserati',
  'Maybach',
  'McLaren',
  'Mercedes',
  'Mini',
  'Mustang',
  'Nissan',
  'Porsche',
  'Range Rover',
  'Rolls Royce',
  'Tesla',
  'Toyota',
] as const

/**
 * Canonical car types — read directly from `vehicles.categories` in Supabase.
 * Order here is the pill display order. Assignment is driven by the
 * spreadsheet workflow at `scripts/export-car-types.py` /
 * `scripts/import-car-types.py`. Extended 2026-09-18 to mirror VIP's category
 * breadth (Luxury, Supercar, Van, 7-Seater, Modified). Monthly/Budget skipped
 * — those are pricing filters, not vehicle types.
 */
// Mirrored in master-sheet scripts/_name_matching.py:CANONICAL_CATEGORIES — keep in sync.
const CAR_TYPES = [
  'Luxury',
  'Sports',
  'Supercar',
  'SUV',
  'Convertible',
  'Sedan',
  'Coupe',
  'Family',
  'Van',
  '7-Seater',
  'Modified',
] as const

/** Multi-word brands that need prefix matching */
const MULTI_WORD_BRANDS = ['Aston Martin', 'Land Rover', 'Range Rover', 'Rolls Royce']

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
          'px-5 py-2.5 rounded-none text-base font-semibold transition-all duration-200 border whitespace-nowrap',
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
              'px-5 py-2.5 rounded-none text-base font-semibold transition-all duration-200 border whitespace-nowrap',
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

export function VehicleGrid({ vehicles, initialBrand, initialCategory }: VehicleGridProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filter state is derived from the URL — single source of truth so back/forward
  // buttons and shared links work naturally. The server-side initialBrand /
  // initialCategory props are the first-render fallback in case useSearchParams
  // returns null before hydration completes.
  const brandParam = searchParams?.get('brand') ?? initialBrand ?? null
  const categoryParam = searchParams?.get('category') ?? initialCategory ?? null
  const selectedBrand = fromSlug(brandParam, BRANDS)
  const selectedType = fromSlug(categoryParam, CAR_TYPES)

  // Sync a filter change to the URL without a full page reload.
  const updateFilter = (kind: 'brand' | 'category', value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) {
      params.set(kind, toSlug(value))
    } else {
      params.delete(kind)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Pre-compute brand for each vehicle. Categories come straight from the DB array.
  // Brand: prefer the explicit DB column (set via the fleet spreadsheet); fall
  // back to the name-regex extractor for rows that haven't been brand-tagged.
  const vehiclesWithMeta = useMemo(
    () =>
      vehicles.map((v) => ({
        ...v,
        brand: v.brand ?? extractBrand(v.name),
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
            <p className="text-sm text-brand-muted uppercase tracking-wider font-semibold mb-3">{t('catalogue.brand')}</p>
            <PillFilter
              options={BRANDS}
              selected={selectedBrand}
              onSelect={(value) => updateFilter('brand', value)}
              availableOptions={availableBrands}
            />
          </div>

          {/* Type pills */}
          <div>
            <p className="text-sm text-brand-muted uppercase tracking-wider font-semibold mb-3">{t('catalogue.type')}</p>
            <PillFilter
              options={CAR_TYPES}
              selected={selectedType}
              onSelect={(value) => updateFilter('category', value)}
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
