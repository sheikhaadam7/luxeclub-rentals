'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookingPriceBreakdown } from '@/lib/pricing/calculator'

interface PriceDetailsModalProps {
  open: boolean
  onClose: () => void
  breakdown: BookingPriceBreakdown
}

function formatAED(n: number): string {
  return n.toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface LineProps {
  label: string
  amount: number
  bold?: boolean
}

function Line({ label, amount, bold = false }: LineProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className={['text-zinc-700', bold ? 'font-semibold text-zinc-900' : ''].join(' ')}>
        {label}
      </span>
      <span className={['tabular-nums', bold ? 'font-semibold text-zinc-900' : 'text-zinc-700'].join(' ')}>
        AED {formatAED(amount)}
      </span>
    </div>
  )
}

export function PriceDetailsModal({ open, onClose, breakdown }: PriceDetailsModalProps) {
  const [mounted, setMounted] = useState(false)
  const [taxesOpen, setTaxesOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!mounted || !open) return null

  const {
    baseRate,
    rentalDays,
    discountPercent,
    rentalSubtotal,
    protectionSurcharge,
    addonBreakdown,
    noDepositSurcharge,
    creditCardSurcharge,
    totalDue,
  } = breakdown

  const rentalChargesTotal =
    rentalSubtotal +
    protectionSurcharge +
    addonBreakdown.total +
    noDepositSurcharge
  const taxesAndFeesTotal = creditCardSurcharge

  return createPortal(
    <div className="fixed inset-0 z-[100] flex sm:items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close price details"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-details-title"
        className="relative w-full sm:w-[480px] sm:max-w-[calc(100%-2rem)] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-2 border-brand-cyan mt-auto sm:mt-0 max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <h3 id="price-details-title" className="font-display text-lg font-bold text-zinc-900">
            Price details
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Rental charges */}
          <section className="space-y-2">
            <Line label="Rental charges" amount={rentalChargesTotal} bold />
            <div className="pl-3 border-l-2 border-zinc-100 space-y-1.5">
              <Line
                label={`Base rental (${rentalDays} ${rentalDays === 1 ? 'day' : 'days'} × AED ${formatAED(baseRate)}${discountPercent > 0 ? ` — ${discountPercent}% off` : ''})`}
                amount={rentalSubtotal}
              />
              {protectionSurcharge > 0 && (
                <Line label="All Inclusive Protection" amount={protectionSurcharge} />
              )}
              {addonBreakdown.additionalDriver > 0 && (
                <Line label="Add-on: Additional Driver" amount={addonBreakdown.additionalDriver} />
              )}
              {addonBreakdown.personalDriver > 0 && (
                <Line label="Add-on: Personal Driver" amount={addonBreakdown.personalDriver} />
              )}
              {addonBreakdown.babySeat > 0 && (
                <Line label="Add-on: Baby Seat" amount={addonBreakdown.babySeat} />
              )}
              {addonBreakdown.childSeat > 0 && (
                <Line label="Add-on: Child Seat" amount={addonBreakdown.childSeat} />
              )}
              {noDepositSurcharge > 0 && (
                <Line label="No Deposit Option" amount={noDepositSurcharge} />
              )}
            </div>
          </section>

          {/* Taxes and fees (collapsible) */}
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setTaxesOpen((v) => !v)}
              className="w-full flex items-baseline justify-between gap-4 text-sm font-semibold text-zinc-900 hover:text-brand-cyan transition-colors"
              aria-expanded={taxesOpen}
            >
              <span className="flex items-center gap-1.5">
                Taxes and fees
                <svg
                  className={['w-4 h-4 transition-transform', taxesOpen ? 'rotate-180' : ''].join(' ')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
              <span className="tabular-nums">AED {formatAED(taxesAndFeesTotal)}</span>
            </button>
            {taxesOpen && (
              <div className="pl-3 border-l-2 border-zinc-100 space-y-1.5">
                {creditCardSurcharge > 0 && (
                  <Line label="Booking fees (3% card surcharge)" amount={creditCardSurcharge} />
                )}
                {creditCardSurcharge === 0 && (
                  <p className="text-xs text-zinc-500">No fees on cash bookings.</p>
                )}
              </div>
            )}
          </section>

          {/* Total */}
          <section className="pt-4 border-t-2 border-zinc-200">
            <Line label="Total" amount={totalDue} bold />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
