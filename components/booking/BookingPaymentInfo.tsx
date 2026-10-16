'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCurrency } from '@/lib/currency/context'
import { RESERVATION_FEE_AED } from '@/lib/pricing/constants'

interface BookingPaymentInfoProps {
  /** Positioning from the parent — the icon sits on the Book Now button. */
  className?: string
}

/**
 * The small (i) that sits on every Book Now button, telling the customer a
 * payment is required before the booking completes.
 *
 * The fee is formatted through useCurrency, never hardcoded: a visitor
 * browsing in USD must not be shown "AED 450" and have to work out what it
 * costs them.
 *
 * Rendered as a SIBLING of the Book Now link, never a child — a button
 * inside an anchor is invalid markup and the click would navigate.
 */
export function BookingPaymentInfo({ className = '' }: BookingPaymentInfoProps) {
  const { formatPrice } = useCurrency()
  // `open` can only become true from a click, which is always client-side, so
  // the portal never runs during SSR and no mounted flag is needed.
  const [open, setOpen] = useState(false)

  // Lock the page behind the sheet, and restore whatever was there before.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const fee = formatPrice(RESERVATION_FEE_AED, { exact: true })

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label="Payment information"
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full border border-current/40 text-current opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-opacity ${className}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25h.75v4.5h.75M12 8.25h.008v.008H12V8.25z" />
          <circle cx="12" cy="12" r="9.25" />
        </svg>
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Payment information">
              <div
                onClick={() => setOpen(false)}
                aria-hidden
                className="absolute inset-0 bg-black/60"
              />
              {/* Bottom sheet on mobile, centred card from sm up — same shape
                  as the delivery-zone picker so the flow feels consistent. */}
              <div className="absolute inset-x-0 bottom-0 w-full max-w-full sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6">
                <div className="relative w-full max-w-full bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-[560px] shadow-2xl max-h-[88vh] overflow-y-auto overflow-x-hidden">
                  <div className="sticky top-0 bg-white flex justify-end px-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close"
                      className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="px-5 pb-8 pt-1 sm:px-8">
                    <p className="font-body text-[15px] sm:text-lg font-bold text-zinc-900 leading-snug break-words">
                      You will be asked to provide a valid payment instrument, in order to
                      complete the booking.
                    </p>

                    {/* Shown on every Book Now button, before a payment
                        method has been chosen -- so it has to describe both
                        routes. It previously promised "nothing else is taken
                        online", which is the opposite of what happens when
                        the customer picks card. */}
                    <ul className="mt-5 space-y-3 list-disc pl-5 text-sm sm:text-base text-zinc-700 leading-[1.7] break-words">
                      <li>
                        <span className="font-semibold text-zinc-900">Pay by card</span> and the
                        rental is paid in full at the end of the booking steps. Nothing further
                        is due when you collect the car.
                      </li>
                      <li>
                        <span className="font-semibold text-zinc-900">Pay on delivery</span> and
                        only <span className="font-semibold text-zinc-900">{fee}</span> is taken
                        now to hold the car on your dates. The balance is paid when we hand it
                        over.
                      </li>
                      <li>
                        The price is the same either way — only the timing changes.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
