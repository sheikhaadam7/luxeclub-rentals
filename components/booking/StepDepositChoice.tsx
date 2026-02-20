'use client'

import { UseFormReturn, useWatch } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { Vehicle } from '@/components/booking/BookingWizard'
import { differenceInDays } from 'date-fns'

interface StepDepositChoiceProps {
  form: UseFormReturn<BookingFormValues>
  vehicle: Vehicle
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US')
}

export function StepDepositChoice({ form, vehicle }: StepDepositChoiceProps) {
  const depositChoice = form.watch('depositChoice')

  // Watch form values for surcharge preview
  const startDate = useWatch({ control: form.control, name: 'startDate' })
  const endDate = useWatch({ control: form.control, name: 'endDate' })

  const depositAmount = vehicle.deposit_amount ?? 5000

  // Calculate surcharge preview
  let surchargePreview = 0
  let rentalDays = 0
  if (startDate && endDate) {
    rentalDays = differenceInDays(endDate, startDate) + 1
    const dailyRate = vehicle.daily_rate ?? 0
    surchargePreview = Math.round(dailyRate * 0.3 * rentalDays * 100) / 100
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-medium text-white mb-1">Deposit Option</h2>
        <p className="text-sm text-brand-muted">Choose how you prefer to handle the security deposit.</p>
      </div>

      {/* Option cards */}
      <div className="space-y-3">
        {/* Pay Deposit card */}
        <button
          type="button"
          onClick={() => form.setValue('depositChoice', 'deposit', { shouldValidate: true })}
          className={[
            'w-full p-5 rounded-[--radius-card] border text-left transition-all',
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
                  Pay Deposit
                </p>
                <span className="text-sm font-semibold text-white shrink-0">
                  AED {formatAmount(depositAmount)}
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                This amount will be authorized (held) on your card and automatically released after the vehicle is returned in good condition. You are not charged — it is a temporary hold only.
              </p>
            </div>
          </div>
        </button>

        {/* No Deposit card */}
        <button
          type="button"
          onClick={() => form.setValue('depositChoice', 'no_deposit', { shouldValidate: true })}
          className={[
            'w-full p-5 rounded-[--radius-card] border text-left transition-all',
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
                  No Deposit
                </p>
                <span className="text-sm font-semibold text-white shrink-0">+30% surcharge</span>
              </div>
              <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">
                Skip the deposit hold entirely. Instead, a 30% daily surcharge is added to your rental total.
              </p>

              {/* Surcharge preview */}
              {surchargePreview > 0 ? (
                <div className="mt-3 bg-black/20 rounded-[--radius-card] px-3 py-2 text-xs">
                  <div className="flex justify-between text-brand-muted">
                    <span>Surcharge ({rentalDays} day{rentalDays !== 1 ? 's' : ''} × 30% daily rate):</span>
                    <span className="text-white font-medium">AED {formatAmount(surchargePreview)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-brand-muted/60 italic">
                  Select dates to see surcharge amount
                </p>
              )}
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
          The deposit option is per vehicle and set by LuxeClub. Both options provide equal rental experience — deposit protects you from upfront surcharges.
        </p>
      </div>
    </div>
  )
}
