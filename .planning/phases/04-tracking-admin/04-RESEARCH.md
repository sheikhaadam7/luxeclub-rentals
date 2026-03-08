# Phase 4: Tracking + Admin — Research

**Researched:** 2026-02-20
**Domain:** Real-time GPS tracking (Mapbox GL JS v3 + Supabase Realtime), admin dashboard (fleet, bookings, KYC, payments, analytics)
**Confidence:** MEDIUM-HIGH — Supabase Realtime and Mapbox GL JS v3 patterns HIGH via official docs; GPS hardware integration MEDIUM (vendor-agnostic pattern, specific hardware not selected); admin analytics queries MEDIUM (pattern clear, exact schema columns verified from prior phases)

---

## Summary

Phase 4 has two distinct sub-domains that must be planned and built separately: (1) real-time customer-facing tracking — a live Mapbox map that updates a car marker as it moves toward the customer, driven by Supabase Realtime postgres_changes subscriptions on the `bookings` table for status and a separate `vehicle_locations` table for GPS coordinates; and (2) an admin dashboard — a multi-tab Server Component page that replaces and extends the existing `/admin` page with fleet management, booking pipeline, KYC review, payment confirmation, and analytics.

The tracking architecture has one major upstream dependency: a GPS hardware device must be installed in each car and must be able to push location data to a Next.js API route endpoint (via HTTP POST callback/webhook). Without this hardware decision, the ingest API route can be built and tested with mock data, but end-to-end live tracking cannot be validated. The GPS tracker market is dominated by OBD-II plug-in devices (Teltonika, Concox, Coban, Queclink) that support HTTP callback URLs — the ingest pattern is standard regardless of hardware vendor.

For the admin dashboard, everything can be built entirely within existing schema: Phase 3's migration already added `payment_status`, `deposit_status`, `kyc_status` columns, and `supabase_realtime` publication on `bookings`. The admin page needs a complete rebuild from its current single-purpose "Fleet Management" scraper monitor into a multi-tab operations center. The key implementation pattern is URL search params for tab state, Server Components for each tab's data fetch, and `useTransition`-backed client components for mutations — consistent with the existing `VehicleOverrideForm` pattern already in the project.

**Primary recommendation:** Use `postgres_changes` Supabase Realtime subscription on `bookings` for booking status updates (already enabled); add a `vehicle_locations` table for GPS coordinate storage; ingest GPS data via a Next.js `app/api/gps/route.ts` API route that writes to `vehicle_locations` and triggers Realtime; use `map.getSource().setData()` on a Mapbox GeoJSON source to move the car marker; build the admin dashboard as a tabbed Server Component page at `/admin` using URL `?tab=` search params.

---

## Prior Decisions (from phase context — no CONTEXT.md exists)

The following are locked decisions extracted from the phase's `additional_context`:

### Locked Decisions
- No driver app for v1: all cars from Downtown Dubai office
- GPS tracker hardware vendor not yet selected — needed before Phase 4 full validation
- Admin role via `profiles.role` column, admin page gated by `getClaims()` + role check
- Existing admin page exists from Phase 2 (staleness alerts, vehicle overrides) — must be preserved or integrated
- Supabase Realtime already enabled on bookings table (`ALTER PUBLICATION supabase_realtime ADD TABLE bookings`)
- Mapbox already installed (`mapbox-gl ^3.x`, `@mapbox/search-js-react ^1.x`) from Phase 3
- Booking status field exists on `bookings` table (values: `pending`, `confirmed`, `completed`, `cancelled`)
- Dark luxury theme: black background, cyan accents (`#09f`), Playfair Display + Inter fonts
- Tailwind v4 `@theme` block for design tokens
- Next.js 16 App Router with Server Components + Server Actions
- Supabase for database, auth, storage
- `getClaims()` for server-side auth, admin check via `profiles.role`

### Booking Status Values (Phase 4 adds new values)
The current `bookings.status` CHECK constraint allows: `pending`, `confirmed`, `completed`, `cancelled`. Phase 4 requires two new values: `car_on_the_way` and `car_delivered`. A migration must ALTER the CHECK constraint to add these.

### Claude's Discretion
- GPS ingest API authentication method (shared secret header vs IP allowlist)
- Vehicle locations table schema and retention policy
- Admin dashboard tab structure and ordering
- Analytics query scope (summary cards vs charts)
- Whether to use postgres_changes or broadcast for real-time updates

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mapbox-gl` | ^3.18.1 (installed) | Map rendering, GeoJSON sources, marker animation | Already installed; v3 is current; WebGL 2, backwards-compatible |
| `@supabase/supabase-js` | ^2.97.0 (installed) | `createClient().channel()` for Realtime subscriptions | Already installed; same client used throughout |
| `@supabase/ssr` | ^0.8.0 (installed) | Browser client for Realtime in client components | Already installed |

### Supporting (no new installs needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` | ^7.71.1 (installed) | Admin vehicle edit forms, pricing forms | Already installed; use for any admin mutation forms |
| `zod` | ^4.3.6 (installed) | Validate GPS ingest payload from hardware | Already installed; use in the GPS ingest API route |
| `date-fns` | ^4.1.0 (installed) | Analytics date formatting, date range aggregations | Already installed |

### New Libraries Needed

None. All required libraries are already installed. Phase 4 is purely additive — new pages, API routes, components, and database tables using the existing stack.

