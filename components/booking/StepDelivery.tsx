'use client'

import { UseFormReturn } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { BookingFormValues } from '@/lib/validations/booking'
import { Input } from '@/components/ui/Input'
import { CountryCodePickerOverlay } from '@/components/booking/CountryCodePickerOverlay'
import { DeliveryZonePickerOverlay } from '@/components/booking/DeliveryZonePickerOverlay'

// Delivery zones — label + AED fee. Fee covers both delivery and collection.
type ZoneKey =
  | 'within_dubai'
  | 'al_maktoum_airport'
  | 'sharjah_airport'
  | 'sharjah_city'
  | 'ajman'
  | 'abu_dhabi'
  | 'al_ain'
  | 'fujairah'
  | 'ras_al_khaimah'

const DELIVERY_ZONE_OPTIONS: { value: ZoneKey; label: string; fee: number }[] = [
  { value: 'within_dubai', label: 'Address within Dubai', fee: 100 },
  { value: 'al_maktoum_airport', label: 'Al Maktoum Airport', fee: 200 },
  { value: 'sharjah_airport', label: 'Sharjah Airport', fee: 200 },
  { value: 'sharjah_city', label: 'Sharjah City', fee: 200 },
  { value: 'ajman', label: 'Ajman', fee: 500 },
  { value: 'abu_dhabi', label: 'Abu Dhabi', fee: 1000 },
  { value: 'al_ain', label: 'Al Ain', fee: 1000 },
  { value: 'fujairah', label: 'Fujairah', fee: 1000 },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah', fee: 1000 },
]

