import Link from 'next/link'
import Image from 'next/image'
import { getUserBookings, type UserBooking } from '@/app/actions/bookings'
import { PriceDisplay } from '@/components/catalogue/PriceDisplay'
import { T } from '@/components/ui/T'

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

function durationTypeKey(type: string): string {
  if (type === 'daily') return 'lookup.daily'
  if (type === 'weekly') return 'lookup.weekly'
  if (type === 'monthly') return 'lookup.monthly'
  return type
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

type StatusConfig = {
  labelKey: string
  className: string
}

function getStatusConfig(status: string, paymentStatus: string): StatusConfig {
  // Payment status takes priority for pending_cash
  if (paymentStatus === 'pending_cash') {
    return { labelKey: 'lookup.cashPending', className: 'bg-amber-900/40 text-amber-400 border-amber-700/40' }
  }
  switch (status) {
    case 'confirmed':
      return { labelKey: 'lookup.confirmed', className: 'bg-cyan-900/40 text-brand-cyan border-brand-cyan/30' }
    case 'pending':
      return { labelKey: 'lookup.pendingConfirmation', className: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40' }
    case 'completed':
      return { labelKey: 'lookup.completed', className: 'bg-green-900/40 text-green-400 border-green-700/40' }
    case 'cancelled':
      return { labelKey: 'lookup.cancelled', className: 'bg-red-900/40 text-red-400 border-red-700/40' }
    default:
      return { labelKey: status, className: 'bg-white/5 text-brand-muted border-white/10' }
  }
}

// ---------------------------------------------------------------------------
// Section split
// ---------------------------------------------------------------------------

function isUpcoming(booking: UserBooking): boolean {
  if (booking.status === 'cancelled' || booking.status === 'completed') return false
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const startDate = new Date(booking.start_date + 'T00:00:00Z')
  return startDate >= today
}

// ---------------------------------------------------------------------------
// Booking card
// ---------------------------------------------------------------------------

function BookingCard({ booking }: { booking: UserBooking }) {
  const vehicle = booking.vehicles
  const statusConfig = getStatusConfig(booking.status, booking.payment_status)
  const durationKey = durationTypeKey(booking.duration_type)

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="flex items-center gap-4 bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-4 card-hover hover:border-brand-border-hover group"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-[80px] h-[60px] rounded-xl overflow-hidden bg-white/5 relative">
        {vehicle?.primary_image_url ? (
          <Image
            src={vehicle.primary_image_url}
            alt={vehicle.name ?? 'Vehicle'}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-muted">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-medium text-white group-hover:text-brand-cyan transition-colors truncate">
          {vehicle?.name ?? <T k="bookings.unknownVehicle" />}
        </p>
        <p className="text-xs text-brand-muted mt-0.5">
          {formatDateRange(booking.start_date, booking.end_date)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {/* Duration badge */}
          <span className="text-[10px] text-brand-muted border border-brand-border rounded px-1.5 py-0.5 uppercase tracking-wider">
            <T k={durationKey} />
          </span>
          {/* Status badge */}
          <span className={`text-[10px] border rounded px-1.5 py-0.5 uppercase tracking-wider ${statusConfig.className}`}>
            <T k={statusConfig.labelKey} />
          </span>
        </div>
      </div>

      {/* Price + arrow */}
      <div className="flex-shrink-0 text-right">
        <PriceDisplay amount={booking.total_due} className="text-sm font-medium text-white" />
        <svg
          className="w-4 h-4 text-brand-cyan mt-1 ml-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BookingsPage() {
  const result = await getUserBookings()

  // Error state
  if ('error' in result) {
    return (
      <main className="min-h-screen bg-luxury flex items-center justify-center">
        <p className="text-brand-muted text-sm">{result.error}</p>
      </main>
    )
  }

  const bookings = result
  const upcoming = bookings.filter(isUpcoming)
  const past = bookings.filter((b) => !isUpcoming(b))

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs text-brand-muted uppercase tracking-widest"><T k="bookings.account" /></p>
          <h1 className="font-display text-3xl font-semibold text-white"><T k="bookings.myBookings" /></h1>
        </div>

        {/* Empty state */}
        {bookings.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-surface border border-brand-border flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium"><T k="bookings.noBookingsYet" /></p>
              <p className="text-sm text-brand-muted max-w-xs mx-auto">
                <T k="bookings.browseCollection" />
              </p>
            </div>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
            >
              <T k="bookings.exploreVehicles" />
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Upcoming bookings */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">
              <T k="bookings.upcoming" />
            </h2>
            <div className="space-y-2">
              {upcoming.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        )}

        {/* Past bookings */}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs text-brand-muted uppercase tracking-widest font-medium">
              <T k="bookings.past" />
            </h2>
            <div className="space-y-2 opacity-70">
              {past.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        )}

        {/* Back to dashboard */}
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <T k="bookings.backToDashboard" />
          </Link>
        </div>

      </div>
    </main>
  )
}