**No npm install required.**

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `mapbox-gl` direct | `react-map-gl` (Mapbox React wrapper) | react-map-gl adds React-friendly `<Map>`, `<Marker>`, `<Source>`, `<Layer>` — reduces boilerplate. However, mapbox-gl is already installed and in use; adding react-map-gl just adds bundle size for a tracking view that will have a single Map instance. Stick with direct mapbox-gl. |
| Supabase postgres_changes | Supabase broadcast + DB trigger | broadcast scales better for high-frequency GPS updates, but for this use case (admin pushes status, GPS device pushes location at ~30s intervals), postgres_changes on bookings is sufficient. Use postgres_changes for booking status; consider broadcast for vehicle_locations only if polling is too frequent. |
| Custom analytics SQL | Supabase RPC functions | RPCs allow complex aggregations but add schema complexity. For Phase 4 analytics (totals, counts, revenue), direct `.from('bookings').select()` with aggregation in the Server Action is cleaner and sufficient. |

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (protected)/
│   ├── bookings/
│   │   └── [bookingId]/
│   │       └── page.tsx          # EXTEND: Add live tracking map section when status = car_on_the_way
│   └── admin/
│       └── page.tsx              # REBUILD: Tabbed admin operations center
│
├── api/
│   └── gps/
│       └── route.ts              # NEW: GPS hardware ingest endpoint (POST)
│
components/
├── tracking/
│   └── LiveTrackingMap.tsx       # 'use client' — Mapbox map with real-time car marker
├── admin/
│   ├── VehicleOverrideForm.tsx   # EXISTING — keep as-is
│   ├── AdminTabs.tsx             # NEW 'use client' — tab navigation via URL search params
│   ├── FleetTab.tsx              # NEW — vehicle CRUD (add/edit/deactivate/pricing)
│   ├── BookingsTab.tsx           # NEW — all bookings with status pipeline controls
│   ├── KYCTab.tsx                # NEW — pending verifications, approve/reject
│   ├── PaymentsTab.tsx           # NEW — payment status, cash/bank confirm
│   └── AnalyticsTab.tsx          # NEW — summary cards: bookings, revenue, utilization
│
app/actions/
├── admin.ts                      # EXTEND: Add fleet CRUD, booking management, KYC review, payment confirm, analytics query
├── gps.ts                        # NEW: updateVehicleLocation (called from API route)
│
supabase/migrations/
└── 20260220300000_tracking_admin_phase4.sql   # NEW: vehicle_locations table, extend booking status CHECK
```

---

### Pattern 1: Booking Status Realtime Subscription (postgres_changes)

**What:** The customer's booking detail page subscribes to `bookings` table UPDATE events filtered to the specific booking ID. When admin changes the status (e.g., from `confirmed` to `car_on_the_way`), the Realtime event fires and the UI updates without page refresh.

**When to use:** TRACK-02 — status transitions visible to customer in real time.

**Key fact:** `bookings` table is already added to `supabase_realtime` publication. RLS `UPDATE` events are filtered server-side — the user sees only their own booking changes because the subscription filter `id=eq.${bookingId}` limits to one row, and RLS policy `"Users can view own bookings"` validates the subscriber.

```typescript
// Source: supabase.com/docs/guides/realtime/postgres-changes (official docs, 2025)
// components/tracking/BookingStatusListener.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TrackingStatus = 'confirmed' | 'car_on_the_way' | 'car_delivered' | 'completed' | 'cancelled'

export function BookingStatusListener({
  bookingId,
  initialStatus,
}: {
  bookingId: string
  initialStatus: TrackingStatus
}) {
  const [status, setStatus] = useState<TrackingStatus>(initialStatus)
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, supabase])

  // Status indicator UI
  const statusConfig: Record<TrackingStatus, { label: string; className: string }> = {
    confirmed: { label: 'Rental Confirmed', className: 'text-brand-cyan' },
    car_on_the_way: { label: 'Car On The Way', className: 'text-amber-400' },
    car_delivered: { label: 'Car Delivered', className: 'text-green-400' },
    completed: { label: 'Completed', className: 'text-green-400' },
    cancelled: { label: 'Cancelled', className: 'text-red-400' },
  }

  const config = statusConfig[status] ?? { label: status, className: 'text-brand-muted' }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${config.className}`}>{config.label}</span>
      {status === 'car_on_the_way' && (
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
    </div>
  )
}
```

---

### Pattern 2: Live Car Location Map (Mapbox GL JS v3)

**What:** A client component renders a Mapbox map initialized with `useRef` + `useEffect` (SSR incompatible — must be client-only). The car's position is stored as a GeoJSON source on the map. When a new GPS coordinate arrives (via `postgres_changes` on `vehicle_locations`), the source data is updated with `map.getSource('car').setData(newGeoJSON)`. Mapbox re-renders the marker position automatically — no manual animation needed.

**When to use:** TRACK-01, TRACK-03 — live map during delivery and throughout rental period.

**Critical:** Mapbox GL JS cannot render server-side. The component must be `'use client'` and the map container must use `useRef<HTMLDivElement>`. The map instance must also be stored in a `useRef<mapboxgl.Map>` to avoid recreation on re-render.

**Dark style:** Use `mapbox://styles/mapbox/standard` with `map.setConfigProperty('basemap', 'lightPreset', 'night')` in `style.load` callback. This matches the brand aesthetic (very dark, near-black map). Do not use `dark-v11` — it still works in v3 but won't receive updates; Standard with night preset is the current recommendation.

