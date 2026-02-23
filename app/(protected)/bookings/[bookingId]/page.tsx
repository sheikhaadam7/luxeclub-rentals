import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getBookingDetail } from '@/app/actions/bookings'
import { createClient } from '@/lib/supabase/server'
import BookingStatusTimeline from '@/components/tracking/BookingStatusTimeline'
import AcceptDeliveryButton from './AcceptDeliveryButton'
import CancelBookingButton from './CancelBookingButton'
import RequestDateChangeButton from './RequestDateChangeButton'
import { PriceDisplay } from '@/components/catalogue/PriceDisplay'
import { T } from '@/components/ui/T'

import LiveTrackingMap from '@/components/tracking/LazyLiveTrackingMap'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ bookingId: string }>
}

const TRACKABLE_STATUSES = new Set(['confirmed', 'car_on_the_way', 'car_delivered'])

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

function durationTypeKey(type: string): string {
  if (type === 'daily') return 'lookup.daily'
  if (type === 'weekly') return 'lookup.weekly'
  if (type === 'monthly') return 'lookup.monthly'
  return type
}

function pickupMethodKey(method: string): string {
  if (method === 'delivery') return 'lookup.deliveryToLocation'
  return 'lookup.officePickup'
}

function returnMethodKey(method: string): string {
  if (method === 'collection') return 'lookup.collectionFromLocation'
  return 'lookup.officeReturn'
}

function paymentMethodKey(method: string): string {
  if (method === 'cash') return 'lookup.cashOnDelivery'
  if (method === 'crypto') return 'lookup.cryptocurrency'
  if (method === 'apple_pay') return 'lookup.applePay'
  if (method === 'google_pay') return 'lookup.googlePay'
  return 'lookup.creditDebitCard'
}

function paymentStatusConfig(paymentStatus: string): { labelKey: string; className: string } {
  if (paymentStatus === 'paid') return { labelKey: 'lookup.paid', className: 'text-green-400' }
  if (paymentStatus === 'pending_cash') return { labelKey: 'lookup.cashPending', className: 'text-amber-400' }
  if (paymentStatus === 'pending_crypto') return { labelKey: 'lookup.cryptoPending', className: 'text-amber-400' }
  return { labelKey: 'lookup.unpaid', className: 'text-yellow-400' }
}

function statusConfig(status: string): { labelKey: string; className: string } {
  switch (status) {
    case 'confirmed':
      return { labelKey: 'lookup.confirmed', className: 'text-brand-cyan' }
    case 'pending':
      return { labelKey: 'lookup.pendingConfirmation', className: 'text-yellow-400' }
    case 'completed':
      return { labelKey: 'lookup.completed', className: 'text-green-400' }
    case 'cancelled':
      return { labelKey: 'lookup.cancelled', className: 'text-red-400' }
    case 'car_on_the_way':
      return { labelKey: 'lookup.carOnTheWay', className: 'text-amber-400' }
    case 'car_delivered':
      return { labelKey: 'lookup.carDelivered', className: 'text-green-400' }
    default:
      return { labelKey: status, className: 'text-brand-muted' }
  }
}

// ---------------------------------------------------------------------------
// Detail row component
// ---------------------------------------------------------------------------

