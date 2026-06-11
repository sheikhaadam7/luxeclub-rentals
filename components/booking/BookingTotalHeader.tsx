'use client'

import { useMemo, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import { calculateBookingTotal } from '@/lib/pricing/calculator'
import { PriceDetailsModal } from '@/components/booking/PriceDetailsModal'

interface BookingTotalHeaderProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
}

function formatAED(n: number): string {
  return n.toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function useBookingBreakdown(form: UseFormReturn<BookingFormValues>, vehicle: Vehicle) {
  const values = form.watch()
  return useMemo(() => {
    const start = values.startDate instanceof Date ? values.startDate : new Date()
    const end = values.endDate instanceof Date ? values.endDate : new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return calculateBookingTotal(
      {
        daily_rate: vehicle.daily_rate,
        weekly_rate: vehicle.weekly_rate,
        monthly_rate: vehicle.monthly_rate,
        deposit_amount: vehicle.deposit_amount,
      },
      {
        startDate: start,
        endDate: end,
        durationType: values.durationType ?? 'daily',
        pickupMethod: values.pickupMethod ?? 'self_pickup',
        returnMethod: values.returnMethod ?? 'self_dropoff',
        deliveryLocation: values.deliveryLocation,
        depositChoice: values.depositChoice ?? 'deposit',
        paymentMethod: values.paymentMethod ?? 'card',
        protectionPackage: values.protectionPackage ?? 'basic',
        addons: values.addons ?? {
          additionalDriver: false,
          personalDriver: false,
          babySeat: false,
          childSeat: false,
        },
      },
    )
  }, [values, vehicle])
}

export function BookingTotalHeader({ form, vehicle }: BookingTotalHeaderProps) {
  const [open, setOpen] = useState(false)
  const breakdown = useBookingBreakdown(form, vehicle)

  return (
    <>
      <div className="hidden sm:flex lg:hidden items-start justify-end">
        <div className="text-right">
          <p className="text-xs sm:text-sm text-brand-muted uppercase tracking-wider">Total</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
            AED {formatAED(breakdown.totalDue)}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs sm:text-sm text-brand-cyan underline underline-offset-4 hover:text-brand-cyan-hover transition-colors mt-1"
          >
            Price details
          </button>
        </div>
      </div>

      <PriceDetailsModal open={open} onClose={() => setOpen(false)} breakdown={breakdown} />
    </>
  )
}

export { formatAED }
