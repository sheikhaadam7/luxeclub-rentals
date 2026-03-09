'use client'

import { useRealtimeBooking, type TrackingStatus } from '@/lib/hooks/use-realtime-booking'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingStatusTimelineProps {
  bookingId: string
  initialStatus: string
}

interface Step {
  key: TrackingStatus
  label: string
  icon: React.ReactNode
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

const CheckCircleIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TruckIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h2m6-12h2l3 4v4h-5V4z" />
  </svg>
)

const MapPinIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

// ---------------------------------------------------------------------------
// Status ordering helper
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<string, number> = {
  draft: -0.5,
  pending: 0,
  confirmed: 1,
  car_on_the_way: 2,
  car_delivered: 3,
  completed: 4,
  cancelled: -1,
}

function getStatusIndex(status: string): number {
  return STATUS_ORDER[status] ?? 0
}

// ---------------------------------------------------------------------------
// Timeline steps
// ---------------------------------------------------------------------------

const STEPS: Step[] = [
  { key: 'confirmed', label: 'Rental Confirmed', icon: CheckCircleIcon },
  { key: 'car_on_the_way', label: 'Car On The Way', icon: TruckIcon },
  { key: 'car_delivered', label: 'Car Delivered', icon: MapPinIcon },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BookingStatusTimeline — renders a horizontal (desktop) / vertical (mobile)
 * status timeline showing the rental delivery progression.
 *
 * Updates in real-time via useRealtimeBooking which subscribes to Supabase
 * Realtime postgres_changes on the bookings table.
 *
 * States:
 * - completed: brand cyan, solid connector line
 * - active: brand cyan with pulsing dot indicator
 * - upcoming: brand-muted gray, dashed connector line
 *
 * Special cases:
 * - cancelled: full-width red cancelled banner
 * - completed (rental complete): all steps shown as completed
 */
export default function BookingStatusTimeline({
  bookingId,
  initialStatus,
}: BookingStatusTimelineProps) {
  const { status } = useRealtimeBooking({ bookingId, initialStatus })

  // Cancelled booking — show banner instead of timeline
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-[var(--radius-card)] bg-red-500/10 border border-red-500/30">
        <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-red-400">Booking Cancelled</p>
          <p className="text-xs text-brand-muted mt-0.5">This rental has been cancelled</p>
        </div>
      </div>
    )
  }

  // Completed rental — show all steps as done with message
  if (status === 'completed') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0">
          {STEPS.map((step, index) => (
            <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 flex-1">
              {/* Step icon circle */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center text-green-400">
                {step.icon}
              </div>
              {/* Connector line (not after last step) */}
              {index < STEPS.length - 1 && (
                <div className="h-0.5 sm:h-0 sm:w-full w-px bg-green-400 flex-1 sm:flex-none sm:block hidden sm:flex" />
              )}
              {/* Label */}
              <span className="text-xs text-green-400 sm:text-center">{step.label}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-brand-muted text-center">Rental complete — thank you for choosing LuxeClub</p>
      </div>
    )
  }

  const currentIndex = getStatusIndex(status)

  return (
    <div className="space-y-4">
      {/* Desktop: horizontal timeline */}
      <div className="hidden sm:flex items-center">
        {STEPS.map((step, index) => {
          const stepIndex = getStatusIndex(step.key)
          const isCompleted = currentIndex > stepIndex
          const isActive = currentIndex === stepIndex

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={[
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors',
                    isCompleted
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                      : isActive
                        ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                        : 'bg-brand-surface border-brand-border text-brand-muted',
                  ].join(' ')}
                >
                  {step.icon}
                </div>
                <div className="flex items-center gap-1.5">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                  )}
                  <span
                    className={[
                      'text-xs whitespace-nowrap',
                      isCompleted ? 'text-brand-cyan' : isActive ? 'text-brand-cyan' : 'text-brand-muted',
                    ].join(' ')}
                  >
                    {step.label}
                  </span>
                </div>
              </div>

              {/* Connector line between steps */}
              {index < STEPS.length - 1 && (
                <div
                  className={[
                    'flex-1 h-0.5 mx-3 transition-colors',
                    isCompleted ? 'bg-brand-cyan' : 'border-t border-dashed border-brand-border',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical timeline */}
      <div className="flex sm:hidden flex-col gap-0">
        {STEPS.map((step, index) => {
          const stepIndex = getStatusIndex(step.key)
          const isCompleted = currentIndex > stepIndex
          const isActive = currentIndex === stepIndex

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Vertical connector + node column */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    'w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isCompleted
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                      : isActive
                        ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                        : 'bg-brand-surface border-brand-border text-brand-muted',
                  ].join(' ')}
                >
                  {step.icon}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={[
                      'w-0.5 flex-1 min-h-[24px] my-1 transition-colors',
                      isCompleted ? 'bg-brand-cyan' : 'border-l border-dashed border-brand-border',
                    ].join(' ')}
                  />
                )}
              </div>

              {/* Label column */}
              <div className="flex items-center gap-1.5 pt-2 pb-6 last:pb-0">
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse flex-shrink-0" />
                )}
                <span
                  className={[
                    'text-sm',
                    isCompleted ? 'text-brand-cyan' : isActive ? 'text-brand-cyan' : 'text-brand-muted',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
