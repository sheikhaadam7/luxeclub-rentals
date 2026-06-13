'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { UseFormReturn } from 'react-hook-form'
import { BookingFormValues } from '@/lib/validations/booking'
import { useTranslation } from '@/lib/i18n/context'
import { useCurrency } from '@/lib/currency/context'

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
  /** Crypto end-to-end isn't wired yet — the click opens a popup pointing the
      customer to WhatsApp instead of selecting the method. */
  const [cryptoPopupOpen, setCryptoPopupOpen] = useState(false)

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
              // 'crypto' option isn't live yet — surface a popup that routes
              // the customer to WhatsApp instead of selecting.
              if (option.value === 'crypto') {
                setCryptoPopupOpen(true)
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

      <CryptoComingSoonModal
        open={cryptoPopupOpen}
        onClose={() => setCryptoPopupOpen(false)}
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
  const { formatPrice } = useCurrency()
  const holdingDeposit = formatPrice(495, { exact: true })
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
                To lock in your booking, we ask for a small {holdingDeposit} holding deposit today, on a
                card in the renter&apos;s name. That&apos;s the only payment you make now. The
                rest of your total is paid when we deliver your car. The {holdingDeposit} isn&apos;t
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
                before your booking starts, and we refund your {holdingDeposit} holding deposit in full.
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
              Continue
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

// ---------------------------------------------------------------------------
// CryptoComingSoonModal — opened when a customer clicks the Crypto option on
// Step 5. Crypto isn't wired end-to-end yet (NOWPayments config pending), so
// instead of selecting the method we route the customer to WhatsApp where the
// team can take them through the crypto booking manually.
// ---------------------------------------------------------------------------

interface CryptoComingSoonModalProps {
  open: boolean
  onClose: () => void
}

const CRYPTO_WHATSAPP_URL =
  'https://wa.me/971588086137?text=' +
  encodeURIComponent("Hi, I'd like to book a car and pay in crypto. Can you help me through the process?")

function CryptoComingSoonModal({ open, onClose }: CryptoComingSoonModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crypto-soon-title"
      className={`fixed inset-0 z-[130] ${open ? '' : 'pointer-events-none'}`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-150 cursor-default ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-[520px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border-2 border-brand-cyan flex flex-col overflow-hidden
            transition-[opacity,transform] duration-150 will-change-[opacity,transform]
            ${open ? 'pointer-events-auto opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-[0.98]'}`}
        >
          <div className="flex items-start justify-between px-6 pt-6 pb-3">
            <h3
              id="crypto-soon-title"
              className="text-2xl font-bold text-zinc-900 leading-tight pr-4"
            >
              Crypto bookings — speak to our team
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 pb-4 overflow-y-auto">
            <div className="rounded-[var(--radius-card)] border border-zinc-200 bg-zinc-50 p-5 text-base text-zinc-700">
              <p className="leading-relaxed">
                We&apos;re finalising our self-serve crypto checkout. Until that&apos;s live,
                the easiest way to book and pay in crypto is to message us directly on
                WhatsApp — our team will confirm availability, send you a payment invoice
                in BTC, ETH, USDT or your preferred coin, and lock the booking in once
                the transaction confirms.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-200 flex flex-col sm:flex-row-reverse gap-3">
            <a
              href={CRYPTO_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-[var(--radius-card)] bg-[#25D366] text-white text-base font-bold cursor-pointer hover:bg-[#1FB959] transition-colors text-center inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              Message us on WhatsApp
            </a>
            <button
              type="button"
              onClick={onClose}
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
