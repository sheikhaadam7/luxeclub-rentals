'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useVehicleLocation } from '@/lib/hooks/use-vehicle-location'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LiveTrackingMapProps {
  vehicleId: string
  deliveryLat: number
  deliveryLng: number
  initialLat?: number
  initialLng?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCarGeoJSON(lat: number | null, lng: number | null): GeoJSON.FeatureCollection {
  if (lat === null || lng === null) {
    return {
      type: 'FeatureCollection',
      features: [],
    }
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {},
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LiveTrackingMap — renders a dark luxury Mapbox GL JS v3 map with a
 * real-time car position marker and a static delivery destination pin.
 *
 * Uses Mapbox Standard style with the night light preset for a luxury
 * dark aesthetic matching the LuxeClub brand.
 *
 * Car position is updated in real-time via the useVehicleLocation hook,
 * which subscribes to Supabase Realtime postgres_changes on vehicle_locations.
 *
 * Map instance is stored in a ref (never useState) to prevent React
 * reconciliation from interfering with the Mapbox GL lifecycle.
 *
 * The CSS import ('mapbox-gl/dist/mapbox-gl.css') is critical — without it
 * the map canvas renders broken/invisible.
 */
export default function LiveTrackingMap({
  vehicleId,
  deliveryLat,
  deliveryLng,
  initialLat,
  initialLng,
}: LiveTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  // Real-time vehicle coordinates from Supabase Realtime
  const { lat, lng } = useVehicleLocation({ vehicleId, initialLat, initialLng })

  // Token guard — render fallback if Mapbox token is not configured
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    return (
      <div
        className="w-full flex items-center justify-center bg-brand-surface border border-brand-border rounded-[--radius-card] text-brand-muted text-sm"
        style={{ height: '400px' }}
      >
        Map unavailable — Mapbox token not configured
      </div>
    )
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [deliveryLng, deliveryLat],
      zoom: 13,
    })

    map.current.on('style.load', () => {
      if (!map.current) return

      // Dark luxury night preset — matches brand aesthetic
      map.current.setConfigProperty('basemap', 'lightPreset', 'night')
      map.current.setConfigProperty('basemap', 'showPointOfInterestLabels', false)

      // Static delivery destination marker — brand cyan
      new mapboxgl.Marker({ color: '#00875A' })
        .setLngLat([deliveryLng, deliveryLat])
        .addTo(map.current)

      // Car GeoJSON source — populated with initial position if available
      map.current.addSource('car', {
        type: 'geojson',
        data: buildCarGeoJSON(initialLat ?? null, initialLng ?? null),
      })

      // Car circle layer — white dot with cyan stroke, emissive for night visibility
      map.current.addLayer({
        id: 'car-marker',
        type: 'circle',
        source: 'car',
        paint: {
          'circle-radius': 10,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#00875A',
          'circle-emissive-strength': 1,
        },
      })
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
    // Map is initialized once on mount — delivery coords are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update car marker position when real-time coordinates arrive
  useEffect(() => {
    if (!map.current || lat === null || lng === null) return

    const source = map.current.getSource('car') as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(buildCarGeoJSON(lat, lng))
      map.current.panTo([lng, lat])
    }
  }, [lat, lng])

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-[--radius-card] overflow-hidden"
      style={{ height: '400px' }}
    />
  )
}
