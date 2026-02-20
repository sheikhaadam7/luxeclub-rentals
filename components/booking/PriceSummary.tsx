'use client'

import { UseFormReturn, useWatch } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import {
  calculateBookingTotal,
  type BookingPricingInput,
} from '@/lib/pricing/calculator'

interface PriceSummaryProps {
  vehicle: Vehicle
  form: UseFormReturn<BookingFormValues>
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US')
}

function formatDurationType(type: 'daily' | 'weekly' | 'monthly'): string {
  const map: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
  return map[type] ?? type
}

export function PriceSummary({ vehicle, form }: PriceSummaryProps) {
  // Reactively watch all pricing-relevant fields
  const durationType = useWatch({ control: form.control, name: 'durationType' })
  const startDate = useWatch({ control: form.control, name: 'startDate' })
  const endDate = useWatch({ control: form.control, name: 'endDate' })
  const pickupMethod = useWatch({ control: form.control, name: 'pickupMethod' })
  const returnMethod = useWatch({ control: form.control, name: 'returnMethod' })
  const depositChoice = useWatch({ control: form.control, name: 'depositChoice' })

  // Only calculate when dates are set
  const hasDates = startDate instanceof Date && endDate instanceof Date

  const breakdown = hasDates
    ? calculateBookingTotal(vehicle, {
        startDate,
        endDate,
        durationType: durationType ?? 'daily',
        pickupMethod: pickupMethod ?? 'self_pickup',
        returnMethod: returnMethod ?? 'self_dropoff',
        depositChoice: depositChoice ?? 'deposit',
      } as BookingPricingInput)
    : null

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-medium text-white">Price Summary</h3>
        {vehicle.primary_image_url && (
          <div className="w-12 h-8 rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vehicle.primary_image_url}
              alt={vehicle.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      <p className="text-xs text-brand-muted">{vehicle.name}</p>

      {breakdown ? (
        <>
          {/* Breakdown line items */}
          <div className="space-y-2 text-sm">
            {/* Rental */}
            <div className="flex justify-between gap-2">
              <span className="text-brand-muted">
                Rental ({formatDurationType(durationType ?? 'daily')}){' '}
                <span className="text-brand-muted/60 text-xs">
                  {breakdown.rentalDays} day{breakdown.rentalDays !== 1 ? 's' : ''}
                </span>
              </span>
              <span className="text-white shrink-0">AED {formatAmount(breakdown.rentalSubtotal)}</span>
            </div>

            {/* Delivery fee */}
            {breakdown.deliveryFee > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">Delivery fee</span>
                <span className="text-white shrink-0">AED {formatAmount(breakdown.deliveryFee)}</span>
              </div>
            )}

            {/* Return/collection fee */}
            {breakdown.returnFee > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">Return collection</span>
                <span className="text-white shrink-0">AED {formatAmount(breakdown.returnFee)}</span>
              </div>
            )}

            {/* No-deposit surcharge */}
            {breakdown.noDepositSurcharge > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">No-deposit surcharge</span>
                <span className="text-white shrink-0">AED {formatAmount(breakdown.noDepositSurcharge)}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-brand-border" />

          {/* Total */}
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm font-medium text-white">Total Due</span>
            <span className="text-xl font-semibold text-brand-cyan">
              AED {formatAmount(breakdown.totalDue)}
            </span>
          </div>

          {/* Deposit hold note */}
          {breakdown.depositAmount > 0 && (depositChoice === 'deposit') && (
            <div className="bg-black/20 rounded-[--radius-card] px-3 py-2.5 text-xs space-y-0.5">
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">Deposit hold</span>
                <span className="text-white">AED {formatAmount(breakdown.depositAmount)}</span>
              </div>
              <p className="text-brand-muted/60">(authorized, not charged — released on return)</p>
            </div>
          )}
        </>
      ) : (
        <div className="py-6 text-center space-y-2">
          <svg
            className="w-8 h-8 text-brand-muted/40 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>
          <p className="text-sm text-brand-muted">Select dates to see pricing</p>
        </div>
      )}
    </div>
  )
}