```typescript
// Source: docs.mapbox.com/mapbox-gl-js/example/live-update-feature/ (official, 2025)
// components/tracking/LiveTrackingMap.tsx
'use client'
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createClient } from '@/lib/supabase/client'

interface LiveTrackingMapProps {
  bookingId: string
  vehicleId: string
  deliveryLat: number
  deliveryLng: number
  initialLat?: number
  initialLng?: number
}

export function LiveTrackingMap({
  bookingId,
  vehicleId,
  deliveryLat,
  deliveryLng,
  initialLat,
  initialLng,
}: LiveTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [initialLng ?? deliveryLng, initialLat ?? deliveryLat],
      zoom: 13,
    })

    map.current.on('style.load', () => {
      // Set dark/night luxury theme
      map.current!.setConfigProperty('basemap', 'lightPreset', 'night')
      map.current!.setConfigProperty('basemap', 'showPointOfInterestLabels', false)

      // Delivery destination marker (static pin)
      new mapboxgl.Marker({ color: '#0099ff' })
        .setLngLat([deliveryLng, deliveryLat])
        .addTo(map.current!)

      // Car position GeoJSON source (dynamic)
      const carGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: initialLat && initialLng
          ? [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [initialLng, initialLat] },
              properties: {},
            }]
          : [],
      }

      map.current!.addSource('car', { type: 'geojson', data: carGeoJSON })
      map.current!.addLayer({
        id: 'car-marker',
        type: 'circle',
        source: 'car',
        paint: {
          'circle-radius': 10,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0099ff',
          'circle-emissive-strength': 1, // Visible in night preset
        },
      })
    })

    // Subscribe to vehicle_locations for this booking's vehicle
    const channel = supabase
      .channel(`vehicle-location-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_locations',
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        (payload) => {
          const { lat, lng } = payload.new as { lat: number; lng: number }
          const source = map.current?.getSource('car') as mapboxgl.GeoJSONSource | undefined
          if (source) {
            source.setData({
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: {},
              }],
            })
            map.current?.panTo([lng, lat])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      map.current?.remove()
    }
  }, [vehicleId, deliveryLat, deliveryLng, initialLat, initialLng, supabase])

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-[--radius-card] overflow-hidden"
      style={{ height: '400px' }}
    />
  )
}
```

---

### Pattern 3: GPS Hardware Ingest API Route

**What:** A Next.js API route that receives HTTP POST callbacks from the GPS tracker device. The device pushes its coordinates to `https://yourapp.com/api/gps` at a configured interval (typically 10–60 seconds while moving). The route validates a shared secret header, writes to `vehicle_locations`, and the Supabase Realtime postgres_changes subscription on the client picks up the INSERT automatically.

**When to use:** The GPS ingest layer. This is the bridge between physical hardware and the database.

**GPS hardware reality:** Most commercial GPS trackers (Teltonika FMB series, Concox, Coban, Queclink) support a configurable "HTTP server" or "callback URL" in their management software. The device makes an HTTP POST with a JSON body (or query parameters) containing device ID, latitude, longitude, speed, timestamp. The exact payload format differs per vendor — the API route must be flexible or vendor-specific.

**Authentication:** Use a shared secret header (e.g., `X-GPS-Secret: <secret>`) validated server-side. IP allowlisting is an alternative but harder to manage with cellular modems.

```typescript
// Source: Supabase docs + Next.js App Router API route pattern
// app/api/gps/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const LocationSchema = z.object({
  device_id: z.string(),       // GPS tracker's unique ID (maps to vehicle)
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed_kmh: z.number().optional(),
  heading: z.number().optional(),
  timestamp: z.string().optional(), // ISO8601 or epoch — from device
})

export async function POST(req: NextRequest) {
  // Validate shared secret
  const secret = req.headers.get('x-gps-secret')
  if (secret !== process.env.GPS_INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = LocationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', details: result.error.flatten() }, { status: 422 })
  }

  const { device_id, lat, lng, speed_kmh, heading, timestamp } = result.data

  // Look up vehicle by GPS device_id
  const admin = createAdminClient()
  const { data: vehicle, error: vErr } = await admin
    .from('vehicles')
    .select('id')
    .eq('gps_device_id', device_id)
    .single()

  if (vErr || !vehicle) {
    // Unknown device — log and return 200 to avoid device retrying
    console.warn('[GPS] Unknown device_id:', device_id)
    return NextResponse.json({ ok: true, warning: 'Unknown device' })
  }

  // Insert location row — triggers Realtime postgres_changes INSERT on vehicle_locations
  const { error } = await admin
    .from('vehicle_locations')
    .insert({
      vehicle_id: vehicle.id,
      lat,
      lng,
      speed_kmh: speed_kmh ?? null,
      heading: heading ?? null,
      recorded_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
    })

  if (error) {
    console.error('[GPS] Insert error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

---

### Pattern 4: Admin Dashboard with URL Tab Navigation

**What:** The admin page at `/admin` uses a URL search param `?tab=fleet|bookings|kyc|payments|analytics` to track the active tab. The Server Component reads `searchParams.tab` and conditionally renders the appropriate tab content. Tab switching uses `<Link>` or `router.push()` — no client state needed for tab selection. Each tab fetches its own data in a Server Action called from the Server Component.

**When to use:** ADMIN-01 through ADMIN-06 — the entire admin operations center.

**Key insight:** URL-based tab state means each tab URL is bookmarkable, the browser back button works, and the admin can link directly to a specific tab. This is the Next.js-idiomatic approach as of 2025.

```typescript
// Source: nextjs.org/docs/app/api-reference/functions/use-search-params (official)
// app/(protected)/admin/page.tsx (simplified structure)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { FleetTab } from '@/components/admin/FleetTab'
import { BookingsTab } from '@/components/admin/BookingsTab'
import { KYCTab } from '@/components/admin/KYCTab'
import { PaymentsTab } from '@/components/admin/PaymentsTab'
import { AnalyticsTab } from '@/components/admin/AnalyticsTab'

