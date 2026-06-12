'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { UseFormReturn } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { useTranslation } from '@/lib/i18n/context'

interface StepPaymentMethodProps {
  form: UseFormReturn<BookingFormValues>
  /** Navigation buttons (Back / Continue) rendered inside the white card */
  navButtons?: React.ReactNode
  /** Called when the user taps the back chevron on the card (mobile) */
  onBack?: () => void
}

const PAYMENT_OPTIONS = [
  {
    value: 'card' as const,
    labelKey: 'booking.creditDebitCard',
    descKey: 'booking.creditDebitCardDesc',
    fee: null,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    value: 'apple_pay' as const,
    labelKey: 'booking.applePay',
    descKey: 'booking.applePayDesc',
    fee: null,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
  },
  {
    value: 'cash' as const,
    labelKey: 'booking.cashOnDelivery',
    descKey: 'booking.cashOnDeliveryDesc',
    fee: null,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 'crypto' as const,
    labelKey: 'booking.cryptocurrency',
    descKey: 'booking.cryptocurrencyDesc',
    fee: 'No processing fee',
    feeColor: 'text-emerald-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function StepPaymentMethod({ form, navButtons, onBack }: StepPaymentMethodProps) {
  const { t } = useTranslation()
  const paymentMethod = form.watch('paymentMethod')
  /** The 'cash' option requires explicit acknowledgement of the AED 495 deposit
      before the selection is committed. */
  const [cashPopupOpen, setCashPopupOpen] = useState(false)

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6">
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to previous step"
            className="sm:hidden -mt-2 -ml-2 mb-1 inline-flex items-center gap-1 h-10 pl-2 pr-3 text-[15px] font-bold text-black active:bg-black/10 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-zinc-900 mb-1">{t('booking.paymentMethod')}</h2>
        <p className="text-sm text-zinc-500">{t('booking.paymentMethodDesc')}</p>
      </div>

      <div className="space-y-3">
        {PAYMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              // 'cash' option — defer selection until the deposit popup is acknowledged.
              if (option.value === 'cash') {
                setCashPopupOpen(true)
                return
              }
              form.setValue('paymentMethod', option.value, { shouldValidate: true })
            }}
            className={[
              'w-full p-5 rounded-[var(--radius-card)] border-2 text-left transition-all',
              paymentMethod === option.value
                ? 'border-brand-cyan bg-brand-cyan/5'
                : 'border-black',
            ].join(' ')}
          >
            <div className="flex items-start gap-4">
              {/* Radio indicator */}
              <div
                className={[
                  'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  paymentMethod === option.value ? 'border-brand-cyan' : 'border-zinc-300',
                ].join(' ')}
              >
                {paymentMethod === option.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={paymentMethod === option.value ? 'text-brand-cyan' : 'text-zinc-500'}>
                    {option.icon}
                  </span>
                  <p className={['text-base font-semibold', paymentMethod === option.value ? 'text-brand-cyan' : 'text-zinc-900'].join(' ')}>
                    {t(option.labelKey)}
                  </p>
                </div>
                <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                  {t(option.descKey)}
                </p>
                {option.fee && (
                  <p className={`text-sm mt-1 font-medium ${'feeColor' in option && option.feeColor ? option.feeColor : 'text-amber-600'}`}>
                    {option.fee}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {navButtons && <div className="pt-4 border-t border-zinc-200">{navButtons}</div>}

      <CashConfirmModal
        open={cashPopupOpen}
        onCancel={() => setCashPopupOpen(false)}
        onConfirm={() => {
          form.setValue('paymentMethod', 'cash', { shouldValidate: true })
          setCashPopupOpen(false)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirmation modal for the 'cash' option — forces explicit acknowledgement of
// the AED 495 holding deposit before the selection is committed.
// Kept inline (one-off use, not exported).
// ---------------------------------------------------------------------------

interface CashConfirmModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

function CashConfirmModal({ open, onCancel, onConfirm }: CashConfirmModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Body scroll lock + Esc close
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cash-confirm-title"
      className={`fixed inset-0 z-[130] ${open ? '' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-150 cursor-default ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Centered card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-[560px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border-2 border-brand-cyan flex flex-col overflow-hidden
            transition-[opacity,transform] duration-150 will-change-[opacity,transform]
            ${open ? 'pointer-events-auto opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-[0.98]'}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <h3
              id="cash-confirm-title"
              className="text-2xl font-bold text-zinc-900 leading-tight pr-4"
            >
              Payment on Delivery — please read
            </h3>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body — two info boxes */}
          <div className="px-6 pb-4 overflow-y-auto space-y-3">
            <div className="rounded-[var(--radius-card)] border border-zinc-200 bg-zinc-50 p-5 text-base text-zinc-700">
              <p className="font-bold text-zinc-900 mb-2 text-sm uppercase tracking-wider">
                Your Payment, Explained
              </p>
              <p className="leading-relaxed">
                You&apos;ve chosen Payment on Delivery — here&apos;s exactly how it works.
                To lock in your booking, we ask for a small AED 495 holding deposit today, on a
                card in the renter&apos;s name. That&apos;s the only payment you make now. The
                rest of your total is paid when we deliver your car. The AED 495 isn&apos;t
                an extra fee — it comes straight off your balance, so on the day you only pay the
                remaining amount, and nothing more. As soon as payment goes through, you&apos;ll
                get a confirmation email from our team.
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-zinc-200 bg-zinc-50 p-5 text-base text-zinc-700">
              <p className="font-bold text-zinc-900 mb-2 text-sm uppercase tracking-wider">
                Refunds &amp; Cancellation
              </p>
              <p className="leading-relaxed">
                We understand plans change, so we keep this simple. Cancel more than 24 hours
                before your booking starts, and we refund your AED 495 holding deposit in full.
                Cancel within 24 hours of the start time, or don&apos;t show up, and the deposit
                is non-refundable. And if your booking goes ahead as planned, the deposit simply
                comes off your balance on the day.
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-zinc-200 flex flex-col sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-6 py-3.5 rounded-[var(--radius-card)] bg-brand-cyan text-black text-base font-bold cursor-pointer hover:bg-brand-cyan-hover transition-colors"
            >
              I understand — continue
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-3.5 rounded-[var(--radius-card)] border border-zinc-300 text-base font-bold text-zinc-900 cursor-pointer hover:bg-zinc-50 transition-colors"
            >
              Choose another method
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
