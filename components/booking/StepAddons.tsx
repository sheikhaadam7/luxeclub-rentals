'use client'

import { useEffect, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { differenceInDays } from 'date-fns'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import { ADDON_PRICES, noDepositTierFee } from '@/lib/pricing/calculator'

interface StepAddonsProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
  /** Navigation buttons (Back / Continue) rendered inside the white card */
  navButtons?: React.ReactNode
}

type AddonId = 'noDeposit' | 'additionalDriver' | 'personalDriver' | 'babySeat' | 'childSeat'

interface AddonRow {
  id: AddonId
  name: string
  /** Function that returns the displayed price label, given context (rentalDays). */
  priceLabel: (rentalDays: number) => string
  period: string
  details: string
  icon: React.ReactNode
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="w-6 h-6 text-zinc-700 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      {children}
    </svg>
  )
}

const ADDONS: AddonRow[] = [
  {
    id: 'noDeposit',
    name: 'No Deposit Option',
    priceLabel: (days) => `AED ${noDepositTierFee(days).toFixed(2)}`,
    period: 'one-time',
    details:
      "For customers who don't opt into the No-Deposit Option, a pre-authorisation deposit of AED 1,000–3,000 (depending on the vehicle type) is placed on the credit card at pickup. No money is taken from your card — the amount is only pre-authorised by your credit card company and released within a few days after the vehicle is returned.",
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 4.5-3 8.5-8 9-5-.5-8-4.5-8-9V7l8-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </Icon>
    ),
  },
  {
    id: 'additionalDriver',
    name: 'Additional Driver',
    priceLabel: () => `AED ${ADDON_PRICES.additionalDriver.toFixed(2)}`,
    period: '/ day',
    details:
      "Add a second driver to share the wheel — perfect for long road trips. Both drivers must present their valid driving licence at pickup.",
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3.5" />
        <path strokeLinecap="round" d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        <path strokeLinecap="round" d="M18 7v6M21 10h-6" />
      </Icon>
    ),
  },
  {
    id: 'personalDriver',
    name: 'Personal Driver',
    priceLabel: () => `AED ${ADDON_PRICES.personalDriver.toFixed(2)}`,
    period: '/ day',
    details:
      "Driving in Dubai isn't always easy for visitors — unfamiliar roads, busy parking, unpredictable traffic. With your own chauffeur, you're dropped off and picked up at your leisure. Hassle-free.",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      </Icon>
    ),
  },
  {
    id: 'babySeat',
    name: 'Baby Seat',
    priceLabel: () => `AED ${ADDON_PRICES.babySeat.toFixed(2)}`,
    period: '/ day',
    details:
      "A rear-facing baby seat suitable for infants up to 13 kg, fitted before pickup. Please confirm your child's age when booking so we send the right model.",
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l-1 5H9l-1-5zM6 9h12v6a4 4 0 01-4 4h-4a4 4 0 01-4-4V9z" />
      </Icon>
    ),
  },
  {
    id: 'childSeat',
    name: 'Child Seat',
    priceLabel: () => `AED ${ADDON_PRICES.childSeat.toFixed(2)}`,
    period: '/ day',
    details:
      "A forward-facing child seat suitable for children roughly 9–18 kg / 1–4 years old, fitted before pickup.",
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v9a5 5 0 01-5 5 5 5 0 01-5-5V4z" />
        <path strokeLinecap="round" d="M9 18v3M15 18v3" />
      </Icon>
    ),
  },
]

export function StepAddons({ form, vehicle: _vehicle, navButtons }: StepAddonsProps) {
  const driverAge = form.watch('driverAge') ?? '30+'
  const underTwentyFour = ['21', '22', '23'].includes(driverAge)

  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')
  const rentalDays =
    startDate instanceof Date && endDate instanceof Date
      ? Math.max(differenceInDays(endDate, startDate), 1)
      : 1

  const depositChoice = form.watch('depositChoice') ?? 'deposit'
  const addons = form.watch('addons') ?? {
    additionalDriver: false,
    personalDriver: false,
    babySeat: false,
    childSeat: false,
  }

  const [expandedId, setExpandedId] = useState<AddonId | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // If driver becomes under-24 while No Deposit is on, snap it off
  useEffect(() => {
    if (underTwentyFour && depositChoice === 'no_deposit') {
      form.setValue('depositChoice', 'deposit', { shouldValidate: true })
    }
  }, [underTwentyFour, depositChoice, form])

  function isOn(id: AddonId): boolean {
    if (id === 'noDeposit') return depositChoice === 'no_deposit'
    return Boolean(addons[id as keyof typeof addons])
  }

  function toggle(id: AddonId) {
    if (id === 'noDeposit') {
      if (underTwentyFour) return
      const next = depositChoice === 'no_deposit' ? 'deposit' : 'no_deposit'
      form.setValue('depositChoice', next, { shouldValidate: true })
      return
    }
    const key = id as keyof typeof addons
    form.setValue(`addons.${key}` as 'addons.additionalDriver', !addons[key], {
      shouldValidate: true,
    })
  }

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6"
    >
      <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-zinc-900">
        Which add-ons do you need?
      </h2>

      <div className="space-y-3">
        {ADDONS.map((addon) => {
          const on = isOn(addon.id)
          const disabled = addon.id === 'noDeposit' && underTwentyFour
          const expanded = expandedId === addon.id
          return (
            <div
              key={addon.id}
              className={[
                'rounded-[var(--radius-card)] border transition-colors',
                on ? 'border-brand-cyan bg-brand-cyan/5' : 'border-zinc-200 bg-white',
                disabled ? 'opacity-60' : '',
              ].join(' ')}
            >
              {/* Top row */}
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <div className="mt-0.5">{addon.icon}</div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-zinc-900">{addon.name}</p>
                  <p className="text-sm text-zinc-700 mt-0.5">
                    <span className="font-semibold">{addon.priceLabel(rentalDays)}</span>{' '}
                    <span className="text-zinc-500">{addon.period}</span>
                  </p>
                  {disabled && (
                    <p className="text-xs text-amber-600 mt-1">
                      Available for drivers 24+ only.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : addon.id)}
                  className="text-sm text-zinc-700 underline underline-offset-4 hover:text-zinc-900 transition-colors shrink-0 mt-1"
                >
                  {expanded ? 'Close details' : 'Details'}
                </button>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? 'Disable' : 'Enable'} ${addon.name}`}
                  disabled={disabled}
                  onClick={() => toggle(addon.id)}
                  className={[
                    'relative inline-flex h-7 w-12 shrink-0 mt-0.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan',
                    on ? 'bg-brand-cyan' : 'bg-zinc-300',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform mt-0.5',
                      on ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </button>
              </div>

              {/* Expanded details */}
              {expanded && (
                <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 bg-zinc-50 rounded-[var(--radius-card)] p-4 text-sm text-zinc-700 leading-relaxed border border-zinc-200">
                  {addon.details}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {navButtons && <div className="pt-4 border-t border-zinc-200">{navButtons}</div>}
    </div>
  )
}
