'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { lookupGuestBooking } from '@/app/actions/guest-bookings'
import type { BookingDetail } from '@/app/actions/bookings'
import { PriceDisplay } from '@/components/catalogue/PriceDisplay'
import GuestCancelButton from '@/components/booking-lookup/GuestCancelButton'
import GuestDateChangeButton from '@/components/booking-lookup/GuestDateChangeButton'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00Z')
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} — ${formatDate(end)}`
}

function formatDurationType(type: string): string {
  if (type === 'daily') return 'Daily'
  if (type === 'weekly') return 'Weekly'
  if (type === 'monthly') return 'Monthly'
  return type
}

function formatPickupMethod(method: string): string {
  if (method === 'delivery') return 'Delivery to your location'
  return 'Office Pickup — Downtown Dubai'
}

function formatReturnMethod(method: string): string {
  if (method === 'collection') return 'Collection from your location'
  return 'Office Return — Downtown Dubai'
}

function formatPaymentMethod(method: string): string {
  if (method === 'cash') return 'Cash on Delivery'
  if (method === 'crypto') return 'Cryptocurrency'
  if (method === 'apple_pay') return 'Apple Pay'
  if (method === 'google_pay') return 'Google Pay'
  return 'Credit / Debit Card'
}

function formatPaymentStatus(paymentStatus: string): { label: string; className: string } {
  if (paymentStatus === 'paid') return { label: 'Paid', className: 'text-green-400' }
  if (paymentStatus === 'pending_cash') return { label: 'Cash Payment Pending', className: 'text-amber-400' }
  if (paymentStatus === 'pending_crypto') return { label: 'Crypto Payment Pending', className: 'text-amber-400' }
  return { label: 'Unpaid', className: 'text-yellow-400' }
}

function formatStatus(status: string): { label: string; className: string } {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmed', className: 'text-brand-cyan' }
    case 'pending':
      return { label: 'Pending Confirmation', className: 'text-yellow-400' }
    case 'completed':
      return { label: 'Completed', className: 'text-green-400' }
    case 'cancelled':
      return { label: 'Cancelled', className: 'text-red-400' }
    case 'car_on_the_way':
      return { label: 'Car On The Way', className: 'text-amber-400' }
    case 'car_delivered':
      return { label: 'Car Delivered', className: 'text-green-400' }
    default:
      return { label: status, className: 'text-brand-muted' }
  }
}

// ---------------------------------------------------------------------------
// Detail row component
// ---------------------------------------------------------------------------

function DetailRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-brand-border last:border-0">
      <span className="text-sm text-brand-muted flex-shrink-0">{label}</span>
      <span className={`text-sm text-right ${valueClassName ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pricing row component
// ---------------------------------------------------------------------------

function PricingRow({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={`text-sm ${bold ? 'text-white font-semibold' : 'text-brand-muted'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'text-white font-semibold' : 'text-white'}`}>{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BookingLookupPage() {
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [lookupEmail, setLookupEmail] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await lookupGuestBooking(email, reference)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setBooking(result)
    setLookupEmail(email)
    setLoading(false)
  }

  const handleRefresh = useCallback(async () => {
    if (!lookupEmail || !reference) return
    const result = await lookupGuestBooking(lookupEmail, reference)
    if (!('error' in result)) {
      setBooking(result)
    }
  }, [lookupEmail, reference])

  function handleReset() {
    setBooking(null)
    setEmail('')
    setReference('')
    setLookupEmail('')
    setError(null)
  }

  // -------------------------------------------------------------------------
  // State 1: Lookup form
  // -------------------------------------------------------------------------

  if (!booking) {
    return (
      <main className="min-h-screen bg-luxury">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-16 space-y-8">
          <div className="text-center space-y-3">
            <h1 className="font-display text-3xl font-semibold text-white">
              Manage My Booking
            </h1>
            <p className="text-sm text-brand-muted">
              Enter the email address and booking reference from your confirmation email to view and manage your booking.
            </p>
          </div>

          <form onSubmit={handleLookup} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-brand-muted">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-3 text-sm text-white placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-cyan/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reference" className="block text-sm font-medium text-brand-muted">
                Booking Reference
              </label>
              <input
                id="reference"
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                maxLength={8}
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-3 text-sm text-white placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-cyan/50 transition-colors font-mono tracking-widest uppercase"
              />
              <p className="text-xs text-brand-muted/60">
                The 8-character code from your confirmation email
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-cyan px-6 py-3 text-sm font-semibold text-black hover:bg-brand-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Looking up...' : 'Look Up Booking'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  // -------------------------------------------------------------------------
  // State 2: Booking detail view
  // -------------------------------------------------------------------------

  const vehicle = booking.vehicles
  const statusConfig = formatStatus(booking.status)
  const paymentStatusConfig = formatPaymentStatus(booking.payment_status)
  const bookingRef = booking.id.replace(/-/g, '').substring(0, 8).toUpperCase()

  // Cancellability logic
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const bookingStartDate = new Date(booking.start_date + 'T00:00:00Z')
  const hasStarted = today >= bookingStartDate

  const isCancellable =
    ['pending', 'confirmed'].includes(booking.status) && booking.payment_method !== 'cash' && !hasStarted
  const isModifiable = ['pending', 'confirmed'].includes(booking.status) && !hasStarted

  let hoursUntilStart = 0
  if (isCancellable || isModifiable) {
    const startTimeStr = booking.start_time || '10:00'
    const [h, m] = startTimeStr.split(':').map(Number)
    const pickupDate = new Date(booking.start_date + 'T00:00:00Z')
    pickupDate.setUTCHours(h, m, 0, 0)
    hoursUntilStart = (pickupDate.getTime() - Date.now()) / (1000 * 60 * 60)
  }

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Back / reset link */}
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Look Up Another Booking
        </button>

        {/* Hero: vehicle image */}
        {vehicle?.primary_image_url && (
          <Image
            src={vehicle.primary_image_url}
            alt={vehicle.name ?? 'Vehicle'}
            width={1200}
            height={800}
            className="w-full h-auto rounded-2xl"
            priority
            sizes="(max-width: 640px) 100vw, 672px"
          />
        )}

        {/* Heading */}
        <div className="space-y-2">
          <p className="text-xs text-brand-muted uppercase tracking-widest">
            Booking Reference: {bookingRef}
          </p>
          <h1 className="font-display text-3xl font-semibold text-white">
            {vehicle?.name ?? 'Vehicle Booking'}
          </h1>
          <p className={`text-sm font-medium ${statusConfig.className}`}>
            {statusConfig.label}
          </p>
          {vehicle?.slug && (
            <Link
              href={`/catalogue/${vehicle.slug}`}
              className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-cyan transition-colors"
            >
              View vehicle details
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Cancel Booking / Date Change — or started-rental message */}
        {hasStarted && ['pending', 'confirmed'].includes(booking.status) ? (
          <section className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6 space-y-2">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Cancellation & Changes</h2>
            <p className="text-sm text-brand-muted">
              Cancellations and date modifications cannot be made once the rental period has started. Please contact us directly if you need assistance.
            </p>
          </section>
        ) : (
          <>
            {isCancellable && (
              <section className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6 space-y-4">
                <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Cancel Booking</h2>
                <GuestCancelButton
                  bookingId={booking.id}
                  guestEmail={lookupEmail}
                  dailyRate={vehicle?.daily_rate ?? 0}
                  totalDue={booking.total_due}
                  hoursUntilStart={hoursUntilStart}
                  onCancelled={handleRefresh}
                />
              </section>
            )}

            {isModifiable && (
              <section className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6 space-y-4">
                <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Change Dates</h2>
                <GuestDateChangeButton
                  bookingId={booking.id}
                  guestEmail={lookupEmail}
                  currentStartDate={booking.start_date}
                  currentEndDate={booking.end_date}
                  modificationStatus={booking.modification_status}
                  modificationRequestedStart={booking.modification_requested_start}
                  modificationRequestedEnd={booking.modification_requested_end}
                  onDateChangeRequested={handleRefresh}
                />
              </section>
            )}
          </>
        )}

        {/* Booking details section */}
        <section className="bg-brand-surface border border-brand-border rounded-[--radius-card] divide-y divide-brand-border">
          <div className="px-6 py-4">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Booking Details</h2>
          </div>
          <div className="px-6">
            <DetailRow
              label="Dates"
              value={formatDateRange(booking.start_date, booking.end_date)}
            />
            <DetailRow
              label="Rate Type"
              value={formatDurationType(booking.duration_type)}
            />
            {booking.start_time && (
              <DetailRow
                label="Pickup Time"
                value={booking.start_time}
              />
            )}
            {booking.end_time && (
              <DetailRow
                label="Dropoff Time"
                value={booking.end_time}
              />
            )}
            <DetailRow
              label="Pickup"
              value={formatPickupMethod(booking.pickup_method)}
            />
            {booking.pickup_method === 'delivery' && booking.delivery_address && (
              <DetailRow
                label="Delivery Address"
                value={booking.delivery_address}
              />
            )}
            <DetailRow
              label="Return"
              value={formatReturnMethod(booking.return_method)}
            />
            {booking.return_method === 'collection' && booking.collection_address && (
              <DetailRow
                label="Collection Address"
                value={booking.collection_address}
              />
            )}
          </div>
        </section>

        {/* Pricing breakdown section */}
        <section className="bg-brand-surface border border-brand-border rounded-[--radius-card]">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Pricing Breakdown</h2>
          </div>
          <div className="px-6 py-2">
            <PricingRow label="Rental Subtotal" value={<PriceDisplay amount={booking.rental_subtotal} />} />
            {booking.delivery_fee > 0 && (
              <PricingRow label="Delivery Fee" value={<PriceDisplay amount={booking.delivery_fee} />} />
            )}
            {booking.return_fee > 0 && (
              <PricingRow label="Return Collection Fee" value={<PriceDisplay amount={booking.return_fee} />} />
            )}
            {booking.no_deposit_surcharge > 0 && (
              <PricingRow label="No-Deposit Surcharge" value={<PriceDisplay amount={booking.no_deposit_surcharge} />} />
            )}
            <div className="border-t border-brand-border mt-2 pt-2">
              <PricingRow label="Total Due" value={<PriceDisplay amount={booking.total_due} />} bold />
            </div>
            {booking.deposit_choice === 'deposit' && booking.deposit_amount > 0 && (
              <div className="border-t border-brand-border mt-2 pt-2 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm text-brand-muted">Security Deposit Hold</span>
                    <p className="text-xs text-brand-muted/60 mt-0.5">Pre-authorized, not charged</p>
                  </div>
                  <PriceDisplay amount={booking.deposit_amount} className="text-sm text-brand-muted" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Payment section */}
        <section className="bg-brand-surface border border-brand-border rounded-[--radius-card]">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Payment</h2>
          </div>
          <div className="px-6">
            <DetailRow
              label="Method"
              value={formatPaymentMethod(booking.payment_method)}
            />
            <DetailRow
              label="Status"
              value={paymentStatusConfig.label}
              valueClassName={paymentStatusConfig.className}
            />
          </div>
          {booking.payment_status === 'pending_crypto' && booking.nowpayments_invoice_id && (
            <div className="px-6 pb-4 pt-2">
              <a
                href={`https://nowpayments.io/payment/?iid=${booking.nowpayments_invoice_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 px-4 py-2.5 text-sm font-medium text-brand-cyan hover:bg-brand-cyan/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Crypto Payment
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </section>

        {/* Cancellation policy section */}
        <section className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6 space-y-3">
          <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Cancellation Policy</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-brand-muted">
              <svg className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Free cancellation more than 24 hours before pickup</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-brand-muted">
              <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>One-day rental fee charged for cancellations within 24 hours of pickup</span>
            </li>
          </ul>
        </section>

      </div>
    </main>
  )
}
