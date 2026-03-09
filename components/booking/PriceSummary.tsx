'use client'

import Image from 'next/image'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import {
  calculateBookingTotal,
  type BookingPricingInput,
} from '@/lib/pricing/calculator'
import { useCurrency } from '@/lib/currency/context'
import { useTranslation } from '@/lib/i18n/context'

interface PriceSummaryProps {
  vehicle: Vehicle
  form: UseFormReturn<BookingFormValues>
}

export function PriceSummary({ vehicle, form }: PriceSummaryProps) {
  const { formatPrice } = useCurrency()
  const { t } = useTranslation()
  // Reactively watch all pricing-relevant fields
  const durationType = useWatch({ control: form.control, name: 'durationType' })
  const startDate = useWatch({ control: form.control, name: 'startDate' })
  const endDate = useWatch({ control: form.control, name: 'endDate' })
  const pickupMethod = useWatch({ control: form.control, name: 'pickupMethod' })
  const returnMethod = useWatch({ control: form.control, name: 'returnMethod' })
  const depositChoice = useWatch({ control: form.control, name: 'depositChoice' })
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' })

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
        paymentMethod: paymentMethod ?? 'card',
      } as BookingPricingInput)
    : null

  return (
    <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-medium text-white">{t('booking.priceSummary')}</h3>
        {vehicle.primary_image_url && (
          <div className="w-12 h-8 rounded overflow-hidden">
            <Image
              src={vehicle.primary_image_url}
              alt={vehicle.name}
              width={48}
              height={32}
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
                {t('booking.rental')}{' '}
                <span className="text-brand-muted/60 text-xs">
                  {breakdown.rentalDays} {breakdown.rentalDays !== 1 ? t('booking.days') : t('booking.day')} {t('booking.at')} {formatPrice(breakdown.baseRate)}/{t('booking.day')}
                </span>
              </span>
              <span className="text-white shrink-0">{formatPrice(breakdown.rentalSubtotal)}</span>
            </div>

            {/* Discount badge */}
            {breakdown.discountPercent > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-green-400 text-xs font-medium">
                  {t('booking.longTermDiscount').replace('{percent}', String(breakdown.discountPercent))}
                </span>
              </div>
            )}

            {/* Delivery fee */}
            {breakdown.deliveryFee > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">{t('booking.deliveryFee')}</span>
                <span className="text-white shrink-0">{formatPrice(breakdown.deliveryFee, { exact: true })}</span>
              </div>
            )}

            {/* Collection fee */}
            {breakdown.returnFee > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">{t('booking.collectionFee')}</span>
                <span className="text-white shrink-0">{formatPrice(breakdown.returnFee, { exact: true })}</span>
              </div>
            )}

            {/* No-deposit surcharge */}
            {breakdown.noDepositSurcharge > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">{t('booking.noDepositSurcharge')}</span>
                <span className="text-white shrink-0">{formatPrice(breakdown.noDepositSurcharge)}</span>
              </div>
            )}

            {/* Payment processing fee */}
            {breakdown.paymentSurcharge > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">
                  Processing fee ({breakdown.paymentSurchargePercent}%)
                </span>
                <span className="text-white shrink-0">{formatPrice(breakdown.paymentSurcharge)}</span>
              </div>
            )}
            {breakdown.paymentSurchargePercent === 0 && paymentMethod === 'crypto' && (
              <div className="flex justify-between gap-2">
                <span className="text-green-400 text-xs font-medium">No processing fee</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-brand-border" />

          {/* Total */}
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm font-medium text-white">{t('booking.totalDue')}</span>
            <span className="text-xl font-semibold text-brand-cyan">
              {formatPrice(breakdown.totalDue)}
            </span>
          </div>

          {/* Deposit hold note */}
          {breakdown.depositAmount > 0 && (depositChoice === 'deposit') && (
            <div className="bg-black/20 rounded-[var(--radius-card)] px-3 py-2.5 text-xs space-y-0.5">
              <div className="flex justify-between gap-2">
                <span className="text-brand-muted">{t('booking.depositHold')}</span>
                <span className="text-white">{formatPrice(breakdown.depositAmount)}</span>
              </div>
              <p className="text-brand-muted/60">{t('booking.depositHoldNote')}</p>
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
          <p className="text-sm text-brand-muted">{t('booking.selectDatesForPricing')}</p>
        </div>
      )}
    </div>
  )
}
