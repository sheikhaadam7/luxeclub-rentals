'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bookingSchema, type BookingFormValues } from '@/lib/validations/booking'
import { StepDuration } from '@/components/booking/StepDuration'
import { StepDelivery } from '@/components/booking/StepDelivery'
import { StepDepositChoice } from '@/components/booking/StepDepositChoice'
import { StepIdentity } from '@/components/booking/StepIdentity'
import { StepPayment } from '@/components/booking/StepPayment'
import { PriceSummary } from '@/components/booking/PriceSummary'
import { createBooking } from '@/app/actions/bookings'

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
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Booking state — set when advancing from identity to payment
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [rentalClientSecret, setRentalClientSecret] = useState<string | null>(null)
  const [depositClientSecret, setDepositClientSecret] = useState<string | null>(null)
  const [bookingTotalDue, setBookingTotalDue] = useState<number>(0)
  const [bookingDepositAmount, setBookingDepositAmount] = useState<number>(0)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)

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

  /**
   * Advances from Step 3 (identity) to Step 4 (payment).
   * Creates the booking server-side with revalidated pricing before showing payment.
   */
  async function advanceToPayment() {
    if (bookingId) {
      // Booking already created (e.g. user went back) — go directly to payment
      setStep(4)
      return
    }

    setIsCreatingBooking(true)
    setBookingError(null)

    const formValues = form.getValues()
    const result = await createBooking(formValues, vehicle.id)

    if ('error' in result) {
      setBookingError(result.error)
      setIsCreatingBooking(false)
      return
    }

    setBookingId(result.bookingId)
    setRentalClientSecret(result.rentalClientSecret)
    setDepositClientSecret(result.depositClientSecret)
    setBookingTotalDue(result.totalDue)
    setBookingDepositAmount(result.depositAmount)
    setIsCreatingBooking(false)
    setStep(4)
  }

  const back = () => {
    if (step === 4 && bookingId) {
      // Booking already created — going back shows a notice, not an empty payment step
      setStep(3)
      return
    }
    setStep((s) => Math.max(s - 1, 0))
  }

  /**
   * Called by StepPayment on successful payment.
   * Redirects to booking confirmation page.
   */
  function handlePaymentSuccess(confirmedBookingId: string) {
    router.push(`/bookings/${confirmedBookingId}`)
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
            <>
              {/* Back-from-payment notice when booking already created */}
              {bookingId && (
                <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-200">
                  Your booking has already been created. Complete payment to confirm your rental.
                </div>
              )}
              <StepIdentity
                vehicleSlug={vehicle.slug}
                onNext={advanceToPayment}
              />
            </>
          )}
          {currentStep === 'payment' && (
            <StepPayment
              clientSecret={rentalClientSecret}
              depositClientSecret={depositClientSecret}
              cashSelected={form.getValues('paymentMethod') === 'cash'}
              onSuccess={handlePaymentSuccess}
              bookingId={bookingId ?? ''}
              totalDue={bookingTotalDue}
              depositAmount={bookingDepositAmount}
            />
          )}
        </div>

        {/* Booking creation error */}
        {bookingError && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {bookingError}
          </div>
        )}

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

          {/* On the identity step, the StepIdentity component handles advancement via onNext */}
          {/* On the payment step, StepPayment handles its own submission */}
          {step < STEPS.length - 1 && currentStep !== 'identity' && (
            <button
              type="button"
              onClick={advance}
              disabled={isPending || isCreatingBooking}
              className="px-8 py-2.5 rounded-[--radius-card] bg-brand-cyan text-black text-sm font-semibold hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isCreatingBooking ? 'Please wait...' : 'Continue'}
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
