'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * All booking status values including Phase 4 tracking states.
 * The CHECK constraint in the database matches these values exactly.
 */
export type TrackingStatus =
  | 'pending'
  | 'confirmed'
  | 'car_on_the_way'
  | 'car_delivered'
  | 'completed'
  | 'cancelled'

interface UseRealtimeBookingProps {
  bookingId: string
  initialStatus: string
}

interface UseRealtimeBookingReturn {
  status: TrackingStatus
}

/**
 * Subscribes to live booking status changes via Supabase Realtime.
 *
 * Uses a postgres_changes UPDATE subscription on the bookings table,
 * filtered to the specific booking ID. When admin updates the booking
 * status (e.g., confirmed → car_on_the_way), the UI reflects the change
 * without a page refresh.
 *
 * Channel cleanup is handled in the useEffect return to prevent WebSocket
 * leaks on unmount, React Strict Mode double-invocation, and HMR.
 *
 * @param bookingId - UUID of the booking to watch
 * @param initialStatus - The status loaded server-side (prevents flash of stale state)
 */
export function useRealtimeBooking({
  bookingId,
  initialStatus,
}: UseRealtimeBookingProps): UseRealtimeBookingReturn {
  const [status, setStatus] = useState<TrackingStatus>(
    initialStatus as TrackingStatus
  )

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`booking-status-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as TrackingStatus
          setStatus(newStatus)
        }
      )
      .subscribe()

    // Critical: remove channel on cleanup to prevent WebSocket leaks.
    // Supabase Realtime channels accumulate if not removed — each
    // subscription creates a persistent WebSocket listener.
    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, supabase])

  return { status }
}
