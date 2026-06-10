'use client'

import { useState, useTransition, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n/context'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import dynamic from 'next/dynamic'
import { bookingSchema, type BookingFormValues } from '@/lib/validations/booking'
import { StepDuration } from '@/components/booking/StepDuration'
import { StepProtection } from '@/components/booking/StepProtection'
import { StepAddons } from '@/components/booking/StepAddons'
import { BookingTotalHeader, useBookingBreakdown, formatAED } from '@/components/booking/BookingTotalHeader'
import { BookingOverview } from '@/components/booking/BookingOverview'
import { PriceDetailsModal } from '@/components/booking/PriceDetailsModal'
import { StepPaymentMethod } from '@/components/booking/StepPaymentMethod'
import { StepAuth } from '@/components/booking/StepAuth'
import { StepGuestContact } from '@/components/booking/StepGuestContact'
import { createBooking, updateBookingPaymentMethod } from '@/app/actions/bookings'

const StepDelivery = dynamic(() => import('./StepDelivery').then(m => ({ default: m.StepDelivery })), { ssr: false })
const StepPayment = dynamic(() => import('./StepPayment').then(m => ({ default: m.StepPayment })), { ssr: false })

const AUTHED_STEPS = ['duration', 'protection', 'addons', 'delivery', 'paymentMethod', 'payment'] as const
const UNAUTHED_STEPS = ['duration', 'protection', 'addons', 'delivery', 'paymentMethod', 'contact', 'payment'] as const

type Step =
  | 'duration'
  | 'protection'
  | 'addons'
  | 'delivery'
  | 'paymentMethod'
  | 'account'
  | 'contact'
  | 'payment'

// Fields to validate per step name before advancing
const STEP_FIELDS: Partial<Record<Step, (keyof BookingFormValues)[]>> = {
  duration: ['durationType', 'startDate', 'endDate', 'driverAge'],
  protection: ['protectionPackage'],
  addons: ['depositChoice'],
  delivery: ['pickupMethod', 'deliveryLocation'],
  contact: ['guestName', 'guestEmail', 'guestPhone'],
  paymentMethod: ['paymentMethod'],
  payment: [],
}

const STEP_LABEL_KEYS: Record<Step, string> = {
  duration: 'booking.stepDuration',
  protection: 'booking.stepProtection',
  addons: 'booking.stepAddons',
  delivery: 'booking.stepReview',
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
  const [bookingReservationFee, setBookingReservationFee] = useState<number>(0)
  const [bookingBalanceDueOnPickup, setBookingBalanceDueOnPickup] = useState<number>(0)
  const [bookingDepositAmount, setBookingDepositAmount] = useState<number>(0)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)
  const [mobilePriceOpen, setMobilePriceOpen] = useState(false)

  const steps = useMemo<readonly Step[]>(
    () => (isAuthed ? AUTHED_STEPS : UNAUTHED_STEPS),
    [isAuthed]
  )

  const currentStep = steps[step]

  const wizardRef = useRef<HTMLDivElement>(null)

  const scrollToTop = () => {
    setTimeout(() => {
      wizardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 50)
  }

  // On initial mount, scroll the wizard into view so the user lands on the step
  // indicator + first card, not above the page-level "Back to X / BOOKING / car name" block.
  useEffect(() => {
    setTimeout(() => {
      wizardRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
    }, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      durationType: 'daily',
      driverAge: '30+',
      startTime: '09:30',
      endTime: '09:30',
      protectionPackage: 'basic',
      addons: {
        additionalDriver: false,
        personalDriver: false,
        babySeat: false,
        childSeat: false,
      },
      depositChoice: 'deposit',
      pickupMethod: 'self_pickup',
      returnMethod: 'self_dropoff',
      paymentMethod: 'card',
    },
  })

  const breakdown = useBookingBreakdown(form, vehicle)

  // Save / resume booking via sessionStorage, scoped per vehicle slug
  const storageKey = `luxeclub-booking-${vehicle.slug}`
  // Restore on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      if (!raw) return
      const saved = JSON.parse(raw) as { values?: Partial<BookingFormValues>; step?: number }
      if (saved.values) {
        // Re-hydrate Date objects
        const v = { ...saved.values }
        if (typeof v.startDate === 'string') v.startDate = new Date(v.startDate)
        if (typeof v.endDate === 'string') v.endDate = new Date(v.endDate)
        form.reset({ ...form.getValues(), ...v })
      }
      if (typeof saved.step === 'number') setStep(saved.step)
    } catch {
      // ignore corrupted storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])
  // Persist on every change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sub = form.watch((values) => {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify({ values, step }))
      } catch {
        // ignore quota errors
      }
    })
    return () => sub.unsubscribe()
  }, [form, step, storageKey])

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
      setBookingReservationFee(result.reservationFee)
      setBookingBalanceDueOnPickup(result.balanceDueOnPickup)
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
    <div ref={wizardRef} className="w-full space-y-6 scroll-mt-20">
      {/* Driver license history notice — only on Protection / Add-ons / Delivery steps */}
      {(currentStep === 'protection' || currentStep === 'addons' || currentStep === 'delivery') && (
        <div className="flex items-center gap-3 rounded-md bg-zinc-100 border border-zinc-200 px-4 py-3">
          <span
            aria-hidden
            className="shrink-0 w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <p className="text-sm text-zinc-800">
            Drivers must have held their driver&apos;s license for at least 1 year(s) for this vehicle
          </p>
        </div>
      )}

      {/* Running total — visible on sm/md; hidden on lg+ where the sticky sidebar shows it */}
      <BookingTotalHeader form={form} vehicle={vehicle} />

      {/* Desktop (lg+) two-column layout: step content left, sticky summary right */}
      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">
      <div className="min-w-0 overflow-visible space-y-6">
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

        {/* Step content — all non-payment steps manage their own white card;
            only the final payment step keeps the dark surface wrapper. */}
        {currentStep !== 'payment' ? (
          <>
            {(() => {
              const lightNavButtons = (
                <div className="hidden sm:flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 0}
                    className="px-4 sm:px-6 py-3 rounded-[var(--radius-card)] border border-black text-[15px] font-bold text-black cursor-pointer hover:bg-black/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t('booking.back')}
                  </button>
                  {currentStep !== 'account' && (
                    <button
                      type="button"
                      onClick={advance}
                      disabled={isPending || isCreatingBooking}
                      className="px-6 sm:px-8 py-3 rounded-[var(--radius-card)] bg-brand-cyan text-black text-sm font-semibold cursor-pointer hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending || isCreatingBooking ? t('booking.pleaseWait') : t('booking.continue')}
                    </button>
                  )}
                </div>
              )
              if (currentStep === 'duration') {
                return (
                  <StepDuration
                    form={form}
                    vehicle={vehicle}
                    bookedRanges={bookedRanges}
                    navButtons={lightNavButtons}
                    onAdvance={advance}
                  />
                )
              }
              if (currentStep === 'protection') {
                return (
                  <StepProtection form={form} vehicle={vehicle} navButtons={lightNavButtons} onBack={back} />
                )
              }
              if (currentStep === 'addons') {
                return (
                  <StepAddons form={form} vehicle={vehicle} navButtons={lightNavButtons} onBack={back} />
                )
              }
              if (currentStep === 'delivery') {
                return (
                  <StepDelivery form={form} navButtons={lightNavButtons} onBack={back} />
                )
              }
              if (currentStep === 'paymentMethod') {
                return (
                  <>
                    {bookingId && (
                      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                        {t('booking.alreadyCreatedNotice')}
                      </div>
                    )}
                    <StepPaymentMethod form={form} navButtons={lightNavButtons} onBack={back} />
                  </>
                )
              }
              if (currentStep === 'account') {
                return (
                  <StepAuth onAuthenticated={handleAuthenticated} navButtons={lightNavButtons} onBack={back} />
                )
              }
              if (currentStep === 'contact') {
                return (
                  <StepGuestContact form={form} navButtons={lightNavButtons} onBack={back} />
                )
              }
              return null
            })()}

            {/* Mobile / tablet booking overview — appears below the step card.
                Hidden on lg+ where the sticky sidebar shows the same content. */}
            {currentStep !== 'duration' && (
              <div className="lg:hidden">
                <BookingOverview form={form} vehicle={vehicle} rentalDays={breakdown.rentalDays} />
              </div>
            )}
          </>
        ) : (
          <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4 sm:p-6">
            <StepPayment
              clientSecret={rentalClientSecret}
              setupClientSecret={setupClientSecret}
              cashSelected={form.getValues('paymentMethod') === 'cash'}
              cryptoSelected={form.getValues('paymentMethod') === 'crypto'}
              applePaySelected={form.getValues('paymentMethod') === 'apple_pay'}
              onSuccess={handlePaymentSuccess}
              bookingId={bookingId ?? ''}
              totalDue={bookingTotalDue}
              reservationFee={bookingReservationFee}
              balanceDueOnPickup={bookingBalanceDueOnPickup}
              depositAmount={bookingDepositAmount}
              isGuest={!isAuthed}
              guestEmail={!isAuthed ? form.getValues('guestEmail') : undefined}
            />
          </div>
        )}

        {/* Booking creation error */}
        {bookingError && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {bookingError}
          </div>
        )}

        {/* Navigation buttons — only rendered outside the step content for the
            payment step (dark surface). Light-card steps render their own
            nav inside the card via lightNavButtons. */}
        {currentStep === 'payment' && (
          <div className="hidden sm:flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="px-4 sm:px-6 py-2.5 rounded-[var(--radius-card)] border border-black text-[15px] font-bold text-black cursor-pointer hover:bg-black/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('booking.back')}
            </button>
            {/* The payment step handles its own submission via the Stripe form, so no Continue here. */}
          </div>
        )}
      </div>

      {/* Desktop (lg+) sticky summary — pushed down to sit roughly inline with
          the pickup/return inputs in Step 1 so it sits in the user's eye-line. */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 mt-20 pl-2 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-muted">Total</p>
            <p className="font-display text-4xl font-bold text-white tabular-nums leading-tight">
              AED {formatAED(breakdown.totalDue)}
            </p>
            <button
              type="button"
              onClick={() => setMobilePriceOpen(true)}
              className="text-sm text-brand-cyan underline underline-offset-4 hover:text-brand-cyan-hover transition-colors mt-1 cursor-pointer"
            >
              Price details
            </button>
          </div>

          {currentStep !== 'duration' && (
            <BookingOverview form={form} vehicle={vehicle} rentalDays={breakdown.rentalDays} />
          )}
        </div>
      </aside>
      </div>

      {/* Mobile-only fixed bottom bar: running total + price details + Continue */}
      <div
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-surface/95 backdrop-blur border-t border-brand-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 min-h-[88px]">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            aria-label={t('booking.back')}
            className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full border border-black text-black disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-wider text-brand-muted">Total</span>
            <span className="text-2xl font-bold text-white tabular-nums leading-tight">
              AED {formatAED(breakdown.totalDue)}
            </span>
            <button
              type="button"
              onClick={() => setMobilePriceOpen(true)}
              className="text-xs text-brand-cyan underline underline-offset-4 mt-0.5 self-start"
            >
              Price details
            </button>
          </div>
          {currentStep !== 'payment' && currentStep !== 'account' && (
            <button
              type="button"
              onClick={advance}
              disabled={isPending || isCreatingBooking}
              className="shrink-0 px-6 py-3 rounded-[var(--radius-card)] bg-brand-cyan text-black text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isCreatingBooking ? t('booking.pleaseWait') : t('booking.continue')}
            </button>
          )}
        </div>
      </div>

      <PriceDetailsModal
        open={mobilePriceOpen}
        onClose={() => setMobilePriceOpen(false)}
        breakdown={breakdown}
      />
    </div>
  )
}
