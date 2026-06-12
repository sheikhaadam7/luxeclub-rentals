'use client'

import { useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useCurrency } from '@/lib/currency/context'
import { useTranslation } from '@/lib/i18n/context'
import { createCryptoInvoice } from '@/app/actions/crypto-payment'
import { PriceDetailsModal } from '@/components/booking/PriceDetailsModal'
import type { BookingPriceBreakdown } from '@/lib/pricing/calculator'

// Cash holding-deposit amount charged today. Matches RESERVATION_FEE_AED in
// lib/pricing/constants.ts (495 today). If you change one, change the other.
const CASH_HOLDING_DEPOSIT_AED = 495

// Shown on Step 6 only when the customer is viewing a non-AED currency —
// avoids "why does my email say AED 1,800 when I paid £400?" support tickets.
function ChargeCurrencyDisclaimer() {
  const { currency } = useCurrency()
  if (currency === 'AED') return null
  return (
    <p className="text-xs text-zinc-500 italic mt-2">
      Charged in AED. Your bank converts at their daily rate.
    </p>
  )
}

// Dev/test mode: when Stripe key is missing, show a test payment UI
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepPaymentProps {
  clientSecret: string | null
  setupClientSecret?: string | null
  cashSelected: boolean
  cryptoSelected: boolean
  applePaySelected?: boolean
  onSuccess: (bookingId: string) => void
  bookingId: string
  totalDue: number
  /** Flat reservation fee collected now to secure the booking */
  reservationFee: number
  /** Remaining amount owed on pickup day (in person) */
  balanceDueOnPickup: number
  depositAmount: number
  /** Whether the customer kept the default deposit or chose no-deposit add-on.
      Used to hide the "refundable deposit blocked at pickup" notice. */
  depositChoice?: 'deposit' | 'no_deposit'
  /** Full breakdown — opens the PriceDetailsModal when the customer clicks
      the "Price details" link inside Step 6. */
  breakdown?: BookingPriceBreakdown
  isGuest?: boolean
  guestEmail?: string
}

// ---------------------------------------------------------------------------
// Shared inline components — used by both Card (PaymentForm) and Cash
// (CashCardForm) branches so the bottom of Step 6 looks consistent.
// ---------------------------------------------------------------------------

function RentersNameNotice() {
  return (
    <p className="text-sm text-zinc-700 leading-relaxed">
      The payment method must be under the renter&apos;s name and physically presented
      at pickup. See{' '}
      <Link href="/contact" className="underline underline-offset-4 hover:text-zinc-900">
        Rental Information
      </Link>{' '}
      for more details on accepted payment methods.
    </p>
  )
}

