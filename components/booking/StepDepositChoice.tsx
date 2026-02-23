'use client'

import { UseFormReturn } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import { useCurrency } from '@/lib/currency/context'
import { useTranslation } from '@/lib/i18n/context'

interface StepDepositChoiceProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
}

export function StepDepositChoice({ form, vehicle }: StepDepositChoiceProps) {
  const { formatPrice } = useCurrency()
  const { t } = useTranslation()
  const depositChoice = form.watch('depositChoice')
  const depositAmount = vehicle.daily_rate ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-medium text-white mb-1">{t('booking.depositOption')}</h2>
        <p className="text-sm text-brand-muted">{t('booking.depositOptionDesc')}</p>
      </div>

      {/* Option cards */}
      <div className="space-y-3">
        {/* Pay Deposit card */}
        <button
          type="button"
          onClick={() => form.setValue('depositChoice', 'deposit', { shouldValidate: true })}
          className={[
            'w-full p-5 rounded-[var(--radius-card)] border text-left transition-all',
            depositChoice === 'deposit'
              ? 'border-brand-cyan bg-brand-cyan/10'
              : 'border-brand-border hover:border-white/30',
          ].join(' ')}
        >
          <div className="flex items-start gap-4">
            {/* Radio indicator */}
            <div
              className={[
                'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                depositChoice === 'deposit' ? 'border-brand-cyan' : 'border-brand-border',
              ].join(' ')}
            >
              {depositChoice === 'deposit' && (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={['text-sm font-semibold', depositChoice === 'deposit' ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  {t('booking.payDeposit')}
                </p>
                <span className="text-sm font-semibold text-white shrink-0">
                  {formatPrice(depositAmount)}
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                {t('booking.payDepositDesc')}
              </p>
            </div>
          </div>
        </button>

        {/* No Deposit card */}
        <button
          type="button"
          onClick={() => form.setValue('depositChoice', 'no_deposit', { shouldValidate: true })}
          className={[
            'w-full p-5 rounded-[var(--radius-card)] border text-left transition-all',
            depositChoice === 'no_deposit'
              ? 'border-brand-cyan bg-brand-cyan/10'
              : 'border-brand-border hover:border-white/30',
          ].join(' ')}
        >
          <div className="flex items-start gap-4">
            {/* Radio indicator */}
            <div
              className={[
                'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                depositChoice === 'no_deposit' ? 'border-brand-cyan' : 'border-brand-border',
              ].join(' ')}
            >
              {depositChoice === 'no_deposit' && (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={['text-sm font-semibold', depositChoice === 'no_deposit' ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  {t('booking.noDeposit')}
                </p>
                <span className="text-sm font-semibold text-white shrink-0">+{formatPrice(200)}</span>
              </div>
              <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                {t('booking.noDepositDesc').replace('{amount}', formatPrice(200))}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-brand-muted">
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-brand-cyan/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p>
          {t('booking.depositCardNote')}
        </p>
      </div>
    </div>
  )
}
