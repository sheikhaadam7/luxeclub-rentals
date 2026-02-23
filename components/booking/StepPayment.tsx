'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useCurrency } from '@/lib/currency/context'
import { createCryptoInvoice } from '@/app/actions/crypto-payment'

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
  onSuccess: (bookingId: string) => void
  bookingId: string
  totalDue: number
  depositAmount: number
  isGuest?: boolean
  guestEmail?: string
}

// ---------------------------------------------------------------------------
// Inner form (requires Elements context)
// ---------------------------------------------------------------------------

interface PaymentFormProps {
  onSuccess: (bookingId: string) => void
  bookingId: string
}

function PaymentForm({
  onSuccess,
  bookingId,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
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
      setErrorMessage(rentalError.message ?? 'Payment failed. Please try again.')
      setIsProcessing(false)
      return
    }

    setIsProcessing(false)
    onSuccess(bookingId)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Express checkout (Apple Pay / Google Pay) */}
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
              setErrorMessage(error.message ?? 'Payment failed.')
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
        <div className="h-px flex-1 bg-brand-border" />
        <span className="text-xs text-brand-muted uppercase tracking-widest">
          or pay with card
        </span>
        <div className="h-px flex-1 bg-brand-border" />
      </div>

      {/* Card input */}
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {/* Cancellation policy */}
      <div className="rounded-[var(--radius-card)] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
        <p className="font-semibold text-white/70 mb-1.5 text-xs uppercase tracking-wider">
          Cancellation Policy
        </p>
        <p>
          Free cancellation up to 24 hours before the rental start time.
          Cancellations within 24 hours are subject to a one-day rental fee.
          No-shows are charged the full rental amount.
        </p>
      </div>

      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-red-400 text-center">{errorMessage}</p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full rounded-[var(--radius-card)] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Crypto payment component
// ---------------------------------------------------------------------------

interface CryptoPaymentProps {
  bookingId: string
  totalDue: number
  isGuest: boolean
  guestEmail?: string
  onSuccess: (bookingId: string) => void
}

function CryptoPayment({ bookingId, totalDue, isGuest, guestEmail, onSuccess }: CryptoPaymentProps) {
  const { formatPrice } = useCurrency()
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

      // Redirect to NOWPayments hosted invoice page
      window.location.href = result.invoiceUrl
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
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
          <h3 className="text-sm font-semibold text-white">
            Cryptocurrency Payment
          </h3>
        </div>
        <p className="text-sm text-brand-muted leading-relaxed">
          Total due:{' '}
          <span className="text-white font-semibold">{formatPrice(totalDue)}</span>.
          You&apos;ll be redirected to our secure payment partner to complete your
          payment in BTC, ETH, USDT, or other supported cryptocurrencies.
        </p>
      </div>

      {/* Cancellation policy */}
      <div className="rounded-[var(--radius-card)] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
        <p className="font-semibold text-white/70 mb-1.5 text-xs uppercase tracking-wider">
          Cancellation Policy
        </p>
        <p>
          Free cancellation up to 24 hours before the rental start time.
          Cancellations within 24 hours are subject to a one-day rental fee.
          No-shows are charged the full rental amount.
        </p>
      </div>

      {/* Error message */}
      {errorMessage && (
        <p className="text-sm text-red-400 text-center">{errorMessage}</p>
      )}

      <button
        type="button"
        onClick={handlePayWithCrypto}
        disabled={isProcessing}
        className="w-full rounded-[var(--radius-card)] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Creating invoice...' : 'Pay with Crypto'}
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
}