function DetailRow({ label, value, valueClassName }: { label: React.ReactNode; value: React.ReactNode; valueClassName?: string }) {
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

function PricingRow({ label, value, bold }: { label: React.ReactNode; value: React.ReactNode; bold?: boolean }) {
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
  const status = statusConfig(booking.status)
  const paymentStatus = paymentStatusConfig(booking.payment_status)
  const bookingRef = booking.id.replace(/-/g, '').substring(0, 8).toUpperCase()

  const isTrackable = TRACKABLE_STATUSES.has(booking.status)
  const hasDelivery = booking.pickup_method === 'delivery'
  const showMap = isTrackable && hasDelivery && !!booking.delivery_lat && !!booking.delivery_lng

  // Fetch initial vehicle location server-side to avoid empty-state flash on map mount
  let initialLat: number | undefined
  let initialLng: number | undefined

  if (showMap && booking.vehicle_id) {
    try {
      const supabase = await createClient()
      const { data: locationRow } = await supabase
        .from('vehicle_locations')
        .select('lat, lng')
        .eq('vehicle_id', booking.vehicle_id)
        .single()

      if (locationRow) {
        initialLat = locationRow.lat
        initialLng = locationRow.lng
      }
    } catch {
      // Non-fatal — map will show destination pin without car position until first GPS update
    }
  }

  // Cancellability logic — not allowed once the booking period has started
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

        {/* Back link */}
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <T k="bookings.myBookings" />
        </Link>

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
            <T k="lookup.bookingRef" />: {bookingRef}
          </p>
          <h1 className="font-display text-3xl font-semibold text-white">
            {vehicle?.name ?? <T k="lookup.vehicleBooking" />}
          </h1>
          <p className={`text-sm font-medium ${status.className}`}>
            <T k={status.labelKey} />
          </p>
          {vehicle?.slug && (
            <Link
              href={`/catalogue/${vehicle.slug}`}
              className="inline-flex items-center gap-1 text-xs text-brand-muted hover:text-brand-cyan transition-colors"
            >
              <T k="lookup.viewVehicleDetails" />
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Tracking section — shown for confirmed / car_on_the_way / car_delivered */}
        {isTrackable && (
          <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 space-y-6">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="bookings.deliveryStatus" /></h2>

            {/* Status timeline — live updates via Realtime subscription */}
            <BookingStatusTimeline
              bookingId={booking.id}
              initialStatus={booking.status}
            />

            {/* Live map — rendered when delivery method is set and coordinates available */}
            {showMap && (
              <LiveTrackingMap
                vehicleId={booking.vehicle_id}
                deliveryLat={booking.delivery_lat!}
                deliveryLng={booking.delivery_lng!}
                initialLat={initialLat}
                initialLng={initialLng}
              />
            )}
          </section>
        )}

        {/* Accept Delivery section — shown when car has been delivered */}
        {booking.status === 'car_delivered' && (
          <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 space-y-4">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="bookings.acceptDelivery" /></h2>
            <p className="text-sm text-brand-muted">
              <T k="bookings.acceptDeliveryDesc" />
            </p>
            <AcceptDeliveryButton bookingId={booking.id} />
          </section>
        )}

        {/* Cancel Booking / Date Change — or started-rental message */}
        {hasStarted && ['pending', 'confirmed'].includes(booking.status) ? (
          <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 space-y-2">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="lookup.cancellationChanges" /></h2>
            <p className="text-sm text-brand-muted">
              <T k="lookup.cancellationStarted" />
            </p>
          </section>
        ) : (
          <>
            {isCancellable && (
              <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 space-y-4">
                <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="lookup.cancelBooking" /></h2>
                <CancelBookingButton
                  bookingId={booking.id}
                  dailyRate={vehicle?.daily_rate ?? 0}
                  totalDue={booking.total_due}
                  hoursUntilStart={hoursUntilStart}
                />
              </section>
            )}

            {isModifiable && (
              <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 space-y-4">
                <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="lookup.changeDates" /></h2>
                <RequestDateChangeButton
                  bookingId={booking.id}
                  currentStartDate={booking.start_date}
                  currentEndDate={booking.end_date}
                  modificationStatus={booking.modification_status}
                  modificationRequestedStart={booking.modification_requested_start}
                  modificationRequestedEnd={booking.modification_requested_end}
                />
              </section>
            )}
          </>
        )}

        {/* Booking details section */}
        <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] divide-y divide-brand-border">
          <div className="px-6 py-4">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="lookup.bookingDetails" /></h2>
          </div>
          <div className="px-6">
            <DetailRow
              label={<T k="lookup.dates" />}
              value={formatDateRange(booking.start_date, booking.end_date)}
            />
            <DetailRow
              label={<T k="lookup.rateType" />}
              value={<T k={durationTypeKey(booking.duration_type)} />}
            />
            {booking.start_time && (
              <DetailRow
                label={<T k="lookup.pickupTime" />}
                value={booking.start_time}
              />
            )}
            {booking.end_time && (
              <DetailRow
                label={<T k="lookup.dropoffTime" />}
                value={booking.end_time}
              />
            )}
            <DetailRow
              label={<T k="lookup.pickup" />}
              value={<T k={pickupMethodKey(booking.pickup_method)} />}
            />
            {booking.pickup_method === 'delivery' && booking.delivery_address && (
              <DetailRow
                label={<T k="lookup.deliveryAddress" />}
                value={booking.delivery_address}
              />
            )}
            <DetailRow
              label={<T k="lookup.return" />}
              value={<T k={returnMethodKey(booking.return_method)} />}
            />
            {booking.return_method === 'collection' && booking.collection_address && (
              <DetailRow
                label={<T k="lookup.collectionAddress" />}
                value={booking.collection_address}
              />
            )}
          </div>
        </section>

        {/* Pricing breakdown section */}
        <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)]">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="lookup.pricingBreakdown" /></h2>
          </div>
          <div className="px-6 py-2">
            <PricingRow label={<T k="lookup.rentalSubtotal" />} value={<PriceDisplay amount={booking.rental_subtotal} />} />
            {booking.delivery_fee > 0 && (
              <PricingRow label={<T k="lookup.deliveryFee" />} value={<PriceDisplay amount={booking.delivery_fee} />} />
            )}
            {booking.return_fee > 0 && (
              <PricingRow label={<T k="lookup.returnCollectionFee" />} value={<PriceDisplay amount={booking.return_fee} />} />
            )}
            {booking.no_deposit_surcharge > 0 && (
              <PricingRow label={<T k="lookup.noDepositSurcharge" />} value={<PriceDisplay amount={booking.no_deposit_surcharge} />} />
            )}
            <div className="border-t border-brand-border mt-2 pt-2">
              <PricingRow label={<T k="lookup.totalDue" />} value={<PriceDisplay amount={booking.total_due} />} bold />
            </div>
            {booking.deposit_choice === 'deposit' && booking.deposit_amount > 0 && (
              <div className="border-t border-brand-border mt-2 pt-2 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm text-brand-muted"><T k="lookup.securityDeposit" /></span>
                    <p className="text-xs text-brand-muted/60 mt-0.5"><T k="lookup.securityDepositNote" /></p>
                  </div>
                  <PriceDisplay amount={booking.deposit_amount} className="text-sm text-brand-muted" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Payment section */}
        <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)]">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="lookup.payment" /></h2>
          </div>
          <div className="px-6">
            <DetailRow
              label={<T k="lookup.method" />}
              value={<T k={paymentMethodKey(booking.payment_method)} />}
            />
            <DetailRow
              label={<T k="lookup.status" />}
              value={<T k={paymentStatus.labelKey} />}
              valueClassName={paymentStatus.className}
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
                <T k="lookup.completeCrypto" />
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </section>

        {/* Cancellation policy section */}
        <section className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-6 space-y-3">
          <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium"><T k="lookup.cancellationPolicy" /></h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-brand-muted">
              <svg className="w-4 h-4 text-brand-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><T k="lookup.freeCancellation" /></span>
            </li>
            <li className="flex items-start gap-2 text-sm text-brand-muted">
              <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span><T k="lookup.lateCancellation" /></span>
            </li>
          </ul>
        </section>

      </div>
    </main>
  )
}