const DELIVERY_ZONE_LABELS: Record<ZoneKey, string> = Object.fromEntries(
  DELIVERY_ZONE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ZoneKey, string>

const DELIVERY_ZONE_FEES: Record<ZoneKey, number> = Object.fromEntries(
  DELIVERY_ZONE_OPTIONS.map((o) => [o.value, o.fee]),
) as Record<ZoneKey, number>

// Dial-code list. Alphabetical by country name. ISO is the unique identifier
// (because +1 is shared by US and Canada, +7 by Russia and Kazakhstan, etc.).
const DIAL_CODES: { iso: string; code: string; flag: string; label: string }[] = [
  { iso: 'AF', code: '+93', flag: '🇦🇫', label: 'Afghanistan' },
  { iso: 'AL', code: '+355', flag: '🇦🇱', label: 'Albania' },
  { iso: 'DZ', code: '+213', flag: '🇩🇿', label: 'Algeria' },
  { iso: 'AR', code: '+54', flag: '🇦🇷', label: 'Argentina' },
  { iso: 'AM', code: '+374', flag: '🇦🇲', label: 'Armenia' },
  { iso: 'AU', code: '+61', flag: '🇦🇺', label: 'Australia' },
  { iso: 'AT', code: '+43', flag: '🇦🇹', label: 'Austria' },
  { iso: 'AZ', code: '+994', flag: '🇦🇿', label: 'Azerbaijan' },
  { iso: 'BH', code: '+973', flag: '🇧🇭', label: 'Bahrain' },
  { iso: 'BD', code: '+880', flag: '🇧🇩', label: 'Bangladesh' },
  { iso: 'BY', code: '+375', flag: '🇧🇾', label: 'Belarus' },
  { iso: 'BE', code: '+32', flag: '🇧🇪', label: 'Belgium' },
  { iso: 'BR', code: '+55', flag: '🇧🇷', label: 'Brazil' },
  { iso: 'BG', code: '+359', flag: '🇧🇬', label: 'Bulgaria' },
  { iso: 'CA', code: '+1', flag: '🇨🇦', label: 'Canada' },
  { iso: 'CL', code: '+56', flag: '🇨🇱', label: 'Chile' },
  { iso: 'CN', code: '+86', flag: '🇨🇳', label: 'China' },
  { iso: 'CO', code: '+57', flag: '🇨🇴', label: 'Colombia' },
  { iso: 'HR', code: '+385', flag: '🇭🇷', label: 'Croatia' },
  { iso: 'CY', code: '+357', flag: '🇨🇾', label: 'Cyprus' },
  { iso: 'CZ', code: '+420', flag: '🇨🇿', label: 'Czech Republic' },
  { iso: 'DK', code: '+45', flag: '🇩🇰', label: 'Denmark' },
  { iso: 'EG', code: '+20', flag: '🇪🇬', label: 'Egypt' },
  { iso: 'EE', code: '+372', flag: '🇪🇪', label: 'Estonia' },
  { iso: 'FI', code: '+358', flag: '🇫🇮', label: 'Finland' },
  { iso: 'FR', code: '+33', flag: '🇫🇷', label: 'France' },
  { iso: 'GE', code: '+995', flag: '🇬🇪', label: 'Georgia' },
  { iso: 'DE', code: '+49', flag: '🇩🇪', label: 'Germany' },
  { iso: 'GR', code: '+30', flag: '🇬🇷', label: 'Greece' },
  { iso: 'HK', code: '+852', flag: '🇭🇰', label: 'Hong Kong' },
  { iso: 'HU', code: '+36', flag: '🇭🇺', label: 'Hungary' },
  { iso: 'IN', code: '+91', flag: '🇮🇳', label: 'India' },
  { iso: 'ID', code: '+62', flag: '🇮🇩', label: 'Indonesia' },
  { iso: 'IR', code: '+98', flag: '🇮🇷', label: 'Iran' },
  { iso: 'IQ', code: '+964', flag: '🇮🇶', label: 'Iraq' },
  { iso: 'IE', code: '+353', flag: '🇮🇪', label: 'Ireland' },
  { iso: 'IL', code: '+972', flag: '🇮🇱', label: 'Israel' },
  { iso: 'IT', code: '+39', flag: '🇮🇹', label: 'Italy' },
  { iso: 'JP', code: '+81', flag: '🇯🇵', label: 'Japan' },
  { iso: 'JO', code: '+962', flag: '🇯🇴', label: 'Jordan' },
  { iso: 'KZ', code: '+7', flag: '🇰🇿', label: 'Kazakhstan' },
  { iso: 'KE', code: '+254', flag: '🇰🇪', label: 'Kenya' },
  { iso: 'KW', code: '+965', flag: '🇰🇼', label: 'Kuwait' },
  { iso: 'LB', code: '+961', flag: '🇱🇧', label: 'Lebanon' },
  { iso: 'LY', code: '+218', flag: '🇱🇾', label: 'Libya' },
  { iso: 'LU', code: '+352', flag: '🇱🇺', label: 'Luxembourg' },
  { iso: 'MY', code: '+60', flag: '🇲🇾', label: 'Malaysia' },
  { iso: 'MT', code: '+356', flag: '🇲🇹', label: 'Malta' },
  { iso: 'MX', code: '+52', flag: '🇲🇽', label: 'Mexico' },
  { iso: 'MA', code: '+212', flag: '🇲🇦', label: 'Morocco' },
  { iso: 'NL', code: '+31', flag: '🇳🇱', label: 'Netherlands' },
  { iso: 'NZ', code: '+64', flag: '🇳🇿', label: 'New Zealand' },
  { iso: 'NG', code: '+234', flag: '🇳🇬', label: 'Nigeria' },
  { iso: 'NO', code: '+47', flag: '🇳🇴', label: 'Norway' },
  { iso: 'OM', code: '+968', flag: '🇴🇲', label: 'Oman' },
  { iso: 'PK', code: '+92', flag: '🇵🇰', label: 'Pakistan' },
  { iso: 'PH', code: '+63', flag: '🇵🇭', label: 'Philippines' },
  { iso: 'PL', code: '+48', flag: '🇵🇱', label: 'Poland' },
  { iso: 'PT', code: '+351', flag: '🇵🇹', label: 'Portugal' },
  { iso: 'QA', code: '+974', flag: '🇶🇦', label: 'Qatar' },
  { iso: 'RO', code: '+40', flag: '🇷🇴', label: 'Romania' },
  { iso: 'RU', code: '+7', flag: '🇷🇺', label: 'Russia' },
  { iso: 'SA', code: '+966', flag: '🇸🇦', label: 'Saudi Arabia' },
  { iso: 'RS', code: '+381', flag: '🇷🇸', label: 'Serbia' },
  { iso: 'SG', code: '+65', flag: '🇸🇬', label: 'Singapore' },
  { iso: 'SK', code: '+421', flag: '🇸🇰', label: 'Slovakia' },
  { iso: 'ZA', code: '+27', flag: '🇿🇦', label: 'South Africa' },
  { iso: 'KR', code: '+82', flag: '🇰🇷', label: 'South Korea' },
  { iso: 'ES', code: '+34', flag: '🇪🇸', label: 'Spain' },
  { iso: 'LK', code: '+94', flag: '🇱🇰', label: 'Sri Lanka' },
  { iso: 'SE', code: '+46', flag: '🇸🇪', label: 'Sweden' },
  { iso: 'CH', code: '+41', flag: '🇨🇭', label: 'Switzerland' },
  { iso: 'SY', code: '+963', flag: '🇸🇾', label: 'Syria' },
  { iso: 'TW', code: '+886', flag: '🇹🇼', label: 'Taiwan' },
  { iso: 'TH', code: '+66', flag: '🇹🇭', label: 'Thailand' },
  { iso: 'TN', code: '+216', flag: '🇹🇳', label: 'Tunisia' },
  { iso: 'TR', code: '+90', flag: '🇹🇷', label: 'Turkey' },
  { iso: 'UA', code: '+380', flag: '🇺🇦', label: 'Ukraine' },
  { iso: 'AE', code: '+971', flag: '🇦🇪', label: 'United Arab Emirates' },
  { iso: 'GB', code: '+44', flag: '🇬🇧', label: 'United Kingdom' },
  { iso: 'US', code: '+1', flag: '🇺🇸', label: 'United States' },
  { iso: 'VE', code: '+58', flag: '🇻🇪', label: 'Venezuela' },
  { iso: 'VN', code: '+84', flag: '🇻🇳', label: 'Vietnam' },
  { iso: 'YE', code: '+967', flag: '🇾🇪', label: 'Yemen' },
]

// "Most popular" prefix at the top of the picker — UAE-customer skewed.
const POPULAR_ISO_CODES = ['AE', 'GB', 'US', 'SA', 'IN', 'RU', 'CN']

function detectCountryIso(): string {
  if (typeof navigator === 'undefined') return 'AE'
  try {
    const lang = navigator.language || 'en-AE'
    const parts = lang.split('-')
    const region = parts[1]?.toUpperCase()
    if (region && DIAL_CODES.some((c) => c.iso === region)) return region
  } catch {
    // ignore
  }
  return 'AE'
}

interface StepDeliveryProps {
  form: UseFormReturn<BookingFormValues>
  /** Navigation buttons (Back / Continue) rendered inside the white card */
  navButtons?: React.ReactNode
  /** Called when the user taps the back chevron on the card (mobile) */
  onBack?: () => void
}

export function StepDelivery({ form, navButtons, onBack }: StepDeliveryProps) {
  const pickupMethod = form.watch('pickupMethod')
  const guestPhoneCountry = form.watch('guestPhoneCountry')
  const needsInvoiceAddress = form.watch('needsInvoiceAddress') ?? false
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [zonePickerOpen, setZonePickerOpen] = useState(false)
  const deliveryLocation = form.watch('deliveryLocation')
  const deliveryNotes = form.watch('deliveryNotes')

  // Geo-detect the country ISO on mount if not already set by user / session restore.
  // Also migrate legacy values that stored a dial code (e.g. "+971") into an ISO.
  useEffect(() => {
    const current = guestPhoneCountry
    const looksLikeIso = current && /^[A-Z]{2}$/.test(current)
    if (!looksLikeIso) {
      // Try to recover ISO from a legacy dial-code value, else geo-detect.
      const fromDial = current ? DIAL_CODES.find((c) => c.code === current)?.iso : undefined
      form.setValue('guestPhoneCountry', fromDial ?? detectCountryIso(), { shouldValidate: false })
    }
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep guestName synced from first + surname so Step 6 (and the booking row)
  // see the combined name without the guest having to re-type it.
  const guestFirstName = form.watch('guestFirstName')
  const guestSurname = form.watch('guestSurname')
  useEffect(() => {
    const combined = [guestFirstName, guestSurname].filter(Boolean).join(' ').trim()
    if (combined) form.setValue('guestName', combined, { shouldValidate: false })
  }, [guestFirstName, guestSurname, form])

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6">
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to previous step"
            className="sm:hidden -mt-2 -ml-2 mb-1 inline-flex items-center gap-1 h-10 pl-2 pr-3 text-[15px] font-bold text-black active:bg-black/10 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-zinc-900 mb-1">
          Review your booking
        </h2>
        <p className="text-sm text-zinc-500">Confirm where you want the car, who&apos;s driving, and any invoice details.</p>
      </div>

      <h3 className="text-base font-bold text-zinc-900">Where &amp; when</h3>

      {/* Pickup method — 2 cards */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Delivery / Return card */}
          <button
            type="button"
            onClick={() => {
              form.setValue('pickupMethod', 'delivery', { shouldValidate: true })
              form.setValue('returnMethod', 'collection', { shouldValidate: true })
              if (!form.getValues('deliveryLocation')) {
                form.setValue('deliveryLocation', 'within_dubai', { shouldValidate: true })
              }
              // Open the zone picker immediately so the customer picks a zone right away.
              setZonePickerOpen(true)
            }}
            className={[
              'p-4 rounded-[var(--radius-card)] border text-left transition-all',
              pickupMethod === 'delivery'
                ? 'border-brand-cyan bg-brand-cyan/5'
                : 'border-zinc-200 hover:border-zinc-400',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <svg
                className={['w-5 h-5 mt-0.5 shrink-0', pickupMethod === 'delivery' ? 'text-brand-cyan' : 'text-zinc-600'].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <div>
                <p className={['text-base font-bold', pickupMethod === 'delivery' ? 'text-brand-cyan' : 'text-zinc-900'].join(' ')}>
                  Delivery / Return
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">We deliver and collect from your chosen zone.</p>
              </div>
            </div>
          </button>

          {/* Self-pickup card */}
          <button
            type="button"
            onClick={() => {
              form.setValue('pickupMethod', 'self_pickup', { shouldValidate: true })
              form.setValue('returnMethod', 'self_dropoff', { shouldValidate: true })
              form.setValue('deliveryLocation', undefined, { shouldValidate: true })
            }}
            className={[
              'p-4 rounded-[var(--radius-card)] border text-left transition-all',
              pickupMethod === 'self_pickup'
                ? 'border-brand-cyan bg-brand-cyan/5'
                : 'border-zinc-200 hover:border-zinc-400',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <svg
                className={['w-5 h-5 mt-0.5 shrink-0', pickupMethod === 'self_pickup' ? 'text-brand-cyan' : 'text-zinc-600'].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <div>
                <p className={['text-base font-bold', pickupMethod === 'self_pickup' ? 'text-brand-cyan' : 'text-zinc-900'].join(' ')}>
                  Self Pickup
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">No charge — Business Bay or Downtown Dubai.</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Delivery zone — visible when Delivery / Return is selected.
          Tap opens a full-screen / modal picker (DeliveryZonePickerOverlay). */}
      {pickupMethod === 'delivery' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-zinc-900">Delivery zone</label>
            <button
              type="button"
              onClick={() => setZonePickerOpen(true)}
              className="relative flex items-center justify-between px-4 py-3 border border-zinc-300 rounded-xl bg-white hover:bg-zinc-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan cursor-pointer text-left gap-3"
            >
              <span className="text-base font-semibold text-zinc-900">
                {DELIVERY_ZONE_LABELS[(deliveryLocation as ZoneKey) ?? 'within_dubai']}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-base font-bold text-zinc-900 tabular-nums">
                  AED {DELIVERY_ZONE_FEES[(deliveryLocation as ZoneKey) ?? 'within_dubai'].toLocaleString('en-AE')}
                </span>
                <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {form.formState.errors.deliveryLocation && (
              <p className="text-xs text-red-600">{form.formState.errors.deliveryLocation.message}</p>
            )}
          </div>

          {/* Notes — only for the "Address within Dubai" zone, so the customer
              can tell us exactly where to deliver and collect from. */}
          {deliveryLocation === 'within_dubai' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-zinc-900">
                Delivery & collection notes
              </label>
              <p className="text-xs text-zinc-500">
                Tell us where to drop off the car — we&apos;ll collect from the same spot at the end of your rental.
              </p>
              <textarea
                {...form.register('deliveryNotes')}
                value={deliveryNotes ?? ''}
                onChange={(e) => form.setValue('deliveryNotes', e.target.value)}
                placeholder="e.g. Building name, apartment number, parking instructions…"
                rows={3}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan resize-none"
              />
            </div>
          )}
        </div>
      )}

      {/* ---------------- Who will drive? ---------------- */}
      <div className="pt-6 border-t border-zinc-200 space-y-4">
        <h3 className="text-base font-bold text-zinc-900">Who will drive?</h3>

        <Input
          {...form.register('guestEmail')}
          variant="light"
          label="Email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          error={form.formState.errors.guestEmail?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            {...form.register('guestFirstName')}
            variant="light"
            label="First name"
            type="text"
            autoComplete="given-name"
            error={form.formState.errors.guestFirstName?.message}
          />
          <Input
            {...form.register('guestSurname')}
            variant="light"
            label="Surname"
            type="text"
            autoComplete="family-name"
            error={form.formState.errors.guestSurname?.message}
          />
        </div>

        <div className="grid grid-cols-[170px_1fr] gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-zinc-900">Country</label>
            {(() => {
              const country = DIAL_CODES.find((c) => c.iso === guestPhoneCountry) ?? DIAL_CODES.find((c) => c.iso === 'AE')!
              return (
                <button
                  type="button"
                  onClick={() => setCountryPickerOpen(true)}
                  className="relative flex items-center px-4 py-3 border border-zinc-300 rounded-xl bg-white hover:bg-zinc-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan cursor-pointer text-left"
                >
                  <span className="text-xl mr-2">{country.flag}</span>
                  <span className="text-base font-semibold text-zinc-900">{country.code}</span>
                  <svg className="w-4 h-4 text-zinc-700 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )
            })()}
          </div>
          <Input
            {...form.register('guestPhone')}
            variant="light"
            label="Phone number"
            type="tel"
            placeholder="50 123 4567"
            autoComplete="tel-national"
            error={form.formState.errors.guestPhone?.message}
          />
        </div>

        <Input
          {...form.register('guestCompany')}
          variant="light"
          label={
            <>
              Company <span className="font-normal text-zinc-500">(optional)</span>
            </>
          }
          type="text"
          autoComplete="organization"
          error={form.formState.errors.guestCompany?.message}
        />
      </div>

      {/* ---------------- Invoice address (opt-in) ---------------- */}
      <div className="pt-6 border-t border-zinc-200 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={needsInvoiceAddress}
            onChange={(e) => form.setValue('needsInvoiceAddress', e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 bg-white text-brand-cyan focus:ring-brand-cyan focus:ring-offset-0 accent-[var(--color-brand-cyan)]"
          />
          <span className="text-sm font-semibold text-zinc-900 group-hover:text-brand-cyan transition-colors">
            I need a VAT invoice
          </span>
        </label>

        {needsInvoiceAddress && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-zinc-900">What&apos;s your invoice address?</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-zinc-900">Country</label>
              <div className="relative flex items-center px-4 py-3 border border-zinc-300 rounded-xl bg-white hover:bg-zinc-50 transition-colors focus-within:ring-2 focus-within:ring-brand-cyan">
                <span className="text-base text-zinc-900">
                  {form.watch('invoiceAddress.country') || 'United Arab Emirates'}
                </span>
                <svg className="w-4 h-4 text-zinc-700 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <select
                  {...form.register('invoiceAddress.country')}
                  aria-label="Invoice country"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  suppressHydrationWarning
                >
                  {DIAL_CODES.map((c) => (
                    <option key={`inv-${c.label}`} value={c.label}>
                      {c.flag} {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              {...form.register('invoiceAddress.street')}
              variant="light"
              label="House number & street"
              type="text"
              autoComplete="street-address"
            />

            <div className="grid grid-cols-[170px_1fr] gap-3">
              <Input
                {...form.register('invoiceAddress.postcode')}
                variant="light"
                label="Post code"
                type="text"
                autoComplete="postal-code"
              />
              <Input
                {...form.register('invoiceAddress.city')}
                variant="light"
                label="City"
                type="text"
                autoComplete="address-level2"
              />
            </div>
          </div>
        )}
      </div>

      {navButtons && <div className="pt-4 border-t border-zinc-200">{navButtons}</div>}

      {/* Full-screen / modal country code picker */}
      <CountryCodePickerOverlay
        open={countryPickerOpen}
        countries={DIAL_CODES}
        popularCodes={POPULAR_ISO_CODES}
        initialValue={guestPhoneCountry}
        onClose={() => setCountryPickerOpen(false)}
        onSelect={(iso) => form.setValue('guestPhoneCountry', iso, { shouldValidate: false })}
      />

      {/* Full-screen / modal delivery zone picker */}
      <DeliveryZonePickerOverlay
        open={zonePickerOpen}
        zones={DELIVERY_ZONE_OPTIONS}
        initialValue={deliveryLocation}
        onClose={() => setZonePickerOpen(false)}
        onSelect={(value) => form.setValue('deliveryLocation', value as ZoneKey, { shouldValidate: true })}
      />
    </div>
  )
}
