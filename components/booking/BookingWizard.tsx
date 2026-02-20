'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bookingSchema, type BookingFormValues } from '@/lib/validations/booking'
import { StepDuration } from '@/components/booking/StepDuration'
import { StepDelivery } from '@/components/booking/StepDelivery'
import { StepDepositChoice } from '@/components/booking/StepDepositChoice'
import { PriceSummary } from '@/components/booking/PriceSummary'

const STEPS = ['duration', 'delivery', 'deposit', 'identity', 'payment'] as const
type Step = (typeof STEPS)[number]

// Fields to validate per step before advancing
const STEP_FIELDS: Record<number, (keyof BookingFormValues)[]> = {
  0: ['durationType', 'startDate', 'endDate'],
  1: ['pickupMethod', 'deliveryAddress', 'returnMethod'],
  2: ['depositChoice'],
  3: [],
  4: ['paymentMethod'],
}

const STEP_LABELS: Record<Step, string> = {
  duration: 'Duration',
  delivery: 'Delivery',
  deposit: 'Deposit',
  identity: 'Identity',
  payment: 'Payment',
}

export interface Vehicle {
  id: string
  slug: string
  name: string
  daily_rate: number | null
  weekly_rate: number | null
  monthly_rate: number | null
  deposit_amount: number | null
  primary_image_url: string | null
  is_available: boolean
}

interface BookingWizardProps {
  vehicle: Vehicle
  bookedRanges: Array<{ from: Date; to: Date }>
}

export function BookingWizard({ vehicle, bookedRanges }: BookingWizardProps) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      durationType: 'daily',
      depositChoice: 'deposit',
      pickupMethod: 'self_pickup',
      returnMethod: 'self_dropoff',
      paymentMethod: 'card',
    },
  })

  const advance = () => {
    startTransition(async () => {
      const fields = STEP_FIELDS[step] ?? []
      const valid = await form.trigger(fields)
      if (valid) {
        setStep((s) => Math.min(s + 1, STEPS.length - 1))
      }
    })
  }

  const back = () => {
    setStep((s) => Math.max(s - 1, 0))
  }

  const currentStep = STEPS[step]

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left column: step content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Step indicator */}
        <nav aria-label="Booking steps">
          <ol className="flex items-center">
            {STEPS.map((s, i) => {
              const isCompleted = i < step
              const isCurrent = i === step
              const isLast = i === STEPS.length - 1
              return (
                <li key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    {/* Circle */}
                    <div
                      className={[
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                        isCompleted
                          ? 'bg-brand-cyan text-black'
                          : isCurrent
                          ? 'bg-brand-cyan/20 border-2 border-brand-cyan text-brand-cyan'
                          : 'bg-brand-surface border border-brand-border text-brand-muted',
                      ].join(' ')}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={[
                        'text-xs hidden sm:block',
                        isCurrent ? 'text-brand-cyan' : isCompleted ? 'text-white' : 'text-brand-muted',
                      ].join(' ')}
                    >
                      {STEP_LABELS[s]}
                    </span>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={[
                        'h-px flex-1 mx-2 mt-[-1rem] sm:mt-[-1.5rem] transition-colors',
                        isCompleted ? 'bg-brand-cyan' : 'bg-brand-border',
                      ].join(' ')}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Step content */}
        <div className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6">
          {currentStep === 'duration' && (
            <StepDuration form={form} vehicle={vehicle} bookedRanges={bookedRanges} />
          )}
          {currentStep === 'delivery' && (
            <StepDelivery form={form} />
          )}
          {currentStep === 'deposit' && (
            <StepDepositChoice form={form} vehicle={vehicle} />
          )}
          {currentStep === 'identity' && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                </svg>
              </div>
              <h3 className="font-display text-xl text-white">Identity Verification</h3>
              <p className="text-brand-muted text-sm max-w-sm mx-auto">
                Identity verification will be available shortly. You will need to provide your passport and driving licence to complete your booking.
              </p>
              <p className="text-xs text-brand-muted/60">Coming soon — Plan 03</p>
            </div>
          )}
          {currentStep === 'payment' && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <h3 className="font-display text-xl text-white">Payment</h3>
              <p className="text-brand-muted text-sm max-w-sm mx-auto">
                Secure payment via card, Apple Pay, and Google Pay will be available shortly. Your booking details are saved.
              </p>
              <p className="text-xs text-brand-muted/60">Coming soon — Plan 04</p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="px-6 py-2.5 rounded-[--radius-card] border border-brand-border text-sm font-medium text-brand-muted hover:text-white hover:border-white/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={advance}
              disabled={isPending}
              className="px-8 py-2.5 rounded-[--radius-card] bg-brand-cyan text-black text-sm font-semibold hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Checking...' : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-8 py-2.5 rounded-[--radius-card] bg-brand-cyan/30 text-brand-muted text-sm font-semibold cursor-not-allowed"
            >
              Submit Booking
            </button>
          )}
        </div>
      </div>

      {/* Right column: price summary (desktop sticky sidebar) */}
      <div className="w-full lg:w-80 lg:sticky lg:top-8">
        <PriceSummary vehicle={vehicle} form={form} />
      </div>
    </div>
  )
}