function ImportantInfoCollapsible() {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-t border-b border-zinc-200 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-sm font-semibold text-zinc-900 underline underline-offset-4 cursor-pointer"
      >
        Important information about your reservation
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm text-zinc-700 leading-relaxed">
          <p>
            <span className="font-bold">IMPORTANT INFORMATION about your prepaid booking:</span>{' '}
            Prepaid rates are subject to the following cancellation, rebooking,
            and no-show charges. Please note that the charges listed below will
            never exceed the total prepaid amount:
          </p>
          <ul className="list-disc pl-5 space-y-2.5 marker:text-zinc-400">
            <li>
              <span className="font-semibold text-zinc-900">Booking cancellation:</span>{' '}
              An amount of AED 495 will be charged to cancel the booking
              (possible until the agreed pickup time). Any remaining prepaid
              amount over AED 495 will be refunded.
            </li>
            <li>
              <span className="font-semibold text-zinc-900">
                Cancellations or changes made within 24 hours of booking are free,
              </span>{' '}
              as long as your scheduled pickup time is more than 48 hours from now.
            </li>
            <li>
              <span className="font-semibold text-zinc-900">No show:</span>{' '}
              No refund will be issued in case of failure to pick up your vehicle
              (no show) or cancellation after the scheduled pickup time.
            </li>
            <li>
              <span className="font-semibold text-zinc-900">No refund for unused rental days:</span>{' '}
              No refund or credit will be issued for any unused rental days (due
              to late pickup or early return) once the vehicle has been picked up.
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

function TermsAcknowledgement() {
  return (
    <p className="text-sm text-zinc-700 leading-relaxed">
      I have read and accept the{' '}
      <Link href="/contact" className="underline underline-offset-4 hover:text-zinc-900">
        Rental Information
      </Link>
      , the{' '}
      <Link href="/contact" className="underline underline-offset-4 hover:text-zinc-900">
        Terms and Conditions
      </Link>
      , and the{' '}
      <Link href="/privacy" className="underline underline-offset-4 hover:text-zinc-900">
        Privacy Policy
      </Link>
      , and I acknowledge that I am booking a prepaid rate, where the total
      booking price is immediately charged to the payment method I provided.
    </p>
  )
}

interface PaymentSummaryProps {
  /** Big amount shown today (Card: totalDue, Cash: AED 495) */
  payNowAmount: number
  /** Sub-line under the amount. Card: "Amount you will pay". Cash: balance split. */
  amountSubLabel: string
  /** Vehicle security-deposit pickup-hold amount. Hidden if 0 or depositChoice = no_deposit. */
  depositAmount: number
  depositChoice: 'deposit' | 'no_deposit'
  onOpenPriceDetails: () => void
}

function PaymentSummaryAndPolicies({
  payNowAmount,
  amountSubLabel,
  depositAmount,
  depositChoice,
  onOpenPriceDetails,
}: PaymentSummaryProps) {
  const { formatPrice } = useCurrency()
  return (
    <div className="border-t border-zinc-200 pt-5 space-y-4">
      {/* Total row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 tabular-nums leading-tight">
            {formatPrice(payNowAmount, { exact: true })}
          </p>
          <ChargeCurrencyDisclaimer />
          <button
            type="button"
            onClick={onOpenPriceDetails}
            className="text-sm text-zinc-600 mt-1 flex items-center gap-1.5 cursor-pointer hover:text-zinc-900"
            aria-label="Open price details"
          >
            {amountSubLabel}
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 8v0M12 11v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Price details link */}
      <button
        type="button"
        onClick={onOpenPriceDetails}
        className="text-sm font-semibold text-zinc-900 underline underline-offset-4 cursor-pointer hover:text-brand-cyan transition-colors"
      >
        Price details
      </button>

      {/* Refundable security-deposit notice */}
      {depositChoice === 'deposit' && depositAmount > 0 && (
        <p className="text-sm text-zinc-700 leading-relaxed">
          <span className="font-semibold text-zinc-900">Refundable deposit:</span>{' '}
          An additional {formatPrice(depositAmount, { exact: true })} security deposit will be
          blocked on your card at pickup and released within a few business days
          of the vehicle&apos;s return.
        </p>
      )}

      {/* Important information collapsible */}
      <ImportantInfoCollapsible />

      {/* T&C acknowledgement */}
      <TermsAcknowledgement />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inner form (requires Elements context)
// ---------------------------------------------------------------------------

interface PaymentFormProps {
  onSuccess: (bookingId: string) => void
  bookingId: string
  /** Show Apple Pay / Google Pay express row at the top — only when applePaySelected */
  showExpressCheckout: boolean
  totalDue: number
  depositAmount: number
  depositChoice: 'deposit' | 'no_deposit'
  onOpenPriceDetails: () => void
}

function PaymentForm({
  onSuccess,
  bookingId,
  showExpressCheckout,
  totalDue,
  depositAmount,
  depositChoice,
  onOpenPriceDetails,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setErrorMessage(null)

    // Confirm the rental payment first
    const { error: rentalError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/bookings/confirmation',
      },
      redirect: 'if_required',
    })

    if (rentalError) {
      setErrorMessage(rentalError.message ?? t('booking.paymentFailed'))
      setIsProcessing(false)
      return
    }

    setIsProcessing(false)
    onSuccess(bookingId)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Express checkout (Apple Pay / Google Pay) — only when customer picked
          Apple Pay on Step 5. Card-flow customers don't see this. */}
      {showExpressCheckout && (
        <>
          <div>
            <ExpressCheckoutElement
              onConfirm={async () => {
                if (!stripe || !elements) return
                setIsProcessing(true)
                setErrorMessage(null)

                const { error } = await stripe.confirmPayment({
                  elements,
                  confirmParams: {
                    return_url: window.location.origin + '/bookings/confirmation',
                  },
                  redirect: 'if_required',
                })

                if (error) {
                  setErrorMessage(error.message ?? t('booking.paymentFailed'))
                  setIsProcessing(false)
                } else {
                  setIsProcessing(false)
                  onSuccess(bookingId)
                }
              }}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-500 uppercase tracking-widest">
              {t('booking.orPayWithCard')}
            </span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
        </>
      )}

      {/* Card input */}
      <PaymentElement
        options={{
          layout: 'tabs',
          // Disable Stripe Link — the "Secure, fast checkout with Link" prompt
          // adds clutter without benefit for our customer base. Apple Pay /
          // Google Pay are still available via the express checkout row above.
          wallets: { link: 'never' },
        }}
      />

      {/* Renter's name notice — directly below the card field */}
      <RentersNameNotice />

      {/* Summary + policy block */}
      <PaymentSummaryAndPolicies
        payNowAmount={totalDue}
        amountSubLabel="Amount you will pay"
        depositAmount={depositAmount}
        depositChoice={depositChoice}
        onOpenPriceDetails={onOpenPriceDetails}
      />

      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-red-600 text-center">{errorMessage}</p>
      )}

      {/* Submit button — shows the actual amount */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full rounded-[var(--radius-card)] bg-brand-cyan py-3.5 text-base font-bold text-black hover:bg-brand-cyan-hover cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? t('booking.processing') : 'Pay and Book'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Crypto payment component
// ---------------------------------------------------------------------------

interface CryptoPaymentProps {
  bookingId: string
  reservationFee: number
  balanceDueOnPickup: number
  isGuest: boolean
  guestEmail?: string
  onSuccess: (bookingId: string) => void
}

function CryptoPayment({ bookingId, reservationFee, balanceDueOnPickup, isGuest, guestEmail, onSuccess }: CryptoPaymentProps) {
  const { formatPrice } = useCurrency()
  const { t } = useTranslation()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handlePayWithCrypto() {
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const result = await createCryptoInvoice(bookingId, guestEmail)

      if ('error' in result) {
        setErrorMessage(result.error)
        setIsProcessing(false)
        return
      }

      // Open NOWPayments hosted invoice page in a new tab
      // Using window.open avoids breaking the mobile session/back-navigation
      window.open(result.invoiceUrl, '_blank')
      onSuccess(bookingId)
    } catch {
      setErrorMessage(t('booking.somethingWentWrong'))
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-card)] border border-brand-cyan/30 bg-brand-cyan/5 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cyan/10 border border-brand-cyan/30">
            <svg className="h-5 w-5 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-zinc-900">
            {t('booking.cryptoPayment')}
          </h3>
        </div>
        <p className="text-sm text-zinc-700 leading-relaxed">
          {t('booking.cryptoReservationFeeDesc').replace('{amount}', formatPrice(reservationFee))}
        </p>
        {balanceDueOnPickup > 0 && (
          <p className="text-sm text-zinc-700 leading-relaxed">
            {t('booking.balanceDueOnPickupDesc').replace('{amount}', formatPrice(balanceDueOnPickup))}
          </p>
        )}
      </div>

      {/* Forfeit policy */}
      <div className="rounded-[var(--radius-card)] border border-red-300 bg-red-50 p-4 text-sm">
        <p className="font-bold text-red-700 mb-1.5 text-xs uppercase tracking-wider">
          {t('booking.forfeitPolicyTitle')}
        </p>
        <p className="text-red-700/80 leading-relaxed">
          {t('booking.forfeitPolicyBody')}
        </p>
      </div>

      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-red-600 text-center">{errorMessage}</p>
      )}

      <button
        type="button"
        onClick={handlePayWithCrypto}
        disabled={isProcessing}
        className="w-full rounded-[var(--radius-card)] bg-black py-3 text-sm font-semibold text-white hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? t('booking.creatingInvoice') : t('booking.payWithCrypto')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cash card-on-file form (requires Elements context)
