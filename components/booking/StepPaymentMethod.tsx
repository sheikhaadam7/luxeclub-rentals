'use client'

import { UseFormReturn } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { useTranslation } from '@/lib/i18n/context'

interface StepPaymentMethodProps {
  form: UseFormReturn<BookingFormValues>
}

const PAYMENT_OPTIONS = [
  {
    value: 'card' as const,
    labelKey: 'booking.creditDebitCard',
    descKey: 'booking.creditDebitCardDesc',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    value: 'cash' as const,
    labelKey: 'booking.cashOnDelivery',
    descKey: 'booking.cashOnDeliveryDesc',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 'crypto' as const,
    labelKey: 'booking.cryptocurrency',
    descKey: 'booking.cryptocurrencyDesc',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function StepPaymentMethod({ form }: StepPaymentMethodProps) {
  const { t } = useTranslation()
  const paymentMethod = form.watch('paymentMethod')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-medium text-white mb-1">{t('booking.paymentMethod')}</h2>
        <p className="text-sm text-brand-muted">{t('booking.paymentMethodDesc')}</p>
      </div>

      <div className="space-y-3">
        {PAYMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => form.setValue('paymentMethod', option.value, { shouldValidate: true })}
            className={[
              'w-full p-5 rounded-[var(--radius-card)] border text-left transition-all',
              paymentMethod === option.value
                ? 'border-brand-cyan bg-brand-cyan/10'
                : 'border-brand-border hover:border-white/30',
            ].join(' ')}
          >
            <div className="flex items-start gap-4">
              {/* Radio indicator */}
              <div
                className={[
                  'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  paymentMethod === option.value ? 'border-brand-cyan' : 'border-brand-border',
                ].join(' ')}
              >
                {paymentMethod === option.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={paymentMethod === option.value ? 'text-brand-cyan' : 'text-white/60'}>
                    {option.icon}
                  </span>
                  <p className={['text-sm font-semibold', paymentMethod === option.value ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                    {t(option.labelKey)}
                  </p>
                </div>
                <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                  {t(option.descKey)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