function CashCardForm({ onSuccess, bookingId }: CashCardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
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
      setErrorMessage(error.message ?? 'Failed to save card. Please try again.')
      setIsProcessing(false)
      return
    }

    setCardSaved(true)
    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSaveCard} className="space-y-6">
      {!cardSaved && (
        <PaymentElement options={{ layout: 'tabs' }} />
      )}

      {errorMessage && (
        <p className="text-sm text-red-400 text-center">{errorMessage}</p>
      )}

      {cardSaved ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Card saved successfully
          </div>
          <button
            type="button"
            onClick={() => onSuccess(bookingId)}
            className="w-full rounded-[var(--radius-card)] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors"
          >
            Confirm Booking
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="w-full rounded-[var(--radius-card)] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Saving card...' : 'Save Card & Continue'}
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
 *  - Cash on delivery: confirmation card + "Confirm Booking" button
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
  onSuccess,
  bookingId,
  totalDue,
  depositAmount,
  isGuest = false,
  guestEmail,
}: StepPaymentProps) {
  const { formatPrice } = useCurrency()

  // Crypto payment path
  if (cryptoSelected) {
    return (
      <CryptoPayment
        bookingId={bookingId}
        totalDue={totalDue}
        isGuest={isGuest}
        guestEmail={guestEmail}
        onSuccess={onSuccess}
      />
    )
  }

  // Cash on delivery path
  if (cashSelected) {
    return (
      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-brand-cyan/30 bg-brand-cyan/5 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cyan/10 border border-brand-cyan/30">
              <svg
                className="h-5 w-5 text-brand-cyan"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">
              Cash on Delivery Selected
            </h3>
          </div>
          <p className="text-sm text-brand-muted leading-relaxed">
            Please have{' '}
            <span className="text-white font-semibold">
              {formatPrice(totalDue)}
            </span>{' '}
            ready when the car is delivered. Your booking will be confirmed once our
            team verifies the arrangement.
          </p>
        </div>

        {/* Card-on-file collection */}
        {setupClientSecret && stripePromise ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-card)] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
              <p className="font-semibold text-white/70 mb-1.5 text-xs uppercase tracking-wider">
                Card Required for Security
              </p>
              <p>
                A card is required for security purposes. You will not be charged
                — payment is collected in cash at delivery.
              </p>
            </div>

            {/* Cancellation policy */}
            <div className="rounded-[var(--radius-card)] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
              <p className="font-semibold text-white/70 mb-1.5 text-xs uppercase tracking-wider">
                Cancellation Policy
              </p>
              <p>
                Free cancellation up to 24 hours before the rental start time.
                Cancellations within 24 hours are subject to a one-day rental fee.
                No-shows are charged the full rental amount.
              </p>
            </div>

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: setupClientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#C9A96E',
                    colorBackground: '#0a0a0a',
                    colorText: '#ffffff',
                    borderRadius: '0.75rem',
                  },
                },
              }}
            >
              <CashCardForm onSuccess={onSuccess} bookingId={bookingId} />
            </Elements>
          </div>
        ) : (
          /* Test mode fallback — no Stripe publishable key configured */
          <>
            {/* Cancellation policy */}
            <div className="rounded-[var(--radius-card)] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
              <p className="font-semibold text-white/70 mb-1.5 text-xs uppercase tracking-wider">
                Cancellation Policy
              </p>
              <p>
                Free cancellation up to 24 hours before the rental start time.
                Cancellations within 24 hours are subject to a one-day rental fee.
                No-shows are charged the full rental amount.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSuccess(bookingId)}
              className="w-full rounded-[var(--radius-card)] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors"
            >
              Confirm Booking
            </button>
          </>
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
            <h3 className="text-sm font-semibold text-amber-200">Test Mode</h3>
          </div>
          <p className="text-sm text-amber-200/80 leading-relaxed">
            Stripe is not configured. Click below to simulate a successful payment and
            proceed to booking confirmation.
          </p>
          <p className="text-xs text-amber-200/50">
            Total: <span className="font-semibold text-white">{formatPrice(totalDue)}</span>
            {depositAmount > 0 && (
              <> — a <span className="font-semibold text-white">{formatPrice(depositAmount)}</span> deposit will be collected at rental start</>
            )}
          </p>
        </div>

        {/* Cancellation policy */}
        <div className="rounded-[var(--radius-card)] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
          <p className="font-semibold text-white/70 mb-1.5 text-xs uppercase tracking-wider">
            Cancellation Policy
          </p>
          <p>
            Free cancellation up to 24 hours before the rental start time.
            Cancellations within 24 hours are subject to a one-day rental fee.
            No-shows are charged the full rental amount.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSuccess(bookingId)}
          className="w-full rounded-[var(--radius-card)] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors"
        >
          Accept Payment (Test Mode)
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
      {depositAmount > 0 && (
        <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-4 text-sm text-brand-muted">
          A security deposit of{' '}
          <span className="font-semibold text-white">{formatPrice(depositAmount)}</span>{' '}
          will be collected when your rental begins. This is not charged at booking time.
        </div>
      )}
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#C9A96E',
              colorBackground: '#0a0a0a',
              colorText: '#ffffff',
              borderRadius: '0.75rem',
            },
          },
        }}
      >
        <PaymentForm
          onSuccess={onSuccess}
          bookingId={bookingId}
        />
      </Elements>
    </div>
  )
}