// ---------------------------------------------------------------------------

interface CashCardFormProps {
  onSuccess: (bookingId: string) => void
  bookingId: string
  balanceDueOnPickup: number
  depositAmount: number
  depositChoice: 'deposit' | 'no_deposit'
  onOpenPriceDetails: () => void
}

function CashCardForm({
  onSuccess,
  bookingId,
  balanceDueOnPickup,
  depositAmount,
  depositChoice,
  onOpenPriceDetails,
}: CashCardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation()
  const { formatPrice } = useCurrency()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cardSaved, setCardSaved] = useState(false)

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setErrorMessage(null)

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/bookings/confirmation',
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrorMessage(error.message ?? t('booking.paymentFailed'))
      setIsProcessing(false)
      return
    }

    setCardSaved(true)
    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSaveCard} className="space-y-6">
      {!cardSaved && (
        <PaymentElement options={{ layout: 'tabs', wallets: { link: 'never' } }} />
      )}

      {/* Renter's name notice — directly below the card field */}
      {!cardSaved && <RentersNameNotice />}

      {/* Summary + policy block — same structure as Card flow, just different
          totals: today the customer is charged AED 495 holding deposit, the
          balance is paid in cash at delivery. */}
      {!cardSaved && (
        <PaymentSummaryAndPolicies
          payNowAmount={CASH_HOLDING_DEPOSIT_AED}
          amountSubLabel={`Holding deposit — paid today. Balance of ${formatPrice(balanceDueOnPickup, { exact: true })} paid at delivery.`}
          depositAmount={depositAmount}
          depositChoice={depositChoice}
          onOpenPriceDetails={onOpenPriceDetails}
        />
      )}

      {errorMessage && (
        <p className="text-sm text-red-600 text-center">{errorMessage}</p>
      )}

      {cardSaved ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('booking.cardSavedSuccess')}
          </div>
          <button
            type="button"
            onClick={() => onSuccess(bookingId)}
            className="w-full rounded-[var(--radius-card)] bg-black py-3.5 text-base font-bold text-white cursor-pointer hover:bg-black/80 transition-colors"
          >
            {t('booking.confirmBooking')}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="w-full rounded-[var(--radius-card)] bg-black py-3.5 text-base font-bold text-white cursor-pointer hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing
            ? t('booking.savingCard')
            : 'Pay and Book'}
        </button>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// StepPayment (outer component — handles context setup and COD path)
