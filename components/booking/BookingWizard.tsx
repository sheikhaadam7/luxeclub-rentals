'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n/context'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import dynamic from 'next/dynamic'
import { bookingSchema, type BookingFormValues } from '@/lib/validations/booking'
import { StepDuration } from '@/components/booking/StepDuration'
import { StepDepositChoice } from '@/components/booking/StepDepositChoice'
import { StepPaymentMethod } from '@/components/booking/StepPaymentMethod'
import { StepAuth } from '@/components/booking/StepAuth'
import { StepGuestContact } from '@/components/booking/StepGuestContact'
import { PriceSummary } from '@/components/booking/PriceSummary'
import { createBooking, updateBookingPaymentMethod } from '@/app/actions/bookings'

const StepDelivery = dynamic(() => import('./StepDelivery').then(m => ({ default: m.StepDelivery })), { ssr: false })
const StepPayment = dynamic(() => import('./StepPayment').then(m => ({ default: m.StepPayment })), { ssr: false })

const AUTHED_STEPS = ['duration', 'delivery', 'deposit', 'paymentMethod', 'payment'] as const
const UNAUTHED_STEPS = ['duration', 'delivery', 'deposit', 'paymentMethod', 'contact', 'payment'] as const

type Step = 'duration' | 'delivery' | 'deposit' | 'paymentMethod' | 'account' | 'contact' | 'payment'

// Fields to validate per step name before advancing
const STEP_FIELDS: Partial<Record<Step, (keyof BookingFormValues)[]>> = {
  duration: ['durationType', 'startDate', 'endDate'],
  delivery: ['pickupMethod', 'deliveryAddress', 'returnMethod', 'collectionAddress'],
  deposit: ['depositChoice'],
  contact: ['guestName', 'guestEmail', 'guestPhone'],
  paymentMethod: ['paymentMethod'],
  payment: [],
}

const STEP_LABEL_KEYS: Record<Step, string> = {
  duration: 'booking.stepDuration',
  delivery: 'booking.stepDelivery',
  deposit: 'booking.stepDeposit',
  paymentMethod: 'booking.stepPayMethod',
  account: 'booking.stepAccount',
  contact: 'booking.stepContact',
  payment: 'booking.stepPayment',
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
  isAuthenticated?: boolean
}

