'use client'

import { UseFormReturn } from 'react-hook-form'
import type { BookingFormValues } from '@/lib/validations/booking'
import type { Vehicle } from '@/components/booking/BookingWizard'
import { useCurrency } from '@/lib/currency/context'

const KM_PER_DAY = 250
const EXTRA_KM_RATE_AED = 2.55

const DELIVERY_ZONE_LABELS: Record<string, string> = {
  within_dubai: 'Address within Dubai',
  al_maktoum_airport: 'Al Maktoum Airport',
  sharjah_airport: 'Sharjah Airport',
  sharjah_city: 'Sharjah City',
  ajman: 'Ajman',
  abu_dhabi: 'Abu Dhabi',
  al_ain: 'Al Ain',
  fujairah: 'Fujairah',
  ras_al_khaimah: 'Ras Al Khaimah',
}

interface BookingOverviewProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
  rentalDays: number
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-zinc-800">
      <svg
        className="w-4 h-4 mt-0.5 shrink-0 text-brand-cyan"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="leading-snug">{children}</span>
    </li>
  )
}

export function BookingOverview({ form, vehicle: _vehicle, rentalDays }: BookingOverviewProps) {
  const { formatPrice } = useCurrency()
  const protectionPackage = form.watch('protectionPackage') ?? 'basic'
  const addons = form.watch('addons') ?? {
    additionalDriver: false,
    personalDriver: false,
    babySeat: false,
    childSeat: false,
  }
  const depositChoice = form.watch('depositChoice')
  const pickupMethod = form.watch('pickupMethod')
  const deliveryLocation = form.watch('deliveryLocation')

  const days = Math.max(1, rentalDays || 1)
  const kmIncluded = days * KM_PER_DAY
  // Basic-protection Loss Damage Waiver excess. Fixed at AED 7,000 across
  // every vehicle to match the Step 2 Basic-package excess copy.
  const ldwAmount = 7000

  const deliveryLabel =
    pickupMethod === 'delivery' && deliveryLocation
      ? `Delivery & return — ${DELIVERY_ZONE_LABELS[deliveryLocation] ?? 'selected zone'}`
      : pickupMethod === 'self_pickup'
        ? 'Self pickup — Business Bay or Downtown Dubai'
        : null

  return (
    <div className="rounded-[var(--radius-card)] bg-zinc-100 border-2 border-brand-cyan p-5 space-y-4">
      <p className="text-base font-bold text-zinc-900">Your booking overview:</p>
      <ul className="space-y-3">
        <Item>Third party insurance</Item>

        {protectionPackage === 'basic' && (
          <Item>
            Loss Damage Waiver (including theft protection) up to {formatPrice(ldwAmount, { exact: true })}{' '}
            financial responsibility
          </Item>
        )}

        <Item>
          {kmIncluded.toLocaleString('en-US')} km are included, each additional kilometer costs{' '}
          {formatPrice(EXTRA_KM_RATE_AED, { exact: true })}
        </Item>

        {protectionPackage === 'inclusive' && (
          <Item>All Inclusive Protection (Minimum age 25) — No excess</Item>
        )}

        {deliveryLabel && <Item>{deliveryLabel}</Item>}
        {depositChoice === 'no_deposit' && <Item>No Deposit Option</Item>}
        {addons.additionalDriver && <Item>1 additional driver</Item>}
        {addons.personalDriver && <Item>Personal driver</Item>}
        {addons.babySeat && <Item>Baby seat</Item>}
        {addons.childSeat && <Item>Child seat</Item>}

        <Item>Booking option: Best price — Free cancellation and rebooking within 24h.</Item>
      </ul>
    </div>
  )
}
