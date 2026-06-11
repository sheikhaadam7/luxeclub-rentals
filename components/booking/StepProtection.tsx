'use client'

import { useEffect, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'

interface StepProtectionProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
  /** Navigation buttons (Back / Continue) rendered inside the white card */
  navButtons?: React.ReactNode
  /** Called when the user taps the back chevron on the card (mobile) */
  onBack?: () => void
}

type ProtectionId = 'basic' | 'inclusive'
type FeatureKey = 'ldw' | 'tyres' | 'interior' | 'roadside'

interface Feature {
  key: FeatureKey
  label: string
  infoText: string
}

const FEATURES: Feature[] = [
  {
    key: 'ldw',
    label: 'Loss Damage Waiver (including theft protection)',
    infoText:
      'Enjoy peace of mind, knowing you are protected from high costs in case your vehicle is stolen or damaged. Instead of paying up to the full vehicle value, you will only need to cover up to the amount specified as the excess.',
  },
  {
    key: 'tyres',
    label: 'Tyre and Windscreen Protection',
    infoText:
      "Don't worry about glass or tyre damage: no matter whether a stone chip, cracks, or an overlooked nail — you are covered during your rental.",
  },
  {
    key: 'interior',
    label: 'Interior Protection',
    infoText:
      'Relax throughout your trip: interior protection lets you travel worry-free — no stress about spills or scratches, whether from kids or everyday use during your rental.',
  },
  {
    key: 'roadside',
    label: 'Roadside Protection',
    infoText:
      "Be protected against the cost of accidental and self-inflicted situations: real-life mishaps that stop your trip, like lost keys, a dead battery, or an empty tank. We'll get you back on the road quickly.",
  },
]

interface ProtectionPackage {
  id: ProtectionId
  name: string
  stars: number
  excess: string
  excessHighlight: 'red' | 'green'
  included: Record<FeatureKey, boolean>
  priceLabel: string
  priceSubtext?: string
  depositChoice: 'deposit' | 'no_deposit'
}

const PACKAGES: ProtectionPackage[] = [
  {
    id: 'basic',
    name: 'Basic Protection',
    stars: 2,
    excess: 'Excess: up to AED 5,000.00',
    excessHighlight: 'red',
    included: { ldw: true, tyres: false, interior: false, roadside: false },
    priceLabel: 'Included',
    depositChoice: 'deposit',
  },
  {
    id: 'inclusive',
    name: 'All Inclusive Protection',
    stars: 3,
    excess: 'No excess',
    excessHighlight: 'green',
    included: { ldw: true, tyres: true, interior: true, roadside: true },
    priceLabel: 'AED 72.80 / day',
    priceSubtext: 'added to total',
    depositChoice: 'no_deposit',
  },
]

export function StepProtection({ form, navButtons, onBack }: StepProtectionProps) {
  const selectedId = (form.watch('protectionPackage') ?? 'basic') as ProtectionId

  const [openTooltip, setOpenTooltip] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close tooltip on outside tap or Escape
  useEffect(() => {
    if (!openTooltip) return
    function handleDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenTooltip(null)
        return
      }
      // Also close if the tap is inside the card but not on a tooltip / info button
      const target = e.target as HTMLElement
      if (!target.closest('[data-tooltip-trigger]') && !target.closest('[data-tooltip-panel]')) {
        setOpenTooltip(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenTooltip(null)
    }
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handleDown)
      document.addEventListener('keydown', handleKey)
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openTooltip])

  // Protection and Deposit are independent — the under-24 rule applies to the
  // No Deposit Option (Step 3), not to Protection.
  function selectPackage(id: ProtectionId) {
    form.setValue('protectionPackage', id, { shouldValidate: true })
  }

  return (
    <div
      ref={rootRef}
      className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6"
    >
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to previous step"
            className="sm:hidden -mt-2 -ml-2 mb-1 inline-flex items-center gap-1 h-10 pl-2 pr-3 text-[15px] font-bold text-black active:bg-black/10 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-zinc-900">
          Which protection package do you need?
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PACKAGES.map((pkg) => {
          const isSelected = selectedId === pkg.id
          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => selectPackage(pkg.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectPackage(pkg.id)
                }
              }}
              className={[
                'text-left p-5 sm:p-6 rounded-[var(--radius-card)] border-2 transition-colors flex flex-col cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan',
                isSelected
                  ? 'border-brand-cyan bg-brand-cyan/5'
                  : 'border-zinc-200 hover:border-zinc-400',
              ].join(' ')}
            >
              {/* Header: name + radio */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-display text-lg sm:text-xl font-bold text-zinc-900 leading-tight">
                  {pkg.name}
                </h3>
                <div
                  className={[
                    'mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'bg-zinc-900' : 'border-2 border-zinc-300 bg-white',
                  ].join(' ')}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              <div className="flex items-center gap-0.5 mb-2 text-lg leading-none">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={i <= pkg.stars ? 'text-zinc-900' : 'text-zinc-300'}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
                <span className="sr-only">{pkg.stars} of 3 stars</span>
              </div>

              <p
                className={[
                  'text-sm font-bold mb-4',
                  pkg.excessHighlight === 'green' ? 'text-emerald-600' : 'text-zinc-900',
                ].join(' ')}
              >
                {pkg.excess}
              </p>

              <div className="h-px bg-zinc-200 mb-4" />

              <ul className="space-y-3 mb-4 flex-1">
                {FEATURES.map((feature) => {
                  const included = pkg.included[feature.key]
                  const tooltipKey = `${pkg.id}-${feature.key}`
                  const isTooltipOpen = openTooltip === tooltipKey
                  return (
                    <li
                      key={feature.key}
                      className="relative flex items-start gap-3 text-base"
                    >
                      {included ? (
                        <svg
                          className="w-5 h-5 mt-0.5 text-zinc-900 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 mt-0.5 text-zinc-300 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={['flex-1 leading-snug', included ? 'text-zinc-900' : 'text-zinc-400'].join(' ')}>
                        {feature.label}
                      </span>
                      <button
                        type="button"
                        data-tooltip-trigger
                        aria-label={`What is ${feature.label}?`}
                        aria-expanded={isTooltipOpen}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenTooltip(isTooltipOpen ? null : tooltipKey)
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="shrink-0 w-6 h-6 mt-0.5 text-zinc-400 hover:text-zinc-900 transition-colors"
                      >
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
                        </svg>
                      </button>
                      {isTooltipOpen && (
                        <div
                          data-tooltip-panel
                          className="absolute top-full right-0 mt-2 w-60 sm:w-72 p-3 bg-zinc-900 text-white text-sm leading-relaxed rounded-lg shadow-lg z-30"
                        >
                          {feature.infoText}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="pt-3 border-t border-zinc-200">
                <p className="text-lg font-bold text-zinc-900">{pkg.priceLabel}</p>
                {pkg.priceSubtext && (
                  <p className="text-xs text-zinc-500 mt-0.5">{pkg.priceSubtext}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {navButtons && <div className="pt-4 border-t border-zinc-200">{navButtons}</div>}
    </div>
  )
}
