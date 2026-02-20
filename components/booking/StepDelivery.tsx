'use client'

import { UseFormReturn } from 'react-hook-form'
import { useState } from 'react'
import { AddressAutofill, AddressMinimap } from '@mapbox/search-js-react'
import type { AddressAutofillRetrieveResponse } from '@mapbox/search-js-core'
import { BookingFormValues } from '@/lib/validations/booking'

interface StepDeliveryProps {
  form: UseFormReturn<BookingFormValues>
}

import type { Feature, Point } from 'geojson'
type MinimapFeature = Feature<Point>

export function StepDelivery({ form }: StepDeliveryProps) {
  const pickupMethod = form.watch('pickupMethod')
  const returnMethod = form.watch('returnMethod')
  const deliveryAddress = form.watch('deliveryAddress')
  const [miniMapFeature, setMiniMapFeature] = useState<MinimapFeature | null>(null)

  const addressError = form.formState.errors.deliveryAddress

  function handleAddressRetrieve(res: AddressAutofillRetrieveResponse) {
    const feature = res.features[0]
    if (!feature) return

    const coords = feature.geometry.coordinates
    const lng = coords[0] as number
    const lat = coords[1] as number
    const props = feature.properties as { full_address?: string; place_name?: string }
    const fullAddress = props.full_address ?? props.place_name ?? ''

    form.setValue('deliveryLng', lng, { shouldValidate: true })
    form.setValue('deliveryLat', lat, { shouldValidate: true })
    form.setValue('deliveryAddress', fullAddress, { shouldValidate: true })

    setMiniMapFeature({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: null,
    })
  }

  function handleMarkerSave(coordinates: [number, number]) {
    const lng = coordinates[0]
    const lat = coordinates[1]
    form.setValue('deliveryLng', lng, { shouldValidate: true })
    form.setValue('deliveryLat', lat, { shouldValidate: true })
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-medium text-white mb-1">Delivery & Return</h2>
        <p className="text-sm text-brand-muted">Choose how you want the vehicle delivered and returned.</p>
      </div>

      {/* Pickup method */}
      <div>
        <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">Pickup Method</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Delivery card */}
          <button
            type="button"
            onClick={() => form.setValue('pickupMethod', 'delivery', { shouldValidate: true })}
            className={[
              'p-4 rounded-[--radius-card] border text-left transition-all',
              pickupMethod === 'delivery'
                ? 'border-brand-cyan bg-brand-cyan/10'
                : 'border-brand-border hover:border-white/30',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <svg
                className={['w-5 h-5 mt-0.5 shrink-0', pickupMethod === 'delivery' ? 'text-brand-cyan' : 'text-brand-muted'].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <div>
                <p className={['text-sm font-semibold', pickupMethod === 'delivery' ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  Delivery
                </p>
                <p className="text-xs text-brand-muted mt-0.5">AED 50 — delivered to you</p>
              </div>
            </div>
          </button>

          {/* Self-pickup card */}
          <button
            type="button"
            onClick={() => {
              form.setValue('pickupMethod', 'self_pickup', { shouldValidate: true })
              // Clear delivery address fields when switching to self_pickup
              form.setValue('deliveryAddress', undefined)
              form.setValue('deliveryLat', undefined)
              form.setValue('deliveryLng', undefined)
              setMiniMapFeature(null)
            }}
            className={[
              'p-4 rounded-[--radius-card] border text-left transition-all',
              pickupMethod === 'self_pickup'
                ? 'border-brand-cyan bg-brand-cyan/10'
                : 'border-brand-border hover:border-white/30',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <svg
                className={['w-5 h-5 mt-0.5 shrink-0', pickupMethod === 'self_pickup' ? 'text-brand-cyan' : 'text-brand-muted'].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <div>
                <p className={['text-sm font-semibold', pickupMethod === 'self_pickup' ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  Self-Pickup
                </p>
                <p className="text-xs text-brand-muted mt-0.5">Free — collect from Downtown Dubai</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Delivery address (conditional) */}
      {pickupMethod === 'delivery' && (
        <div className="space-y-3">
          <p className="text-xs text-brand-muted uppercase tracking-wider">Delivery Address</p>

          {mapboxToken ? (
            <>
              {/* Mapbox AddressAutofill */}
              <AddressAutofill
                accessToken={mapboxToken}
                onRetrieve={handleAddressRetrieve}
              >
                <input
                  type="text"
                  placeholder="Enter delivery address"
                  autoComplete="address-line1"
                  {...form.register('deliveryAddress')}
                  className={[
                    'w-full bg-black/30 border rounded-[--radius-card] px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan input-focus-glow transition-colors',
                    addressError ? 'border-red-500' : 'border-brand-border',
                  ].join(' ')}
                />
              </AddressAutofill>

              {/* Validation error */}
              {addressError && (
                <p className="text-xs text-red-400">{addressError.message}</p>
              )}

              {/* Minimap pin confirmation */}
              {miniMapFeature && (
                <div className="mt-3 rounded-[--radius-card] overflow-hidden border border-brand-border" style={{ height: 200 }}>
                  <AddressMinimap
                    accessToken={mapboxToken}
                    feature={miniMapFeature ?? undefined}
                    onSaveMarkerLocation={handleMarkerSave}
                    canAdjustMarker
                    satelliteToggle
                  />
                </div>
              )}

              <p className="text-xs text-brand-muted">
                Pin your exact location on the map for precise delivery.
              </p>
            </>
          ) : (
            /* Fallback plain input if Mapbox token not configured */
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter delivery address"
                {...form.register('deliveryAddress')}
                className={[
                  'w-full bg-black/30 border rounded-[--radius-card] px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan input-focus-glow transition-colors',
                  addressError ? 'border-red-500' : 'border-brand-border',
                ].join(' ')}
              />
              {addressError && (
                <p className="text-xs text-red-400">{addressError.message}</p>
              )}
              <p className="text-xs text-amber-500/80">
                Map address lookup requires NEXT_PUBLIC_MAPBOX_TOKEN to be configured.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Return method */}
      <div>
        <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">Return Method</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Self drop-off card */}
          <button
            type="button"
            onClick={() => form.setValue('returnMethod', 'self_dropoff', { shouldValidate: true })}
            className={[
              'p-4 rounded-[--radius-card] border text-left transition-all',
              returnMethod === 'self_dropoff'
                ? 'border-brand-cyan bg-brand-cyan/10'
                : 'border-brand-border hover:border-white/30',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <svg
                className={['w-5 h-5 mt-0.5 shrink-0', returnMethod === 'self_dropoff' ? 'text-brand-cyan' : 'text-brand-muted'].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              <div>
                <p className={['text-sm font-semibold', returnMethod === 'self_dropoff' ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  Self Drop-Off
                </p>
                <p className="text-xs text-brand-muted mt-0.5">Free — return to Downtown Dubai</p>
              </div>
            </div>
          </button>

          {/* Collection card */}
          <button
            type="button"
            onClick={() => form.setValue('returnMethod', 'collection', { shouldValidate: true })}
            className={[
              'p-4 rounded-[--radius-card] border text-left transition-all',
              returnMethod === 'collection'
                ? 'border-brand-cyan bg-brand-cyan/10'
                : 'border-brand-border hover:border-white/30',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <svg
                className={['w-5 h-5 mt-0.5 shrink-0', returnMethod === 'collection' ? 'text-brand-cyan' : 'text-brand-muted'].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <div>
                <p className={['text-sm font-semibold', returnMethod === 'collection' ? 'text-brand-cyan' : 'text-white'].join(' ')}>
                  Collection
                </p>
                <p className="text-xs text-brand-muted mt-0.5">AED 50 — we collect from you</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Summary */}
      {(deliveryAddress || pickupMethod === 'self_pickup') && (
        <div className="bg-black/20 border border-brand-border rounded-[--radius-card] p-4 text-sm space-y-1">
          <p className="text-brand-muted text-xs uppercase tracking-wider mb-2">Selected Options</p>
          <div className="flex justify-between">
            <span className="text-brand-muted">Pickup:</span>
            <span className="text-white">
              {pickupMethod === 'delivery' ? 'Delivery (AED 50)' : 'Self-Pickup (Free)'}
            </span>
          </div>
          {pickupMethod === 'delivery' && deliveryAddress && (
            <div className="flex justify-between gap-4">
              <span className="text-brand-muted shrink-0">Address:</span>
              <span className="text-white text-right text-xs">{deliveryAddress}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-brand-muted">Return:</span>
            <span className="text-white">
              {returnMethod === 'collection' ? 'Collection (AED 50)' : 'Self Drop-Off (Free)'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
