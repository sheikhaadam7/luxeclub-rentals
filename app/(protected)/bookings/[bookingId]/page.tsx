import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getBookingDetail } from '@/app/actions/bookings'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ bookingId: string }>
}

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

function formatAED(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
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
  if (method === 'apple_pay') return 'Apple Pay'
  if (method === 'google_pay') return 'Google Pay'
  return 'Credit / Debit Card'
}

function formatPaymentStatus(paymentStatus: string): { label: string; className: string } {
  if (paymentStatus === 'paid') return { label: 'Paid', className: 'text-green-400' }
  if (paymentStatus === 'pending_cash') return { label: 'Cash Payment Pending', className: 'text-amber-400' }
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

function PricingRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
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

export default async function BookingDetailPage({ params }: PageProps) {
  const { bookingId } = await params
  const result = await getBookingDetail(bookingId)

  if (!result || 'error' in result) {
    notFound()
  }

  const booking = result
  const vehicle = booking.vehicles
  const statusConfig = formatStatus(booking.status)
  const paymentStatusConfig = formatPaymentStatus(booking.payment_status)
  const bookingRef = booking.id.replace(/-/g, '').substring(0, 8).toUpperCase()

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Back link */}
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          My Bookings
        </Link>

        {/* Hero: vehicle image */}
        {vehicle?.primary_image_url && (
          <div className="relative w-full aspect-video rounded-[--radius-card] overflow-hidden bg-brand-surface">
            <Image
              src={vehicle.primary_image_url}
              alt={vehicle.name ?? 'Vehicle'}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 640px) 100vw, 672px"
            />
          </div>
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
          </div>
        </section>

        {/* Pricing breakdown section */}
        <section className="bg-brand-surface border border-brand-border rounded-[--radius-card]">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Pricing Breakdown</h2>
          </div>
          <div className="px-6 py-2">
            <PricingRow label="Rental Subtotal" value={formatAED(booking.rental_subtotal)} />
            {booking.delivery_fee > 0 && (
              <PricingRow label="Delivery Fee" value={formatAED(booking.delivery_fee)} />
            )}
            {booking.return_fee > 0 && (
              <PricingRow label="Return Collection Fee" value={formatAED(booking.return_fee)} />
            )}
            {booking.no_deposit_surcharge > 0 && (
              <PricingRow label="No-Deposit Surcharge" value={formatAED(booking.no_deposit_surcharge)} />
            )}
            <div className="border-t border-brand-border mt-2 pt-2">
              <PricingRow label="Total Due" value={formatAED(booking.total_due)} bold />
            </div>
            {booking.deposit_choice === 'deposit' && booking.deposit_amount > 0 && (
              <div className="border-t border-brand-border mt-2 pt-2 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm text-brand-muted">Security Deposit Hold</span>
                    <p className="text-xs text-brand-muted/60 mt-0.5">Pre-authorized, not charged</p>
                  </div>
                  <span className="text-sm text-brand-muted">{formatAED(booking.deposit_amount)}</span>
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
        </section>

        {/* Cancellation policy section */}
        <section className="bg-brand-surface border border-brand-border rounded-[--radius-card] p-6 space-y-3">
          <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">Cancellation Policy</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-brand-muted">
              <svg className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Free cancellation up to 48 hours before pickup</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-brand-muted">
              <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>50% charge for cancellations within 24–48 hours of pickup</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-brand-muted">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Full charge for cancellations within 24 hours of pickup</span>
            </li>
          </ul>
        </section>

      </div>
    </main>
  )
}
