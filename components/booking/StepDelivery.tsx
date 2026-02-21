'use client'

import { UseFormReturn } from 'react-hook-form'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useLoadScript, Autocomplete, GoogleMap, MarkerF } from '@react-google-maps/api'
import { BookingFormValues } from '@/lib/validations/booking'

const LIBRARIES: ('places')[] = ['places']

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a7a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

interface StepDeliveryProps {
  form: UseFormReturn<BookingFormValues>
}

export function StepDelivery({ form }: StepDeliveryProps) {
  const pickupMethod = form.watch('pickupMethod')
  const returnMethod = form.watch('returnMethod')
  const deliveryAddress = form.watch('deliveryAddress')
  const collectionAddress = form.watch('collectionAddress')
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null)
  const [collectionMapCenter, setCollectionMapCenter] = useState<google.maps.LatLngLiteral | null>(null)
  const [sameAsDelivery, setSameAsDelivery] = useState(false)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const collectionAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const collectionInputRef = useRef<HTMLInputElement | null>(null)

  const addressError = form.formState.errors.deliveryAddress
  const collectionAddressError = form.formState.errors.collectionAddress

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: googleApiKey,
    libraries: LIBRARIES,
  })

  // --- Delivery autocomplete callbacks ---

  const onAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac
  }, [])

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) return

    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    const address = place.formatted_address ?? ''

    form.setValue('deliveryLat', lat, { shouldValidate: true })
    form.setValue('deliveryLng', lng, { shouldValidate: true })
    form.setValue('deliveryAddress', address, { shouldValidate: true })

    // Sync the DOM input value so it shows the selected address
    if (inputRef.current) inputRef.current.value = address

    setMapCenter({ lat, lng })
  }, [form])

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat()
    const lng = e.latLng?.lng()
    if (lat == null || lng == null) return

    form.setValue('deliveryLat', lat, { shouldValidate: true })
    form.setValue('deliveryLng', lng, { shouldValidate: true })
    setMapCenter({ lat, lng })
  }, [form])

  // --- Collection autocomplete callbacks ---

  const onCollectionAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    collectionAutocompleteRef.current = ac
  }, [])

  const onCollectionPlaceChanged = useCallback(() => {
    const place = collectionAutocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) return

    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    const address = place.formatted_address ?? ''

    form.setValue('collectionLat', lat, { shouldValidate: true })
    form.setValue('collectionLng', lng, { shouldValidate: true })
    form.setValue('collectionAddress', address, { shouldValidate: true })

    if (collectionInputRef.current) collectionInputRef.current.value = address

    setCollectionMapCenter({ lat, lng })
  }, [form])

  const onCollectionMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat()
    const lng = e.latLng?.lng()
    if (lat == null || lng == null) return

    form.setValue('collectionLat', lat, { shouldValidate: true })
    form.setValue('collectionLng', lng, { shouldValidate: true })
    setCollectionMapCenter({ lat, lng })
  }, [form])

  // --- Helper: clear collection fields ---

  const clearCollectionFields = useCallback(() => {
    form.setValue('collectionAddress', undefined)
    form.setValue('collectionLat', undefined)
    form.setValue('collectionLng', undefined)
    setCollectionMapCenter(null)
    if (collectionInputRef.current) collectionInputRef.current.value = ''
  }, [form])

  // When pickupMethod changes to self_pickup, uncheck sameAsDelivery and clear collection if needed
  useEffect(() => {
    if (pickupMethod === 'self_pickup' && sameAsDelivery) {
      setSameAsDelivery(false)
      clearCollectionFields()
    }
  }, [pickupMethod, sameAsDelivery, clearCollectionFields])

  // --- Checkbox handler ---

  const handleSameAsDeliveryChange = useCallback((checked: boolean) => {
    setSameAsDelivery(checked)
    if (checked) {
      const dAddr = form.getValues('deliveryAddress')
      const dLat = form.getValues('deliveryLat')
      const dLng = form.getValues('deliveryLng')
      form.setValue('collectionAddress', dAddr, { shouldValidate: true })
      form.setValue('collectionLat', dLat, { shouldValidate: true })
      form.setValue('collectionLng', dLng, { shouldValidate: true })
      if (dLat != null && dLng != null) {
        setCollectionMapCenter({ lat: dLat, lng: dLng })
      }
    } else {
      clearCollectionFields()
    }
  }, [form, clearCollectionFields])

  // Whether the "same as delivery" checkbox should be visible
  const canShowSameAsDelivery = pickupMethod === 'delivery' && !!deliveryAddress

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
              form.setValue('deliveryAddress', undefined)
              form.setValue('deliveryLat', undefined)
              form.setValue('deliveryLng', undefined)
              setMapCenter(null)
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

          {googleApiKey && isLoaded ? (
            <>
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{
                  componentRestrictions: { country: 'ae' },
                  fields: ['address_components', 'geometry', 'formatted_address'],
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Enter delivery address"
                  defaultValue={deliveryAddress ?? ''}
                  onChange={(e) => form.setValue('deliveryAddress', e.target.value)}
                  className={[
                    'w-full bg-black/30 border rounded-[--radius-card] px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan input-focus-glow transition-colors',
                    addressError ? 'border-red-500' : 'border-brand-border',
                  ].join(' ')}
                />
              </Autocomplete>

              {addressError && (
                <p className="text-xs text-red-400">{addressError.message}</p>
              )}

              {mapCenter && (
                <div className="mt-3 rounded-[--radius-card] overflow-hidden border border-brand-border" style={{ height: 200 }}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={16}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                      styles: DARK_MAP_STYLES,
                    }}
                  >
                    <MarkerF
                      position={mapCenter}
                      draggable
                      onDragEnd={onMarkerDragEnd}
                    />
                  </GoogleMap>
                </div>
              )}

              <p className="text-xs text-brand-muted">
                Pin your exact location on the map for precise delivery.
              </p>
            </>
          ) : (
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
                Map address lookup requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be configured.
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
            onClick={() => {
              form.setValue('returnMethod', 'self_dropoff', { shouldValidate: true })
              clearCollectionFields()
              setSameAsDelivery(false)
            }}
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

      {/* Collection address (conditional) */}
      {returnMethod === 'collection' && (
        <div className="space-y-3">
          <p className="text-xs text-brand-muted uppercase tracking-wider">Collection Address</p>

          {/* Same as delivery checkbox */}
          {canShowSameAsDelivery && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={sameAsDelivery}
                onChange={(e) => handleSameAsDeliveryChange(e.target.checked)}
                className="w-4 h-4 rounded border-brand-border bg-black/30 text-brand-cyan focus:ring-brand-cyan focus:ring-offset-0 accent-[var(--color-brand-cyan)]"
              />
              <span className="text-sm text-brand-muted group-hover:text-white transition-colors">
                Same as delivery address
              </span>
            </label>
          )}

          {/* Show address input + map when NOT using same-as-delivery */}
          {!sameAsDelivery && (
            <>
              {googleApiKey && isLoaded ? (
                <>
                  <Autocomplete
                    onLoad={onCollectionAutocompleteLoad}
                    onPlaceChanged={onCollectionPlaceChanged}
                    options={{
                      componentRestrictions: { country: 'ae' },
                      fields: ['address_components', 'geometry', 'formatted_address'],
                    }}
                  >
                    <input
                      ref={collectionInputRef}
                      type="text"
                      placeholder="Enter collection address"
                      defaultValue={collectionAddress ?? ''}
                      onChange={(e) => form.setValue('collectionAddress', e.target.value)}
                      className={[
                        'w-full bg-black/30 border rounded-[--radius-card] px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan input-focus-glow transition-colors',
                        collectionAddressError ? 'border-red-500' : 'border-brand-border',
                      ].join(' ')}
                    />
                  </Autocomplete>

                  {collectionAddressError && (
                    <p className="text-xs text-red-400">{collectionAddressError.message}</p>
                  )}

                  {collectionMapCenter && (
                    <div className="mt-3 rounded-[--radius-card] overflow-hidden border border-brand-border" style={{ height: 200 }}>
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={collectionMapCenter}
                        zoom={16}
                        options={{
                          disableDefaultUI: true,
                          zoomControl: true,
                          styles: DARK_MAP_STYLES,
                        }}
                      >
                        <MarkerF
                          position={collectionMapCenter}
                          draggable
                          onDragEnd={onCollectionMarkerDragEnd}
                        />
                      </GoogleMap>
                    </div>
                  )}

                  <p className="text-xs text-brand-muted">
                    Pin your exact location on the map for precise collection.
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter collection address"
                    {...form.register('collectionAddress')}
                    className={[
                      'w-full bg-black/30 border rounded-[--radius-card] px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan input-focus-glow transition-colors',
                      collectionAddressError ? 'border-red-500' : 'border-brand-border',
                    ].join(' ')}
                  />
                  {collectionAddressError && (
                    <p className="text-xs text-red-400">{collectionAddressError.message}</p>
                  )}
                  <p className="text-xs text-amber-500/80">
                    Map address lookup requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be configured.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
          {returnMethod === 'collection' && collectionAddress && (
            <div className="flex justify-between gap-4">
              <span className="text-brand-muted shrink-0">Collection Address:</span>
              <span className="text-white text-right text-xs">{collectionAddress}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