export function BookingWizard({ vehicle, bookedRanges, isAuthenticated: initialAuth = false }: BookingWizardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [isAuthed, setIsAuthed] = useState(initialAuth)

  // Booking state — set when advancing from deposit to payment
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [rentalClientSecret, setRentalClientSecret] = useState<string | null>(null)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [bookingTotalDue, setBookingTotalDue] = useState<number>(0)
  const [bookingDepositAmount, setBookingDepositAmount] = useState<number>(0)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)

  const steps = useMemo<readonly Step[]>(
    () => (isAuthed ? AUTHED_STEPS : UNAUTHED_STEPS),
    [isAuthed]
  )

  const currentStep = steps[step]

  const scrollToTop = () => {
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

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

  /**
   * Creates the booking server-side with revalidated pricing before showing payment.
   * Called when advancing to the payment step.
   */
  const advanceToPayment = useCallback(async () => {
    const paymentIndex = steps.indexOf('payment')

    if (bookingId) {
      // Booking already created (e.g. user went back) — sync payment method then go to payment
      const currentMethod = form.getValues('paymentMethod')
      setIsCreatingBooking(true)
      setBookingError(null)
      try {
        const syncResult = await updateBookingPaymentMethod(bookingId, currentMethod)
        if ('error' in syncResult) {
          setBookingError(syncResult.error)
          setIsCreatingBooking(false)
          return
        }
      } catch {
        setBookingError(t('booking.somethingWentWrong'))
        setIsCreatingBooking(false)
        return
      }
      setIsCreatingBooking(false)
      setStep(paymentIndex)
      scrollToTop()
      return
    }

    setIsCreatingBooking(true)
    setBookingError(null)

    try {
      const formValues = form.getValues()
      const guestInfo = !isAuthed && formValues.guestName
        ? { name: formValues.guestName, email: formValues.guestEmail!, phone: formValues.guestPhone! }
        : undefined
      const result = await createBooking(formValues, vehicle.id, guestInfo)

      if ('error' in result) {
        setBookingError(result.error)
        return
      }

      setBookingId(result.bookingId)
      setRentalClientSecret(result.rentalClientSecret)
      setSetupClientSecret(result.setupClientSecret)
      setBookingTotalDue(result.totalDue)
      setBookingDepositAmount(result.depositAmount)
      setStep(paymentIndex)
      scrollToTop()
    } catch {
      setBookingError(t('booking.somethingWentWrong'))
    } finally {
      setIsCreatingBooking(false)
    }
  }, [bookingId, form, isAuthed, steps, vehicle.id, t])

  const advance = () => {
    startTransition(async () => {
      const fields = STEP_FIELDS[currentStep] ?? []
      const valid = await form.trigger(fields)
      if (!valid) return

      // The step before payment triggers booking creation
      if (currentStep === 'paymentMethod' && isAuthed) {
        await advanceToPayment()
        return
      }

      // Guest contact step → create booking then advance to payment
      if (currentStep === 'contact') {
        await advanceToPayment()
        return
      }

      // Otherwise just advance to the next step
      setStep((s) => Math.min(s + 1, steps.length - 1))
      scrollToTop()
    })
  }

  const back = () => {
    const paymentIndex = steps.indexOf('payment')
    if (step === paymentIndex && bookingId) {
      // Booking already created — going back shows a notice on the previous step
      setStep(paymentIndex - 1)
      scrollToTop()
      return
    }
    setStep((s) => Math.max(s - 1, 0))
    scrollToTop()
  }

  /**
   * Called by StepAuth when the user successfully authenticates.
   * Updates auth state and auto-advances to payment.
   */
  function handleAuthenticated() {
    setIsAuthed(true)
    // After auth, advance to payment (creates booking)
    advanceToPayment()
  }

  // Inline confirmation state for guest bookings
  const [guestConfirmedId, setGuestConfirmedId] = useState<string | null>(null)

  /**
   * Called by StepPayment on successful payment.
   * Authenticated users: redirect to booking detail page.
   * Guests: show inline confirmation (no protected route to redirect to).
   */
  function handlePaymentSuccess(confirmedBookingId: string) {
    if (isAuthed) {
      router.push(`/bookings/${confirmedBookingId}`)
    } else {
      setGuestConfirmedId(confirmedBookingId)
    }
  }

  // Guest inline confirmation
  if (guestConfirmedId) {
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-cyan/10 border border-brand-cyan/30 mx-auto">
          <svg className="h-8 w-8 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">
          {t('booking.bookingConfirmed')}
        </h2>
        <p className="text-sm text-brand-muted leading-relaxed">
          {t('booking.bookingRefIs')}{' '}
          <span className="text-white font-semibold font-mono">
            {guestConfirmedId.slice(0, 8).toUpperCase()}
          </span>
          . {t('booking.confirmationSentTo')}{' '}
          <span className="text-white font-semibold">{form.getValues('guestEmail')}</span>.
        </p>
        <p className="text-xs text-brand-muted">
          {t('booking.saveBookingRef')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left column: step content */}
      <div className="flex-1 min-w-0 overflow-hidden space-y-6">
        {/* Step indicator */}
        <nav aria-label="Booking steps">
          <ol className="flex">
            {steps.map((s, i) => {
              const isCompleted = i < step
              const isCurrent = i === step
              const isLast = i === steps.length - 1
              return (
                <li key={s} className="flex-1 last:flex-none">
                  {/* Circle + connector row */}
                  <div className="flex items-center">
                    <div
                      className={[
                        'w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all',
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-brand-cyan/20 border-2 border-brand-cyan text-brand-cyan'
                          : 'bg-brand-surface border border-brand-border text-brand-muted',
                      ].join(' ')}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={[
                          'h-px flex-1 mx-1 sm:mx-2 transition-colors',
                          isCompleted ? 'bg-white/80' : 'bg-brand-border',
                        ].join(' ')}
                      />
                    )}
                  </div>
                  {/* Label below circle */}
                  <span
                    className={[
                      'text-xs hidden sm:block mt-1',
                      isCurrent ? 'text-brand-cyan' : isCompleted ? 'text-emerald-400' : 'text-brand-muted',
                    ].join(' ')}
                  >
                    {t(STEP_LABEL_KEYS[s])}
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Step content */}
        <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4 sm:p-6">
          {currentStep === 'duration' && (
            <StepDuration form={form} vehicle={vehicle} bookedRanges={bookedRanges} />
          )}
          {currentStep === 'delivery' && (
            <StepDelivery form={form} />
          )}
          {currentStep === 'deposit' && (
            <>
              {/* Notice when booking already created and user went back */}
              {bookingId && (
                <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-200">
                  {t('booking.alreadyCreatedNotice')}
                </div>
              )}

              <StepDepositChoice form={form} vehicle={vehicle} />
            </>
          )}
          {currentStep === 'paymentMethod' && (
            <>
              {bookingId && (
                <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-200">
                  {t('booking.alreadyCreatedNotice')}
                </div>
              )}
              <StepPaymentMethod form={form} />
            </>
          )}
          {currentStep === 'account' && (
            <StepAuth onAuthenticated={handleAuthenticated} />
          )}
          {currentStep === 'contact' && (
            <StepGuestContact form={form} />
          )}
          {currentStep === 'payment' && (
            <StepPayment
              clientSecret={rentalClientSecret}
              setupClientSecret={setupClientSecret}
              cashSelected={form.getValues('paymentMethod') === 'cash'}
              cryptoSelected={form.getValues('paymentMethod') === 'crypto'}
              onSuccess={handlePaymentSuccess}
              bookingId={bookingId ?? ''}
              totalDue={bookingTotalDue}
              depositAmount={bookingDepositAmount}
              isGuest={!isAuthed}
              guestEmail={!isAuthed ? form.getValues('guestEmail') : undefined}
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
            className="px-4 sm:px-6 py-2.5 rounded-[var(--radius-card)] border border-brand-border text-sm font-medium text-brand-muted hover:text-white hover:border-white/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('booking.back')}
          </button>

          {/* On the payment step and account step, their own components handle submission */}
          {currentStep !== 'payment' && currentStep !== 'account' && (
            <button
              type="button"
              onClick={advance}
              disabled={isPending || isCreatingBooking}
              className="px-6 sm:px-8 py-2.5 rounded-[var(--radius-card)] bg-brand-cyan text-black text-sm font-semibold hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isCreatingBooking ? t('booking.pleaseWait') : t('booking.continue')}
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