type TabId = 'fleet' | 'bookings' | 'kyc' | 'payments' | 'analytics'
const VALID_TABS: TabId[] = ['fleet', 'bookings', 'kyc', 'payments', 'analytics']

interface AdminPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', claimsData.claims.sub)
    .single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { tab: rawTab } = await searchParams
  const activeTab: TabId = VALID_TABS.includes(rawTab as TabId) ? (rawTab as TabId) : 'fleet'

  return (
    <main className="min-h-screen bg-luxury">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-white tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-brand-muted text-sm mt-1">
            Fleet, bookings, identity, payments, and analytics
          </p>
        </div>

        {/* Tab navigation — client component for active styling */}
        <AdminTabs activeTab={activeTab} />

        {/* Tab content — Server Component renders data for active tab */}
        {activeTab === 'fleet' && <FleetTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'kyc' && <KYCTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </main>
  )
}
```

```typescript
// components/admin/AdminTabs.tsx
'use client'
import Link from 'next/link'

const TABS = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'kyc', label: 'Identity' },
  { id: 'payments', label: 'Payments' },
  { id: 'analytics', label: 'Analytics' },
] as const

export function AdminTabs({ activeTab }: { activeTab: string }) {
  return (
    <nav className="flex gap-1 border-b border-brand-border">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/admin?tab=${tab.id}`}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? 'border-brand-cyan text-brand-cyan'
              : 'border-transparent text-brand-muted hover:text-white'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
```

---

### Pattern 5: Admin Booking Status Pipeline (Server Action + useTransition)

**What:** Each booking in the Bookings tab has a status dropdown. The admin selects a new status and clicks "Update". A Server Action updates the booking status in Supabase. Because `bookings` is in `supabase_realtime`, the customer's open booking page receives the status update via Realtime automatically — no additional broadcast needed.

**When to use:** ADMIN-03, TRACK-02.

```typescript
// app/actions/admin.ts (addition)
'use server'
import { createAdminClient } from '@/lib/supabase/admin'

type BookingStatus = 'pending' | 'confirmed' | 'car_on_the_way' | 'car_delivered' | 'completed' | 'cancelled'

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()  // existing helper
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) return { error: error.message }
  return { error: null }
}
```

---

### Pattern 6: Analytics Queries (Server Action aggregation)

**What:** The Analytics tab makes direct Supabase queries with aggregation. No separate analytics library needed — Postgres GROUP BY through the Supabase client's `.select()` with aggregate functions, or raw `.rpc()` calls for complex aggregations.

**When to use:** ADMIN-06 — bookings count, revenue, fleet utilization summary.

```typescript
// app/actions/admin.ts (addition)
export async function getAnalyticsSummary() {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Total bookings + revenue (this month)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthlyStats } = await admin
    .from('bookings')
    .select('total_due, status')
    .gte('created_at', startOfMonth.toISOString())
    .in('status', ['confirmed', 'car_on_the_way', 'car_delivered', 'completed'])

  const totalRevenue = monthlyStats?.reduce((sum, b) => sum + (b.total_due ?? 0), 0) ?? 0
  const totalBookings = monthlyStats?.length ?? 0

  // Fleet utilization: vehicles with active bookings today
  const today = new Date().toISOString().split('T')[0]
  const { data: activeBookings } = await admin
    .from('bookings')
    .select('vehicle_id')
    .lte('start_date', today)
    .gte('end_date', today)
    .in('status', ['confirmed', 'car_on_the_way', 'car_delivered'])

  const { count: totalVehicles } = await admin
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', true)

  const utilizedCount = new Set(activeBookings?.map(b => b.vehicle_id)).size

  return {
    thisMonth: { revenue: totalRevenue, bookings: totalBookings },
    fleet: {
      total: totalVehicles ?? 0,
      utilized: utilizedCount,
      utilizationRate: totalVehicles ? Math.round((utilizedCount / totalVehicles) * 100) : 0,
    },
  }
}
```

---

### Anti-Patterns to Avoid

- **Rendering `mapboxgl.Map` in a Server Component:** Mapbox GL JS accesses `window` and `document` at import time. Always use `'use client'` and `useEffect` for map initialization. Never call `dynamic(() => import('mapbox-gl'), { ssr: false })` from a Server Component — use it only when a component is already client-side and needs conditional loading.
- **Storing map instance in React state:** Map instances are mutable and not serializable. Always use `useRef<mapboxgl.Map>` — not `useState`. Storing in state causes full re-initialization on every render.
- **Calling `map.addSource` or `map.addLayer` before `map.on('style.load')`:** In Mapbox GL JS v3, style loading is async. Sources and layers added before the style is loaded will throw. Always gate them inside `map.on('style.load', () => { ... })`.
- **Not removing the channel in useEffect cleanup:** Every Supabase Realtime channel that is subscribed must be cleaned up with `supabase.removeChannel(channel)` in the useEffect return function. Failing to do this causes websocket connection leaks and duplicate event handlers on fast refreshes.
- **Updating booking status CHECK constraint in-place without migration:** The `bookings.status` CHECK currently allows `pending | confirmed | completed | cancelled`. Adding `car_on_the_way` and `car_delivered` requires a migration. Cannot be done by just updating application code — will throw database constraint violation.
- **Admin Server Actions without role validation:** Every admin Server Action must call `verifyAdmin()` before any data operation. Never assume role from the UI state — always re-verify server-side.
- **Fetching all bookings for analytics:** For revenue/utilization analytics, fetch only required columns with date filters. Fetching full booking rows with JOINs for analytics is wasteful. Use `.select('total_due, status')` not `.select('*')`.
- **Using `postgres_changes` for high-frequency GPS updates (> 1 update/second):** Per Supabase docs, postgres_changes does not scale as well as broadcast for high-frequency updates. For GPS at 10–60 second intervals, postgres_changes is fine. If hardware sends sub-second updates, switch to the broadcast approach (insert to DB + broadcast separately).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time marker animation | requestAnimationFrame loop interpolating coordinates | `map.getSource('car').setData(newGeoJSON)` | Mapbox re-renders automatically on `setData()` — no animation loop needed. Interpolation adds complexity without meaningful UX benefit at 30-60s GPS intervals. |
| WebSocket server for GPS push | Custom WebSocket server | Supabase Realtime postgres_changes | Supabase Realtime is already in the stack. A custom WS server adds infra ops burden for no gain. |
| Admin role management UI | Custom role assignment flow | Direct DB update via admin client + existing `profiles.role` | Role management is a single-field update. Over-engineering with a UI flow is premature for v1 with 1 admin. |
| GPS coordinate history graph | D3.js chart | Simple stats summary with AED numbers | Analytics v1 needs numbers (revenue AED, booking count, utilization %). Charts add complexity for marginal admin value at this stage. |
| Custom auth check middleware for admin routes | Route-level middleware role check | `verifyAdmin()` Server Action helper + redirect in page | Admin route is a single page. Middleware for one route is over-engineering. Keep the existing pattern: getClaims + profiles.role check at the top of the Server Component. |
| GPS device management UI | Full device registry with map | `gps_device_id` column on vehicles table | For v1 with a single office, the admin just needs to know which device ID maps to which vehicle. A simple column is sufficient. |

**Key insight:** The real-time map and admin dashboard appear complex but are largely assembly work using already-installed libraries. The only genuinely new integration is the GPS hardware ingest API route, and even that is a simple POST handler.

---

## Common Pitfalls

### Pitfall 1: Booking Status CHECK Constraint Must Be Migrated

**What goes wrong:** A Server Action tries to set `status = 'car_on_the_way'` on a booking. Supabase returns a constraint violation error. The booking status never updates. The customer's map never shows the "Car On The Way" state.

**Why it happens:** The Phase 2 migration created the `bookings` table with `CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))`. Phase 4 needs two new values. The check constraint is enforced by Postgres — no amount of application code can bypass it.

**How to avoid:** The Phase 4 migration must drop and re-add the CHECK constraint:
```sql
-- supabase/migrations/20260220300000_tracking_admin_phase4.sql
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'car_on_the_way', 'car_delivered', 'completed', 'cancelled'));
```

**Warning signs:** Supabase update returns `{ code: '23514', message: 'new row for relation "bookings" violates check constraint "bookings_status_check"' }`.

---

### Pitfall 2: Mapbox CSS Import Missing in Client Component

**What goes wrong:** The map renders but has no controls, broken attribution, or incorrect layout. The map container collapses to zero height.

**Why it happens:** Mapbox GL JS requires its CSS (`mapbox-gl/dist/mapbox-gl.css`) to be imported for the UI to render correctly. In a Next.js App Router client component, CSS imports must be in the component file itself or in `globals.css`.

**How to avoid:** Import CSS directly in the `LiveTrackingMap.tsx` client component:
```typescript
import 'mapbox-gl/dist/mapbox-gl.css'
```
Also ensure the map container div has an explicit height (e.g., `style={{ height: '400px' }}`). Mapbox will not render in a zero-height container.

**Warning signs:** Map tile backgrounds visible but UI chrome (zoom controls, attribution) missing or misplaced; map height is 0px in DevTools.

---

### Pitfall 3: Supabase Realtime Channel Leak on React Fast Refresh

**What goes wrong:** During development, the booking status or GPS location stops updating after the first hot module reload (HMR). Or, in production, users who leave the tracking page open for a long time accumulate duplicate subscriptions.

**Why it happens:** Each `useEffect` creates a new Supabase Realtime channel. If the cleanup function does not call `supabase.removeChannel(channel)`, the old channel stays subscribed while the new one is created. In dev with React Strict Mode and HMR, effects run twice.

**How to avoid:** Always return a cleanup function from `useEffect`:
```typescript
useEffect(() => {
  const channel = supabase.channel(...).on(...).subscribe()
  return () => {
    supabase.removeChannel(channel)  // CRITICAL: prevents channel leaks
  }
}, [bookingId, supabase])
```

**Warning signs:** Console logs showing multiple Realtime payloads per update; duplicate UI state changes; Supabase dashboard showing escalating channel count.

---

### Pitfall 4: GPS Ingest Route Has No Authentication

**What goes wrong:** The GPS ingest route at `/api/gps` is publicly accessible. An attacker sends fake GPS coordinates for any vehicle, moving cars to arbitrary locations on the customer's map.

**Why it happens:** Next.js API routes are public by default. The middleware only checks for authenticated user sessions — not applicable to a device-to-server endpoint.

**How to avoid:**
1. Add a shared secret header check: `x-gps-secret: <secret>` validated server-side against `process.env.GPS_INGEST_SECRET`
2. Store the secret only in the server environment (Vercel environment variables)
3. Configure the GPS hardware management platform to send this header with every callback
4. Return HTTP 200 even for unknown device IDs (to prevent the hardware from retrying indefinitely)

**Warning signs:** Customer sees car moving erratically on map without any actual booking in progress.

---

### Pitfall 5: Admin Actions Lack Row-Level Ownership Validation for KYC/Payments

**What goes wrong:** Admin Server Actions for approving KYC or confirming payment do not re-validate that the record being modified is in the correct pending state. A race condition or double-click causes a verification to be approved twice, or a payment to be confirmed when it was already refunded.

**Why it happens:** Server Actions are called by client components. Users (including admins) can trigger the same action multiple times if the UI doesn't disable the button fast enough.

**How to avoid:** Use optimistic state locking in the database:
```sql
-- Only update if still in pending state
UPDATE profiles
SET kyc_status = 'verified', kyc_verified_at = NOW()
WHERE id = $1 AND kyc_status = 'pending';
-- Check affected rows count — if 0, it was already processed
```
In Supabase, check `data` length after update:
```typescript
const { data, error } = await admin
  .from('profiles')
  .update({ kyc_status: 'verified' })
  .eq('id', userId)
  .eq('kyc_status', 'pending')  // Optimistic lock
  .select()

if (!data?.length) return { error: 'Already processed or not pending' }
```

**Warning signs:** Admin dashboard showing inconsistent states; Veriff webhook and admin approval both trying to set the same profile to `verified`.

---

### Pitfall 6: vehicle_locations Table Grows Unboundedly

**What goes wrong:** Every GPS ping (e.g., every 30 seconds per active vehicle) inserts a row into `vehicle_locations`. After 3 months of 5 vehicles reporting every 30 seconds, this is 43,200 rows/day × 90 days = ~3.9 million rows. Queries slow down; storage costs escalate.

**Why it happens:** GPS location history is retained indefinitely without a retention policy.

**How to avoid:** For v1, implement one of these strategies:
1. **Upsert instead of insert:** Use `UPSERT` on a `(vehicle_id)` unique constraint to keep only the LATEST location per vehicle. No history at all — just current position. This is sufficient for TRACK-01/03 (showing current location, not a path).
2. **Retention via cron:** Add a Supabase scheduled function or Edge Function that deletes `vehicle_locations` rows older than 24 hours.
3. **Separate tracking vs history:** Keep `vehicle_locations` as current-only (upsert), add a `vehicle_location_history` table for archiving if path replay is ever needed.

For Phase 4 (no path replay requirement), recommend upsert-only with a `(vehicle_id)` unique constraint.

**Warning signs:** `vehicle_locations` table growing faster than expected; Supabase database size warning.

---

### Pitfall 7: Admin Tab Content Flash on Navigation

**What goes wrong:** Switching tabs causes a visible content flash — the page briefly shows empty content or a loading skeleton before the Server Component re-renders with new tab data.

**Why it happens:** Tab switching navigates to `?tab=bookings`, causing a server-side re-render. In Next.js App Router, this is a full server round-trip for the page segment unless the tab content is in a separate Suspense boundary.

**How to avoid:** Wrap each tab content in `<Suspense>` with a skeleton fallback:
```tsx
{activeTab === 'bookings' && (
  <Suspense fallback={<BookingsTabSkeleton />}>
    <BookingsTab />
  </Suspense>
)}
```
This allows Next.js to stream the shell immediately and hydrate the tab content when the data fetch resolves. The page header and tab navigation render instantly; only the tab body is streamed.

**Warning signs:** Entire page flashes white when switching tabs; tab navigation feels slow despite fast server responses.

---

## Code Examples

### Database Migration: Phase 4 Schema

```sql
-- supabase/migrations/20260220300000_tracking_admin_phase4.sql

-- 1. Extend booking status CHECK to include tracking states
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'car_on_the_way',   -- NEW: car dispatched from office
    'car_delivered',    -- NEW: car handed to customer
    'completed',
    'cancelled'
  ));

-- 2. Add GPS device ID to vehicles (maps hardware device to vehicle)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS gps_device_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2);  -- vehicle's standard deposit

-- 3. Vehicle locations table — upsert-only (current location only)
CREATE TABLE IF NOT EXISTS vehicle_locations (
  vehicle_id   UUID PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  speed_kmh    NUMERIC(6, 2),
  heading      NUMERIC(5, 2),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read any vehicle location (needed for tracking page)
CREATE POLICY "Authenticated users can view vehicle locations"
  ON vehicle_locations FOR SELECT TO authenticated USING (true);

-- Only service role can write (GPS ingest API uses admin client)
-- No INSERT/UPDATE policy needed — admin client bypasses RLS

-- 4. Enable Realtime on vehicle_locations for live map updates
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_locations;

-- 5. Add pricing columns to vehicles if not already present
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  -- Note: is_available already exists from Phase 2 (scraper-managed)
  -- is_active is admin-managed (deactivate = permanently remove from catalogue)

-- 6. Extend profiles with KYC fields (if not already added in Phase 3)
-- (Phase 3 RESEARCH included these — skip if already present in 20260220200000 migration)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'none'
    CHECK (kyc_status IN ('none', 'submitted', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS kyc_session_id TEXT,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;
```

---

### GPS Ingest: Upsert Location

```typescript
// In app/api/gps/route.ts — replace INSERT with UPSERT for current-location-only model
const { error } = await admin
  .from('vehicle_locations')
  .upsert(
    {
      vehicle_id: vehicle.id,
      lat,
      lng,
      speed_kmh: speed_kmh ?? null,
      heading: heading ?? null,
      recorded_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'vehicle_id',  // vehicle_locations has vehicle_id as PRIMARY KEY
    }
  )
```

**Note:** With upsert on primary key, the row is updated in place. This triggers an UPDATE postgres_changes event, not INSERT. The client subscription must listen to `event: 'UPDATE'` instead of `'INSERT'`:

```typescript
.on('postgres_changes', {
  event: 'UPDATE',         // Upsert triggers UPDATE when row exists
  schema: 'public',
  table: 'vehicle_locations',
  filter: `vehicle_id=eq.${vehicleId}`,
}, (payload) => { ... })
```

---

### Admin KYC Review Action

```typescript
// app/actions/admin.ts
export async function reviewKYC(
  userId: string,
  decision: 'verified' | 'rejected'
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Optimistic lock: only update if currently pending/submitted
  const { data, error } = await admin
    .from('profiles')
    .update({
      kyc_status: decision,
      kyc_verified_at: decision === 'verified' ? new Date().toISOString() : null,
    })
    .eq('id', userId)
    .in('kyc_status', ['submitted', 'pending'])  // Only process pending ones
    .select('id')

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'Verification not in pending state' }

  return { error: null }
}
```

---

### Admin Payment Confirmation (Cash/Bank)

```typescript
// app/actions/admin.ts
export async function confirmManualPayment(
  bookingId: string,
  method: 'cash' | 'bank_transfer'
): Promise<{ error: string | null }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('bookings')
    .update({
      payment_status: 'paid',
      payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('payment_status', 'pending_cash')  // Optimistic lock
    .select('id')

  if (error) return { error: error.message }
  if (!data?.length) return { error: 'Booking not in pending cash state' }

  return { error: null }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mapbox://styles/mapbox/dark-v11` | Standard style + `setConfigProperty('basemap', 'lightPreset', 'night')` | Mapbox GL JS v3 (2023) | `dark-v11` still works but won't receive visual updates. Standard night preset is recommended for new projects. |
| Supabase `createClientComponentClient` | `createBrowserClient` via `@supabase/ssr` | 2024 (auth-helpers deprecated) | Project already uses `@supabase/ssr` correctly. No change needed. |
| Client-managed WebSocket for real-time | Supabase Realtime channels | Ongoing | Supabase Realtime handles WebSocket lifecycle, reconnection, and backpressure. Never build a custom WebSocket server for this. |
| Polling for location updates | Supabase Realtime postgres_changes INSERT subscription | Ongoing | Polling creates thundering herd at scale; Realtime pushes only when data changes. |
| `searchParams` from `useRouter` in client | `searchParams` prop in Server Component | Next.js 13 App Router (stable 2023) | Admin tab state is in the URL, read as a prop on the Server Component. No client-side router state needed for tab selection. |
| React Map GL (Uber) | Direct `mapbox-gl` with `useRef`/`useEffect` | Ongoing | Both approaches work. Project uses `mapbox-gl` directly (already installed). Adding `react-map-gl` adds dependency weight without meaningful benefit for a single tracking map component. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated. Project already uses `@supabase/ssr`. No action needed.
- Mapbox `dark-v11` style: Functional but not receiving visual updates. Prefer Standard night preset for new map components.
- Supabase `createClientComponentClient`: Deprecated. Project uses `createBrowserClient` correctly.

---

## Open Questions

1. **GPS hardware vendor selection (BLOCKED dependency)**
   - What we know: No GPS hardware vendor has been selected. The GPS ingest API route can be built generically but cannot be end-to-end validated without hardware.
   - What's unclear: Which tracker model/vendor will be installed in vehicles. Different vendors send different JSON payload schemas (Teltonika uses their Codec 8 binary → HTTP bridge; OsmAnd uses standard query parameters; Concox uses GT06 protocol → HTTP gateway).
   - Recommendation: Build the API route with the Zod schema shown above (normalized `lat`, `lng`, `device_id`). When vendor is selected, add a thin adapter layer to normalize their specific payload format before validation. Test with mock POST requests during development.

2. **Upsert vs Insert for vehicle_locations and Realtime event type**
   - What we know: Upsert on a primary key triggers UPDATE event in Supabase Realtime (not INSERT). Client subscription must listen to `event: 'UPDATE'`.
   - What's unclear: Whether the Phase 4 plan requires any location history (path replay, audit trail). If history is needed, upsert-only loses that.
   - Recommendation: For TRACK-01/03 (show current position, not a route path), upsert-only is correct. If path replay is added post-v1, add a `vehicle_location_history` table that archives via Postgres trigger.

3. **Admin vehicle pricing — how does it interact with the scraper?**
   - What we know: Vehicles are currently scraped from an external source. The scraper sets `daily_rate`, `weekly_rate`, `monthly_rate`. The existing `VehicleOverrideForm` allows `is_available` and `override_notes` overrides.
   - What's unclear: ADMIN-01 says admin can set "pricing per vehicle". Should admin pricing override scraper pricing? Who wins on next scrape?
   - Recommendation: Add `override_daily_rate`, `override_weekly_rate`, `override_monthly_rate` columns to vehicles. The scraper writes to `daily_rate` etc. Pricing logic reads `COALESCE(override_daily_rate, daily_rate)`. Admin sets override columns. Scraper never touches override columns.

4. **Availability blocks (ADMIN-02) — schema not yet defined**
   - What we know: ADMIN-02 requires admin to set "availability blocks per vehicle" (block dates when a car is not available regardless of bookings).
   - What's unclear: No `availability_blocks` table exists yet. This is a new schema concept.
   - Recommendation: Add `vehicle_availability_blocks` table: `(id, vehicle_id, start_date DATE, end_date DATE, reason TEXT)`. The `get_blocked_dates()` RPC (Phase 2) should be extended to include both booked dates and availability block dates.

5. **Mapbox token security for the tracking page**
   - What we know: `NEXT_PUBLIC_MAPBOX_TOKEN` is already in use (Phase 3 AddressAutofill). This is a public token — visible in the browser. Mapbox tokens are restricted by URL allowlist in the Mapbox account dashboard.
   - What's unclear: Is the Mapbox token configured with URL restrictions in the Mapbox account?
   - Recommendation: Before Phase 4 goes to production, verify Mapbox token has URL allowlist configured (only `*.yourdomain.com` can use it). This prevents token abuse. The token itself is unavoidably public — URL restrictions are the mitigation.

6. **Booking detail page shows map only when status = car_on_the_way | car_delivered**
   - What we know: TRACK-01 says map is shown "during car delivery". TRACK-03 says "throughout the entire rental period".
   - What's unclear: TRACK-03 contradicts TRACK-01 — does the customer see the map only during delivery, or throughout the entire rental?
   - Recommendation: Show the map in the booking detail page when `status IN ('car_on_the_way', 'car_delivered', 'confirmed')`. During `car_on_the_way`: show live marker + pan to car. During `car_delivered` and `confirmed`: show static map with delivery address pin. Remove map when `completed` or `cancelled`. This satisfies both requirements.

---

## Sources

### Primary (HIGH confidence)
- `supabase.com/docs/guides/realtime/postgres-changes` — postgres_changes subscription pattern, filter syntax `id=eq.{uuid}`, UPDATE event, RLS behavior
- `supabase.com/docs/guides/realtime/broadcast` — broadcast send via REST API, private channel RLS policy, `realtime.messages` table policies
- `docs.mapbox.com/mapbox-gl-js/example/live-update-feature/` — `map.getSource().setData()` pattern for real-time feature updates
- `docs.mapbox.com/mapbox-gl-js/example/set-config-property/` — `setConfigProperty('basemap', 'lightPreset', 'night')` for dark map theme
- `docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/` — backwards compatibility of classic styles, Standard style slot system, WebGL 2 requirement
- `nextjs.org/docs/app/api-reference/functions/use-search-params` — `searchParams` prop pattern for URL-based tab state in Server Components
- Existing project migrations (`20260220000000`, `20260220100000`, `20260220200000`) — confirmed exact column names, existing RLS policies, current booking status CHECK values

### Secondary (MEDIUM confidence)
- `supabase.com/blog/postgres-realtime-location-sharing-with-maplibre` — verified real-world location tracking architecture with postgres_changes INSERT subscription
- `supabase.com/docs/guides/realtime/getting_started` — broadcast vs postgres_changes performance guidance ("postgres_changes does not scale as well as broadcast")
- `docs.mapbox.com/mapbox-gl-js/guides/migrate-to-v3/` — "existing layers and APIs will continue to work as expected"; `dark-v11` still functional but Standard style preferred
- Multiple WebSearch results confirming Mapbox GL JS must use `'use client'` + `useRef` + `useEffect` in Next.js App Router

### Tertiary (LOW confidence — requires validation)
- GPS hardware vendor payload schemas: Based on general knowledge of Teltonika/Concox/OsmAnd — needs verification with actual device documentation when vendor is selected
- Supabase upsert triggering UPDATE vs INSERT in Realtime: Stated as fact in research but should be verified with a test when building the GPS ingest route
- Mapbox Standard style `night` preset exactly matching brand black aesthetic: Visually confirmed from docs description but subjective — may need further adjustment with `map.setConfigProperty` for cyan accent colors

---

## Metadata

**Confidence breakdown:**
- Booking status Realtime (postgres_changes): HIGH — official Supabase docs, filter syntax verified
- Mapbox live marker update (setData): HIGH — official Mapbox example verified
- Mapbox v3 dark/night theme (setConfigProperty): HIGH — official example code verified
- GPS ingest API route pattern: MEDIUM — architecture clear but payload format depends on unselected hardware
- Admin tab URL search params pattern: HIGH — Next.js official docs
- Analytics queries: MEDIUM — pattern clear, exact column aggregations need testing against real data volume
- vehicle_locations upsert Realtime event type: MEDIUM — logically correct but not explicitly confirmed in docs

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days — Supabase Realtime and Mapbox GL JS v3 are stable; GPS hardware decision may arrive sooner)