// ---------------------------------------------------------------------------

/**
 * Booking wizard — Step 5: Payment
 *
 * Renders:
 *  - Payment on Delivery: confirmation card + "Confirm Booking" button
 *  - Card/wallet: Stripe Elements with ExpressCheckoutElement (Apple/Google Pay)
 *    + PaymentElement (card input) + cancellation policy + optional deposit notice
 *
 * The Stripe Elements are wrapped with a dark luxury theme matching the brand.
 */
export function StepPayment({
  clientSecret,
  setupClientSecret,
  cashSelected,
  cryptoSelected,
  applePaySelected = false,
  onSuccess,
  bookingId,
  totalDue,
  reservationFee,
  balanceDueOnPickup,
  depositAmount,
  depositChoice = 'deposit',
  breakdown,
  isGuest = false,
  guestEmail,
}: StepPaymentProps) {
  const { formatPrice } = useCurrency()
  const { t } = useTranslation()
  // Shared Price-details modal open state — opened from inside either the
  // Card or Cash form via the lifted handler.
  const [priceDetailsOpen, setPriceDetailsOpen] = useState(false)
  const openPriceDetails = () => setPriceDetailsOpen(true)

  // Crypto payment path
  if (cryptoSelected) {
    return (
      <CryptoPayment
        bookingId={bookingId}
        reservationFee={reservationFee}
        balanceDueOnPickup={balanceDueOnPickup}
        isGuest={isGuest}
        guestEmail={guestEmail}
        onSuccess={onSuccess}
      />
    )
  }

  // Payment on Delivery path
  if (cashSelected) {
    return (
      <div className="space-y-5">
        {/* Security deposit info now lives in the "Refundable deposit" line of
            the summary block below — no separate box needed at the top. */}

        {/* Card-on-file collection */}
        {setupClientSecret && stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: setupClientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#C9A96E',
                  colorBackground: '#ffffff',
                  colorText: '#18181b',
                  borderRadius: '0.75rem',
                  fontSizeBase: '16px',
                },
                rules: {
                  '.Input': { borderColor: '#000000', borderWidth: '2px' },
                  '.Input:focus': { borderColor: '#C9A96E', borderWidth: '2px' },
                  '.Block': { borderColor: '#000000', borderWidth: '2px' },
                  '.Tab': { borderColor: '#000000', borderWidth: '2px' },
                },
              },
            }}
          >
            <CashCardForm
              onSuccess={onSuccess}
              bookingId={bookingId}
              balanceDueOnPickup={balanceDueOnPickup}
              depositAmount={depositAmount}
              depositChoice={depositChoice}
              onOpenPriceDetails={openPriceDetails}
            />
          </Elements>
        ) : (
          /* Test mode fallback — no Stripe publishable key configured */
          <button
            type="button"
            onClick={() => onSuccess(bookingId)}
            className="w-full rounded-[var(--radius-card)] bg-black py-3 text-sm font-semibold text-white hover:bg-black/80 transition-colors"
          >
            {t('booking.confirmBooking')}
          </button>
        )}

        {breakdown && (
          <PriceDetailsModal
            open={priceDetailsOpen}
            onClose={() => setPriceDetailsOpen(false)}
            breakdown={breakdown}
          />
        )}
      </div>
    )
  }

  // Dev/test mode — no Stripe key configured
  if (!stripePromise) {
    return (
      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-amber-700/40 bg-amber-950/30 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-amber-200">{t('booking.testMode')}</h3>
          </div>
          <p className="text-sm text-amber-200/80 leading-relaxed">
            {t('booking.testModeDesc')}
          </p>
          <p className="text-xs text-amber-200/50">
            {t('booking.total')} <span className="font-semibold text-white">{formatPrice(totalDue)}</span>
            {depositAmount > 0 && (
              <> — a <span className="font-semibold text-white">{formatPrice(depositAmount)}</span> deposit will be collected at rental start</>
            )}
          </p>
        </div>

        {/* Cancellation policy */}
        <div className="rounded-[var(--radius-card)] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
          <p className="font-semibold text-white/70 mb-1.5 text-xs uppercase tracking-wider">
            {t('booking.cancellationPolicy')}
          </p>
          <p>
            {t('booking.cancellationPolicyText')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSuccess(bookingId)}
          className="w-full rounded-[var(--radius-card)] bg-black py-3 text-sm font-semibold text-white hover:bg-black/80 transition-colors"
        >
          {t('booking.acceptTestPayment')}
        </button>
      </div>
    )
  }

  // Card / wallet path — requires clientSecret
  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-border border-t-brand-cyan" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#C9A96E',
              colorBackground: '#ffffff',
              colorText: '#18181b',
              borderRadius: '0.75rem',
              fontSizeBase: '16px',
            },
            rules: {
              '.Input': { borderColor: '#000000', borderWidth: '2px' },
              '.Input:focus': { borderColor: '#C9A96E', borderWidth: '2px' },
              '.Block': { borderColor: '#000000', borderWidth: '2px' },
              '.Tab': { borderColor: '#000000', borderWidth: '2px' },
            },
          },
        }}
      >
        <PaymentForm
          onSuccess={onSuccess}
          bookingId={bookingId}
          showExpressCheckout={applePaySelected}
          totalDue={totalDue}
          depositAmount={depositAmount}
          depositChoice={depositChoice}
          onOpenPriceDetails={openPriceDetails}
        />
      </Elements>

      {breakdown && (
        <PriceDetailsModal
          open={priceDetailsOpen}
          onClose={() => setPriceDetailsOpen(false)}
          breakdown={breakdown}
        />
      )}
    </div>
  )
}
