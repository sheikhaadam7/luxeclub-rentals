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
import { BookingTotalHeader, useBookingBreakdown } from '@/components/booking/BookingTotalHeader'
import { BookingOverview } from '@/components/booking/BookingOverview'
import { PriceDetailsModal } from '@/components/booking/PriceDetailsModal'
import { StepPaymentMethod } from '@/components/booking/StepPaymentMethod'
import { StepAuth } from '@/components/booking/StepAuth'
import { createBooking, updateBookingPaymentMethod } from '@/app/actions/bookings'
import { useCurrency } from '@/lib/currency/context'

const StepDelivery = dynamic(() => import('./StepDelivery').then(m => ({ default: m.StepDelivery })), { ssr: false })
const StepPayment = dynamic(() => import('./StepPayment').then(m => ({ default: m.StepPayment })), { ssr: false })

const AUTHED_STEPS = ['duration', 'protection', 'addons', 'delivery', 'paymentMethod', 'payment'] as const
const UNAUTHED_STEPS = ['duration', 'protection', 'addons', 'delivery', 'paymentMethod', 'payment'] as const

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
  /** Names of any guest-contact fields that were empty when Continue was clicked. */
  const [missingFields, setMissingFields] = useState<string[]>([])
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
      // Intentionally no default for protectionPackage — the customer must
      // make an explicit choice on Step 2. Continue stays disabled until
      // they select one.
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
  const { formatPrice } = useCurrency()

  // Per-step "is the user allowed to advance yet?" check. We keep this in the
  // wizard so the shared Continue button can stay disabled until the current
  // step's required-input is filled. Today it only gates Step 2 (Protection
  // package must be explicitly picked).
  const protectionPackageWatched = form.watch('protectionPackage')
  const currentStepReady =
    currentStep === 'protection' ? !!protectionPackageWatched : true

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
      // Bounds-check the saved step against the current steps array length.
      // Without this, a session saved with step=5 from a previous version
      // (when UNAUTHED_STEPS still had 'contact') could land the customer on
      // the payment screen with no booking ID.
      if (typeof saved.step === 'number') {
        const stepCount = (isAuthed ? AUTHED_STEPS.length : UNAUTHED_STEPS.length)
        if (saved.step >= 0 && saved.step < stepCount) {
          setStep(saved.step)
        } else {
          setStep(0)
        }
      }
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
      // Booking already created (e.g. user went back). Two cases:
      // (a) Same Stripe Intent type as before (Card ↔ Apple Pay both use a
      //     PaymentIntent) — just sync the payment_method column.
      // (b) Different Intent type required (Cash ↔ Card; Cash uses SetupIntent,
      //     Card uses PaymentIntent) — the old client secret no longer matches
      //     the new method, so we have to wipe the booking state and fall
      //     through to fresh creation below.
      const currentMethod = form.getValues('paymentMethod')
      const needsRentalIntent =
        currentMethod === 'card' ||
        currentMethod === 'apple_pay' ||
        currentMethod === 'google_pay'
      const needsSetupIntent = currentMethod === 'cash'
      const intentMismatch =
        (needsRentalIntent && !rentalClientSecret) ||
        (needsSetupIntent && !setupClientSecret)

      if (intentMismatch) {
        // Reset booking state — the old draft row in the DB is orphaned but
        // harmless; a cleanup job can prune it later.
        setBookingId(null)
        setRentalClientSecret(null)
        setSetupClientSecret(null)
        setBookingTotalDue(0)
        setBookingReservationFee(0)
        setBookingBalanceDueOnPickup(0)
        setBookingDepositAmount(0)
        setBookingError(null)
        // Fall through to fresh creation below — DO NOT return.
      } else {
        // Same Intent type — fast path: just sync the method.
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
  }, [bookingId, form, isAuthed, steps, vehicle.id, t, rentalClientSecret, setupClientSecret])

  const advance = () => {
    startTransition(async () => {
      const fields = STEP_FIELDS[currentStep] ?? []
      const valid = await form.trigger(fields)
      if (!valid) return

      // Step 4: enforce the Renter Information contact fields for guests.
      // Step 6 ('contact') is gone, so Step 4 is the last place to validate.
      if (currentStep === 'delivery' && !isAuthed) {
        const v = form.getValues()
        const missing: string[] = []
        if (!v.guestFirstName || v.guestFirstName.trim() === '') {
          form.setError('guestFirstName', { type: 'required', message: 'First name is required' })
          missing.push('First name')
        }
        if (!v.guestSurname || v.guestSurname.trim() === '') {
          form.setError('guestSurname', { type: 'required', message: 'Surname is required' })
          missing.push('Surname')
        }
        // Email — empty OR missing @ symbol
        const email = (v.guestEmail ?? '').trim()
        if (!email) {
          form.setError('guestEmail', { type: 'required', message: 'Email is required' })
          missing.push('Email')
        } else if (!email.includes('@') || !email.includes('.') || email.length < 5) {
          form.setError('guestEmail', { type: 'pattern', message: 'Please enter a valid email address' })
          missing.push('Valid email address')
        }
        // Phone — already stripped to digits by the controlled input.
        // Empty OR fewer than 7 digits both count as invalid.
        const phone = (v.guestPhone ?? '').trim()
        if (!phone) {
          form.setError('guestPhone', { type: 'required', message: 'Phone number is required' })
          missing.push('Phone number')
        } else if (phone.length < 7) {
          form.setError('guestPhone', { type: 'minLength', message: 'Phone number is too short' })
          missing.push('Valid phone number')
        }
        if (missing.length > 0) {
          setMissingFields(missing)
          return
        }
      }

      // The step before payment triggers booking creation.
      // Used to be authed-only because guests had a 'contact' step that did it.
      // After removing 'contact', both authed and guest users create the booking here.
      if (currentStep === 'paymentMethod') {
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
    const paymentMethodIndex = steps.indexOf('paymentMethod')
    if (step === paymentIndex && bookingId) {
      // Step 6 → Step 5: booking already exists. Keep it; customer might
      // only want to change payment method, which is just a sync.
      setStep(paymentIndex - 1)
      scrollToTop()
      return
    }
    // Step 5 → Step 4 or earlier: customer wants to edit something upstream
    // (dates, add-ons, delivery zone, contact). The existing booking row no
    // longer reflects what they're choosing, so reset the booking state and
    // let the next advance create a fresh row with current form values.
    if (step === paymentMethodIndex && bookingId) {
      setBookingId(null)
      setRentalClientSecret(null)
      setSetupClientSecret(null)
      setBookingTotalDue(0)
      setBookingReservationFee(0)
      setBookingBalanceDueOnPickup(0)
      setBookingDepositAmount(0)
      setBookingError(null)
    }
    setStep((s) => Math.max(s - 1, 0))
    scrollToTop()
  }

  /**
   * Called by StepAuth (the legacy 'account' step path) when the user
   * authenticates. Updates auth state and auto-advances to payment.
   */
  function handleAuthenticated() {
    setIsAuthed(true)
    // After auth, advance to payment (creates booking)
    advanceToPayment()
  }

  /**
   * Called by the Step 4 SignInModal. Flips isAuthed without advancing —
   * the customer signed in to skip re-typing their details, not to skip ahead.
   * Step 4 stays on screen so the auto-fill effect can pre-populate fields.
   */
  function handleAuthenticatedStay() {
    setIsAuthed(true)
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
    const guestFullName = (form.getValues('guestName') || '').trim()
    const guestEmail = form.getValues('guestEmail') || ''
    return (
      <div className="max-w-3xl mx-auto space-y-8 text-center py-12 px-4">
        {/* Green tick circle */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 mx-auto shadow-lg">
          <svg className="h-12 w-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Great choice greeting */}
        <p className="text-2xl sm:text-3xl text-white font-normal">
          {guestFullName ? `Great choice, ${guestFullName}` : 'Great choice'}
        </p>

        {/* Big headline */}
        <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold uppercase text-white tracking-tight leading-[1.05]">
          Your Reservation Is Confirmed
        </h2>

        {/* Confirmation email line */}
        <p className="text-xl sm:text-2xl text-white leading-relaxed pt-2">
          We&apos;ve sent a confirmation email to{' '}
          <span className="underline underline-offset-4 decoration-2">{guestEmail}</span>
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
                    className="px-4 sm:px-6 py-3 rounded-[var(--radius-card)] bg-black text-[15px] font-bold text-white cursor-pointer hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t('booking.back')}
                  </button>
                  {currentStep !== 'account' && (
                    <button
                      type="button"
                      onClick={advance}
                      disabled={isPending || isCreatingBooking || !currentStepReady}
                      className="px-6 sm:px-8 py-3 rounded-[var(--radius-card)] bg-black text-white text-sm font-semibold cursor-pointer hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <StepDelivery
                    form={form}
                    navButtons={lightNavButtons}
                    onBack={back}
                    isAuthed={isAuthed}
                    onAuthenticated={handleAuthenticatedStay}
                  />
                )
              }
              if (currentStep === 'paymentMethod') {
                return (
                  <StepPaymentMethod form={form} navButtons={lightNavButtons} onBack={back} />
                )
              }
              if (currentStep === 'account') {
                return (
                  <StepAuth onAuthenticated={handleAuthenticated} navButtons={lightNavButtons} onBack={back} />
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
          <div className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6">
            {/* Top-left back chevron — same pattern as steps 2-6, but shown
                on every viewport here since the payment card has no in-flow
                Back button at the bottom. */}
            <div>
              <button
                type="button"
                onClick={back}
                aria-label="Back to previous step"
                className="-mt-2 -ml-2 mb-1 inline-flex items-center gap-1 h-10 pl-2 pr-3 text-[15px] font-bold text-black active:bg-black/10 hover:bg-black/5 rounded-full cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
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
              depositChoice={form.getValues('depositChoice') ?? 'deposit'}
              breakdown={breakdown}
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

        {/* Payment step has its own back chevron at the top-left of the white
            card now — no extra Back button rendered below. */}
      </div>

      {/* Desktop (lg+) sticky summary — pushed down to sit roughly inline with
          the pickup/return inputs in Step 1 so it sits in the user's eye-line. */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 mt-20 pl-2 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-muted">Total</p>
            <p className="font-display text-4xl font-bold text-white tabular-nums leading-tight">
              {formatPrice(breakdown.totalDue, { exact: true })}
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
            className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-black text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-wider text-brand-muted">Total</span>
            <span className="text-2xl font-bold text-white tabular-nums leading-tight">
              {formatPrice(breakdown.totalDue, { exact: true })}
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
              disabled={isPending || isCreatingBooking || !currentStepReady}
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

      {/* Missing-fields warning popup — guests trying to leave Step 4 with
          empty contact fields. Lists exactly which fields they still need
          to fill in so the message isn't generic. */}
      {missingFields.length > 0 && (
        <div role="dialog" aria-modal="true" aria-labelledby="missing-fields-title" className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close warning"
            onClick={() => setMissingFields([])}
            className="absolute inset-0 bg-black/60 cursor-default"
          />
          <div className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-zinc-200 p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <h3 id="missing-fields-title" className="text-2xl font-bold text-zinc-900 leading-tight">
                  Please complete your details
                </h3>
                <p className="text-base text-zinc-700 mt-2">
                  Before we can continue, please fill in:
                </p>
                <ul className="mt-3 space-y-2">
                  {missingFields.map((name) => (
                    <li key={name} className="flex items-center gap-2.5 text-base text-zinc-900 font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMissingFields([])}
              className="mt-7 w-full px-6 py-3.5 rounded-[var(--radius-card)] bg-brand-cyan text-black text-base font-bold cursor-pointer hover:bg-brand-cyan-hover transition-colors"
            >
              OK, got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
