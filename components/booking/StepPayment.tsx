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

// Initialize Stripe outside the component to avoid re-creating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepPaymentProps {
  clientSecret: string | null
  depositClientSecret: string | null
  cashSelected: boolean
  onSuccess: (bookingId: string) => void
  bookingId: string
  totalDue: number
  depositAmount: number
}

// ---------------------------------------------------------------------------
// Inner form (requires Elements context)
// ---------------------------------------------------------------------------

interface PaymentFormProps {
  depositClientSecret: string | null
  onSuccess: (bookingId: string) => void
  bookingId: string
  depositAmount: number
}

function PaymentForm({
  depositClientSecret,
  onSuccess,
  bookingId,
  depositAmount,
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

    // If rental succeeded without redirect and deposit PI exists, confirm deposit
    if (paymentIntent && depositClientSecret) {
      const depositElements = stripe.elements({
        clientSecret: depositClientSecret,
      })

      const { error: depositError } = await stripe.confirmCardPayment(
        depositClientSecret
      )

      if (depositError) {
        // Rental paid but deposit failed — surface the error
        setErrorMessage(
          `Rental payment succeeded but deposit authorization failed: ${depositError.message ?? 'Unknown error'}`
        )
        setIsProcessing(false)
        return
      }

      void depositElements // suppress unused variable warning
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

      {/* Deposit notice */}
      {depositClientSecret && depositAmount > 0 && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-200">
          A deposit hold of{' '}
          <span className="font-semibold">AED {depositAmount.toLocaleString()}</span>{' '}
          will also be placed on your card. This is not a charge — funds are only
          captured if there is damage to the vehicle.
        </div>
      )}

      {/* Cancellation policy */}
      <div className="rounded-[--radius-card] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
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
        className="w-full rounded-[--radius-card] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
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
  depositClientSecret,
  cashSelected,
  onSuccess,
  bookingId,
  totalDue,
  depositAmount,
}: StepPaymentProps) {
  // Cash on delivery path
  if (cashSelected) {
    return (
      <div className="space-y-6">
        <div className="rounded-[--radius-card] border border-brand-cyan/30 bg-brand-cyan/5 p-6 space-y-3">
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
              AED {totalDue.toLocaleString()}
            </span>{' '}
            ready when the car is delivered. Your booking will be confirmed once our
            team verifies the arrangement.
          </p>
        </div>

        {/* Cancellation policy */}
        <div className="rounded-[--radius-card] border border-brand-border bg-brand-surface p-4 text-sm text-brand-muted">
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
          className="w-full rounded-[--radius-card] bg-brand-cyan py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors"
        >
          Confirm Booking
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
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#0099ff',
            colorBackground: '#0a0a0a',
            colorText: '#ffffff',
            borderRadius: '0.75rem',
          },
        },
      }}
    >
      <PaymentForm
        depositClientSecret={depositClientSecret}
        onSuccess={onSuccess}
        bookingId={bookingId}
        depositAmount={depositAmount}
      />
    </Elements>
  )
}
