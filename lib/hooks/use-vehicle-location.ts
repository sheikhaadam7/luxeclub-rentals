'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseVehicleLocationProps {
  vehicleId: string
  initialLat?: number
  initialLng?: number
}

interface UseVehicleLocationReturn {
  lat: number | null
  lng: number | null
}

/**
 * Subscribes to live vehicle GPS location updates via Supabase Realtime.
 *
 * Listens to postgres_changes on the vehicle_locations table, filtered
 * to the specific vehicle ID. When the GPS ingest API route upserts a
 * new position, the UI receives the updated coordinates in real time.
 *
 * Event handling:
 * - INSERT: Fired on the very first GPS ping (no row existed yet, upsert
 *   creates a new row). Caught by the '*' wildcard event subscription.
 * - UPDATE: Fired on all subsequent pings (upsert on existing PK row).
 *   This is the steady-state event — the GPS API uses onConflict: 'vehicle_id'.
 *
 * Using event: '*' catches both INSERT and UPDATE so the hook works
 * correctly regardless of whether the vehicle has an existing location row.
 *
 * Channel cleanup is handled in the useEffect return to prevent WebSocket
 * leaks on unmount, React Strict Mode double-invocation, and HMR.
 *
 * @param vehicleId - UUID of the vehicle to track
 * @param initialLat - Latitude loaded server-side (prevents initial empty state)
 * @param initialLng - Longitude loaded server-side
 */
export function useVehicleLocation({
  vehicleId,
  initialLat,
  initialLng,
}: UseVehicleLocationProps): UseVehicleLocationReturn {
  const [lat, setLat] = useState<number | null>(initialLat ?? null)
  const [lng, setLng] = useState<number | null>(initialLng ?? null)

  const supabase = createClient()

  useEffect(() => {
    // Use event: '*' to catch both INSERT (first ping) and UPDATE (subsequent pings).
    // The GPS ingest endpoint upserts on vehicle_id PK:
    //   - First write: no existing row → INSERT event
    //   - All subsequent writes: existing row updated → UPDATE event
    const channel = supabase
      .channel(`vehicle-location-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_locations',
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        (payload) => {
          const newRow = payload.new as { lat: number; lng: number } | null
          if (newRow && typeof newRow.lat === 'number' && typeof newRow.lng === 'number') {
            setLat(newRow.lat)
            setLng(newRow.lng)
          }
        }
      )
      .subscribe()

    // Critical: remove channel on cleanup to prevent WebSocket leaks.
    // Supabase Realtime channels accumulate if not removed — each
    // subscription creates a persistent WebSocket listener.
    return () => {
      supabase.removeChannel(channel)
    }
  }, [vehicleId, supabase])

  return { lat, lng }
}
