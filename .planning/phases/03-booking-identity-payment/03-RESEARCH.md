# Phase 3: Booking, Identity, and Payment — Research

**Researched:** 2026-02-20
**Domain:** Car rental booking flow, KYC identity verification, payment processing (Stripe), map/address input, transactional email
**Confidence:** MEDIUM-HIGH — core Stripe and Supabase patterns HIGH; KYC provider selection MEDIUM (pricing publicly verified, UAE coverage requires direct confirmation); crypto payment LOW (Stripe stablecoin explicitly US-only for UAE-registered businesses)

---

## Summary

Phase 3 covers four tightly coupled sub-domains: (1) a multi-step booking wizard with live pricing, date selection, and delivery address; (2) identity verification via a KYC provider that handles passport/license upload and liveness selfie; (3) a full payment layer including card, Apple Pay, Google Pay, deposit pre-authorization, and cash on delivery; and (4) confirmation emails and in-app booking state management.

The recommended stack centers on **Stripe** for all payment processing (card + Apple Pay + Google Pay natively supported in UAE; crypto stablecoin blocked for UAE-registered businesses), **Veriff** as the primary KYC candidate at $0.80/verification on the Essential tier (30-day/100-verification free trial), **Mapbox AddressAutofill** for delivery address pin-drop (Google's legacy Autocomplete class deprecated March 2025 for new customers), and **Resend + React Email** for transactional booking confirmations. The existing `react-day-picker v9`, `react-hook-form + Zod`, and `date-fns` libraries already in the project cover the booking wizard form.

The single biggest architectural risk is the Stripe deposit flow: deposits use `capture_method: 'manual'` on a PaymentIntent, which places a hold that expires in 7 days by default (or up to 30 days with Extended Authorization on IC+ pricing). Since car rentals can exceed 7 days, the deposit hold strategy must be designed carefully — either request Extended Authorization at booking time, or take a simple charge for the deposit upfront and refund on return.

**Primary recommendation:** Use Stripe Payment Element (card) + Express Checkout Element (Apple Pay/Google Pay) for payments; Veriff JS SDK for KYC embedded in a modal; Mapbox AddressAutofill for delivery address; Resend + React Email for confirmations; and extend the existing `bookings` table in a single migration with all Phase 3 fields.

---

## User Constraints

No CONTEXT.md exists for this phase. The following constraints are extracted verbatim from the phase's `additional_context` prior decisions:

### Locked Decisions
- Deferred verification: users can browse; identity verification triggered at first booking only
- No driver app for v1: all cars from Downtown Dubai office
- Dark luxury theme: black background, cyan accents (#09f), Playfair Display + Inter fonts
- Tailwind v4 `@theme` block for design tokens
- Next.js 16 App Router with Server Components and Server Actions
- Supabase for database, auth, storage
- `getClaims()` not `getSession()` for server-side auth
- Admin role via `profiles.role` column
- 80% tourists on mobile phones — mobile-first responsive design
- Phone verification deferred for dev — email/password only currently active
- KYC provider not yet selected (Onfido vs Jumio vs Persona — research should add Veriff)
- UAE legal review required before production PII storage (PDPL, RTA, VARA)

### Claude's Discretion
- Which KYC provider to use (Onfido/Veriff/Persona — Jumio also mentioned)
- Map/address provider selection
- Email delivery service selection
- Booking wizard UI structure (steps, layout)

### Deferred Ideas (OUT OF SCOPE for Phase 3)
- Live map tracking during delivery (GPS car location)
- Driver/delivery staff app
- Real-time fuel level monitoring
- In-app chat/support
- Multi-language support
- Hourly rentals

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` (server SDK) | ^17.x | Create PaymentIntents, capture/void deposits, webhook verification | Official Node.js SDK; required for server-side payment operations |
| `@stripe/stripe-js` | ^5.x | Load Stripe.js on client, tokenize card data | Official client library; PCI compliance requires card data never touches your server |
| `@stripe/react-stripe-js` | ^3.x | React components: `Elements`, `PaymentElement`, `ExpressCheckoutElement` | Official React wrapper; provides `useStripe`, `useElements` hooks |
| `resend` | ^4.x | Transactional email API | Developer-first, React Email native, 100 emails/day free tier |
| `@react-email/components` | ^0.0.x | React components for email templates | Framework-native templates preview in browser; avoids HTML string wrangling |
| `@mapbox/search-js-react` | ^1.x | `AddressAutofill` component, minimap pin confirmation | Google Autocomplete deprecated for new customers March 2025; Mapbox has built-in minimap pin-drop for checkout flows |
| `mapbox-gl` | ^3.x | Map rendering (if full map view needed) | Required peer for Mapbox Search JS React |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@veriff/js-sdk` | ^2.x | Embed Veriff verification widget | KYC provider SDK; handles document capture + liveness in iframe |
| `react-hook-form` | ^7.x (already installed) | Booking wizard form state across steps | Already in project; use `useForm` with Zod resolver for each wizard step |
| `zod` | ^4.x (already installed) | Per-step schema validation | Already in project |
| `react-day-picker` | ^9.x (already installed) | Date range picker with disabled booked ranges | Already in project; use `mode="range"` with `disabled` matchers |
| `date-fns` | ^4.x (already installed) | Date arithmetic for pricing calculation | Already in project; calculate day/week/month counts |
| `clsx` + `tailwind-merge` | already installed | Conditional class names | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Veriff | Onfido (Entrust) | Onfido: broader doc support (~2,500 IDs), quote-only pricing steep at low volume; Veriff: $0.80/check at Essential, 30-day trial, simpler web SDK |
| Veriff | Persona | Persona: highly customisable flows, US-centric KYB focus, less global doc breadth than Onfido/Veriff; better for US startups |
| Mapbox AddressAutofill | Google Places (new PlaceAutocompleteElement) | Google: more accurate in UAE, but API deprecated for new customers March 2025 — must use new PlaceAutocompleteElement; Mapbox: built-in minimap pin confirmation, more predictable pricing |
| Resend | Nodemailer + SMTP | Resend: React Email templates, deliverability managed, no infra; Nodemailer: fine for SMTP relay but more setup, no React templates |
| Stripe Payment Element | Stripe Checkout (hosted page) | Checkout: fastest integration, less control; Payment Element: embedded in your UI, full design control, required for this luxury experience |
| Stripe stablecoin | Third-party crypto processor (e.g., NOWPayments, CoinGate) | Stripe stablecoin is US-businesses only; if crypto is required, use a dedicated crypto payment processor with direct Supabase webhook integration |

**Installation:**
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install resend @react-email/components
npm install @mapbox/search-js-react mapbox-gl
npm install @veriff/js-sdk
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (protected)/
│   ├── book/
│   │   └── [vehicleId]/
│   │       └── page.tsx          # Booking wizard entry (Server Component, passes vehicle data)
│   ├── bookings/
│   │   ├── page.tsx              # My bookings list (upcoming + past)
│   │   └── [bookingId]/
│   │       └── page.tsx          # Booking detail / confirmation
│   └── verify-identity/
│       └── page.tsx              # KYC step (Veriff widget, triggered from booking flow)
├── api/
│   └── webhooks/
│       └── stripe/
│           └── route.ts          # Stripe webhook handler (raw body, signature verification)
│
components/
├── booking/
│   ├── BookingWizard.tsx         # 'use client' — multi-step wizard shell (state machine)
│   ├── StepDuration.tsx          # Step 1: duration type + dates
│   ├── StepDelivery.tsx          # Step 2: delivery vs pickup + address + return method
│   ├── StepDepositChoice.tsx     # Step 3: deposit vs no-deposit toggle + pricing summary
│   ├── StepIdentity.tsx          # Step 4: KYC trigger / status display (skip if verified)
│   ├── StepPayment.tsx           # Step 5: Stripe Payment Element + Express Checkout
│   └── PriceSummary.tsx          # Live price breakdown component (reused across steps)
├── identity/
│   └── VeriffWidget.tsx          # 'use client' — wraps @veriff/js-sdk
├── email/
│   └── BookingConfirmationEmail.tsx  # React Email template
│
app/actions/
├── bookings.ts                   # createBooking, cancelBooking, getUserBookings
├── payments.ts                   # createPaymentIntent, captureDeposit, voidDeposit
├── identity.ts                   # createVeriffSession, getVerificationStatus
│
lib/
├── stripe/
│   └── server.ts                 # Stripe singleton (server-only)
├── pricing/
│   └── calculator.ts             # Pure function: calculateBookingTotal(vehicle, booking)
└── email/
    └── send.ts                   # Resend send helper

supabase/migrations/
└── 20260220200000_extend_bookings_phase3.sql
```

### Pattern 1: Multi-Step Wizard with React Hook Form

**What:** A client component maintains a `step` state index. Each step has its own Zod schema and `useForm` instance, or one top-level form with `trigger()` for per-field validation before advancing.
**When to use:** Booking flows where each step depends on the previous (dates → delivery → deposit → payment).

```typescript
// Source: react-hook-form advanced usage (react-hook-form.com/advanced-usage)
// BookingWizard.tsx
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bookingSchema, type BookingFormValues } from '@/lib/validations/booking'

const STEPS = ['duration', 'delivery', 'deposit', 'identity', 'payment'] as const

export function BookingWizard({ vehicle }: { vehicle: Vehicle }) {
  const [step, setStep] = useState(0)
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { durationType: 'daily', depositChoice: 'deposit' },
  })

  const advance = async () => {
    const valid = await form.trigger(STEP_FIELDS[step])
    if (valid) setStep(s => s + 1)
  }

  return (
    <>
      {step === 0 && <StepDuration form={form} vehicle={vehicle} />}
      {step === 1 && <StepDelivery form={form} />}
      {/* ... */}
      <button onClick={advance}>Continue</button>
    </>
  )
}
```

### Pattern 2: Live Price Calculation (Uber-style)

**What:** A pure TypeScript function computes the total from form values. Called via `useWatch` from react-hook-form on every relevant field change, triggering a `useMemo` recalculation.
**When to use:** Whenever dates, duration type, delivery choice, or deposit choice changes.

```typescript
// lib/pricing/calculator.ts
import { differenceInDays } from 'date-fns'

export interface BookingPriceBreakdown {
  baseRate: number         // rate per day/week/month
  rentalDays: number
  rentalSubtotal: number
  deliveryFee: number      // 50 AED or 0
  returnFee: number        // 50 AED or 0
  depositAmount: number    // vehicle.deposit_amount or 0
  noDepositSurcharge: number  // daily_rate * 0.30 * days, or 0
  totalDue: number         // rental + delivery + return (deposit is authorized, not charged)
}

export function calculateBookingTotal(
  vehicle: Pick<Vehicle, 'daily_rate' | 'weekly_rate' | 'monthly_rate'>,
  form: {
    startDate: Date
    endDate: Date
    durationType: 'daily' | 'weekly' | 'monthly'
    deliveryMethod: 'delivery' | 'self_pickup'
    returnMethod: 'collection' | 'self_dropoff'
    depositChoice: 'deposit' | 'no_deposit'
  }
): BookingPriceBreakdown {
  const days = differenceInDays(form.endDate, form.startDate) + 1
  // ... calculation logic
}
```

### Pattern 3: Stripe PaymentIntent with Manual Capture (Deposit Hold)

**What:** Create a PaymentIntent server-side with `capture_method: 'manual'`. The client confirms with `stripe.confirmPayment()`. On booking completion (car returned), the server calls `stripe.paymentIntents.capture(id)`. On cancellation, calls `stripe.paymentIntents.cancel(id)` to void the hold.
**When to use:** PAY-06 — deposit is pre-authorized but not charged until the car is returned and inspected.

```typescript
// Source: docs.stripe.com/payments/place-a-hold-on-a-payment-method
// app/actions/payments.ts
'use server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createDepositPaymentIntent(bookingId: string, depositAmountAed: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(depositAmountAed * 100),  // Stripe uses fils (smallest unit)
    currency: 'aed',
    capture_method: 'manual',                    // Auth-only, do not charge yet
    metadata: {
      booking_id: bookingId,
      user_id: user.id,
      type: 'deposit',
    },
  })

  // Store stripe_deposit_pi_id on the booking
  await supabase
    .from('bookings')
    .update({ stripe_deposit_pi_id: paymentIntent.id })
    .eq('id', bookingId)

  return { clientSecret: paymentIntent.client_secret }
}

// On car return — capture the deposit
export async function captureDeposit(bookingId: string) {
  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('stripe_deposit_pi_id, deposit_amount')
    .eq('id', bookingId)
    .single()

  await stripe.paymentIntents.capture(booking.stripe_deposit_pi_id!)
}

// On cancellation — void the hold
export async function voidDeposit(bookingId: string) {
  const supabase = await createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('stripe_deposit_pi_id')
    .eq('id', bookingId)
    .single()

  await stripe.paymentIntents.cancel(booking.stripe_deposit_pi_id!)
}
```

### Pattern 4: Stripe Webhook Handler (Next.js App Router)

**What:** Raw-body API route that verifies Stripe signature before processing. Must use `await req.text()` not `req.json()`.
**When to use:** Receiving `payment_intent.succeeded`, `payment_intent.requires_capture`, `payment_intent.canceled` events.

```typescript
// Source: Stripe + Next.js 15 guide (pedroalonso.net) + Supabase Edge Functions docs
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()  // CRITICAL: raw text, not JSON
  const sig = (await headers()).get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createServiceClient()  // Service role bypasses RLS

  // Idempotency check: deduplicate webhook events
  const { error: dupError } = await supabase
    .from('stripe_webhook_events')
    .insert({ stripe_event_id: event.id, event_type: event.type })
  if (dupError?.code === '23505') {
    // Unique constraint violation — already processed
    return new Response('Already processed', { status: 200 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata.booking_id
      if (pi.metadata.type === 'rental') {
        await supabase.from('bookings')
          .update({ payment_status: 'paid', stripe_rental_pi_id: pi.id })
          .eq('id', bookingId)
      }
      break
    }
    case 'payment_intent.requires_capture': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase.from('bookings')
        .update({ deposit_status: 'held', stripe_deposit_pi_id: pi.id })
        .eq('id', pi.metadata.booking_id)
      break
    }
  }

  return new Response('OK', { status: 200 })
}
```

### Pattern 5: Veriff Identity Verification Widget

**What:** Create a Veriff session server-side (API call with your Veriff API key), return the session URL to the client. The Veriff JS SDK renders in a div and redirects the user through document capture + liveness selfie.
**When to use:** IDV-01 through IDV-05 — first booking only, skip if `profiles.kyc_status = 'verified'`.

```typescript
// app/actions/identity.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function createVeriffSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const res = await fetch('https://stationapi.veriff.com/v1/sessions', {
    method: 'POST',
    headers: {
      'X-AUTH-CLIENT': process.env.VERIFF_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      verification: {
        callback: `${process.env.NEXT_PUBLIC_APP_URL}/verify-identity/callback`,
        person: { firstName: '', lastName: '' },
        vendorData: user.id,
        timestamp: new Date().toISOString(),
      }
    }),
  })

  const data = await res.json()
  // data.verification.url is the session URL to redirect/embed
  return { sessionUrl: data.verification.url, sessionId: data.verification.id }
}
```

```typescript
// components/identity/VeriffWidget.tsx
'use client'
import { createVeriff } from '@veriff/js-sdk'
import { useEffect, useRef } from 'react'

export function VeriffWidget({ sessionUrl }: { sessionUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const veriff = createVeriff({
      apiKey: '', // Not needed when using session URL directly
      parentId: 'veriff-root',
      onSession: (err, response) => {
        if (!err) window.location.href = response.verification.url
      },
    })
    veriff.mount()
  }, [sessionUrl])

  return <div id="veriff-root" ref={containerRef} />
}
```

**Note:** Veriff's preferred mobile web flow redirects users to `sessionUrl`. For best mobile UX (80% of users), redirect to `sessionUrl` in the same tab rather than embedding the iframe. Veriff redirects back to your `callback` URL on completion.

### Pattern 6: Mapbox Address Autofill with Minimap Pin

**What:** Mapbox `AddressAutofill` React component wraps a text input. On address selection, a minimap appears with a draggable pin for pinpoint delivery location.
**When to use:** BOOK-05 — delivery address selection.

```typescript
// Source: docs.mapbox.com/mapbox-search-js/tutorials/add-address-autofill-with-react/
// components/booking/StepDelivery.tsx (excerpt)
'use client'
import { AddressAutofill, AddressMinimap } from '@mapbox/search-js-react'
import { useState } from 'react'

export function StepDelivery({ form }: { form: UseFormReturn<BookingFormValues> }) {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)

  return (
    <AddressAutofill
      accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
      onRetrieve={(res) => {
        const [lng, lat] = res.features[0].geometry.coordinates
        setCoordinates([lng, lat])
        form.setValue('deliveryLng', lng)
        form.setValue('deliveryLat', lat)
      }}
    >
      <input
        placeholder="Enter delivery address"
        autoComplete="address-line1"
        {...form.register('deliveryAddress')}
      />
    </AddressAutofill>
    {coordinates && (
      <AddressMinimap
        accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
        feature={{ type: 'Feature', geometry: { type: 'Point', coordinates } }}
        onSaveMarkerLocation={([lng, lat]) => {
          form.setValue('deliveryLng', lng)
          form.setValue('deliveryLat', lat)
        }}
        canAdjustMarker
        satelliteToggle
      />
    )}
  )
}
```

### Pattern 7: Booking Confirmation Email

**What:** React Email component rendered server-side and sent via Resend SDK on booking creation.
**When to use:** BOOK-07 — immediately after successful payment confirmation.

```typescript
// Source: resend.com/docs/send-with-nextjs
// app/actions/bookings.ts (excerpt)
import { Resend } from 'resend'
import { BookingConfirmationEmail } from '@/components/email/BookingConfirmationEmail'

const resend = new Resend(process.env.RESEND_API_KEY!)

async function sendBookingConfirmation(booking: BookingWithVehicle, userEmail: string) {
  await resend.emails.send({
    from: 'LuxeClub Rentals <bookings@luxeclubrentals.com>',
    to: userEmail,
    subject: `Booking Confirmed — ${booking.vehicle.name}`,
    react: BookingConfirmationEmail({ booking }),
  })
}
```

### Anti-Patterns to Avoid

- **Client-side price calculation as source of truth:** Always re-validate pricing server-side in the Server Action before creating the PaymentIntent. Never trust the amount from the client.
- **Storing raw Stripe webhook data as JSON and processing inline:** Use a `stripe_webhook_events` table for idempotency; process out-of-band if needed.
- **Using `req.json()` in Stripe webhook handler:** Must use `req.text()` to preserve the raw body for signature verification. `req.json()` breaks the HMAC check.
- **Embedding Veriff as an iframe for mobile users:** The Veriff web flow is optimized for redirect. On mobile, open `sessionUrl` in the same tab. Return URL handles the post-verification state update.
- **One PaymentIntent for both deposit and rental:** Keep them separate. The deposit PI uses `capture_method: 'manual'`; the rental payment PI uses `capture_method: 'automatic'`. Separate concerns = easier admin management.
- **Calling `getClaims()` / `getUser()` inside Server Actions without error handling:** If the session is expired mid-wizard, the action will throw. Always check `user` is not null and redirect to `/` if not authenticated.
- **Using Google Maps Places Autocomplete legacy class:** As of March 2025, `google.maps.places.Autocomplete` is unavailable to new customers. Use Mapbox instead, or the new `PlaceAutocompleteElement` if Google is preferred.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card tokenization | Custom card form | Stripe PaymentElement | PCI DSS — card data must not touch your server; Stripe handles encryption and compliance |
| Apple Pay / Google Pay integration | Native wallet APIs | Stripe ExpressCheckoutElement | Domain verification, wallet API versioning, device detection all handled by Stripe |
| Liveness detection / face match | OpenCV selfie comparison | Veriff / Onfido SDK | ISO 30107-3 certified liveness, anti-spoofing, legal compliance — weeks of R&D to match |
| Document OCR | Tesseract.js | Veriff / Onfido | Accuracy, fraud signals, cross-reference with government databases |
| Address autocomplete with geocoding | Manual Places API calls | Mapbox AddressAutofill | Session management for cost, validation, pin-drop minimap all built-in |
| Email HTML templates | HTML strings in code | React Email + Resend | Email client compatibility matrix is an abyss; React Email components are pre-tested |
| Webhook idempotency | Ad-hoc flag fields | DB unique constraint on `stripe_event_id` | Atomic and race-condition-safe; duplicate webhook fires can't corrupt state |
| Pricing arithmetic server-side validation | Trust client total | Pure function in `lib/pricing/calculator.ts` | Clients can manipulate form values; always recompute before creating PaymentIntent |

**Key insight:** In payments and identity, the regulatory and fraud surface area dwarfs the apparent complexity. Every "it's just X" shortcut in these domains has a real-world fraud or compliance consequence.

---

## Common Pitfalls

### Pitfall 1: Deposit Authorization Expiry (7-Day Default)

**What goes wrong:** A customer books a 14-day rental and pays the deposit. The authorization hold expires after 7 days (Visa/Mastercard/Amex standard for card-not-present). The deposit is automatically released. When the car is returned the admin tries to capture and gets an error.

**Why it happens:** Stripe's default `capture_method: 'manual'` holds expire per card network rules: 7 days for online transactions.

**How to avoid:** Request Extended Authorization at PaymentIntent creation:
```typescript
await stripe.paymentIntents.create({
  capture_method: 'manual',
  payment_method_options: {
    card: { request_extended_authorization: 'if_available' },
  },
})
```
Extended auth extends the hold to up to 30 days. Requires IC+ pricing (contact Stripe). No regional restrictions documented for UAE. Alternatively, charge the deposit upfront at booking and refund on return — simpler, no hold expiry risk, but worse UX.

**Warning signs:** Deposit capture failures in production for bookings > 7 days. Test with `payment_intent.requires_capture` webhook; if you don't receive it within 7 days, the hold lapsed.

---

### Pitfall 2: Stripe Stablecoin / Crypto — UAE-Registered Businesses Cannot Accept

**What goes wrong:** PAY-04 calls for crypto payment. Stripe stablecoin payments (USDC on Ethereum/Solana/Polygon/Base) require a US-registered Stripe account. A UAE-registered Stripe account cannot enable this feature.

**Why it happens:** Stripe crypto is in limited geographic rollout; as of 2025, only US businesses can accept stablecoin payments, though customers globally can pay.

**How to avoid:** For Phase 3, implement PAY-04 via a dedicated crypto processor (NOWPayments, CoinGate, or BitPay). These integrate via a redirect or iframe and fire webhooks to your API on payment. Or, defer PAY-04 post-launch and use a "contact us for crypto" flow for v1.

**Warning signs:** Attempting to add `crypto` to `payment_method_types` on a UAE Stripe account will return an API error.

---

### Pitfall 3: Apple Pay Domain Registration Failure in Production

**What goes wrong:** Apple Pay button renders in development (test mode) but silently disappears in production because the domain isn't registered.

**Why it happens:** Apple requires all domains showing an Apple Pay button to be registered via a verification file hosted at `/.well-known/apple-developer-merchantid-domain-association`. This applies to every subdomain separately.

**How to avoid:**
1. Register domain in Stripe Dashboard → Settings → Payment Methods → Apple Pay
2. Download the verification file and serve it as a static file:
   - In Next.js: place in `public/.well-known/apple-developer-merchantid-domain-association` (no file extension)
3. Register in test mode AND live mode separately
4. Register every subdomain you use (e.g., both `luxeclubrentals.com` and `www.luxeclubrentals.com`)

**Warning signs:** Apple Pay button not rendering in production Safari; `onReady` callback from ExpressCheckoutElement shows Apple Pay not in the `availablePaymentMethods` list.

---

### Pitfall 4: Next.js Server Action 1MB Body Limit for File Uploads

**What goes wrong:** Users uploading passport or driving license scans (can be 2–10MB) via a Server Action receive a silent failure or "body too large" error.

**Why it happens:** Next.js imposes a 1MB default body size limit on Server Actions.

**How to avoid:** Use Supabase Storage signed upload URLs. The Server Action generates a presigned URL; the client uploads directly to Supabase Storage from the browser:

```typescript
// Server Action — generate upload URL only
export async function getDocumentUploadUrl(filename: string, bucketPath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .createSignedUploadUrl(`${auth.uid()}/${bucketPath}/${filename}`)
  if (error) throw error
  return { signedUrl: data.signedUrl, token: data.token }
}
```

```typescript
// Client — upload directly to Supabase
const { signedUrl } = await getDocumentUploadUrl(file.name, 'passport')
await supabase.storage.from('kyc-documents').uploadToSignedUrl(path, token, file)
```

**Warning signs:** Upload succeeds for small test PDFs but fails silently for real passport scans.

---

### Pitfall 5: RLS on `bookings` Table Blocks Admin Operations

**What goes wrong:** Admin tries to update a booking's status (confirm, complete, cancel) via the admin dashboard. The update silently fails because RLS policy `"Users can view own bookings"` blocks the operation.

**Why it happens:** The existing `bookings` RLS only allows `auth.uid() = user_id`. There are no UPDATE or INSERT policies for admin.

**How to avoid:** Add admin policies to the migration:
```sql
-- Admin can do all operations on bookings
CREATE POLICY "Admin can manage all bookings"
  ON bookings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```
Or use the service role client (`lib/supabase/admin.ts`) in Server Actions that require admin-level access (webhook handler, admin dashboard mutations).

**Warning signs:** Admin dashboard shows bookings (SELECT works via RLS bypass in the existing RPC) but status update calls return empty data.

---

### Pitfall 6: KYC Webhook Race Condition with Booking State

**What goes wrong:** User completes Veriff verification but the webhook arrives after the booking has already been set to a "pending KYC" state. Or, the user is shown "verification pending" even though Veriff has already approved them, because the webhook hasn't been processed yet.

**Why it happens:** Veriff webhooks are asynchronous. The user finishes the verification flow in < 30 seconds but the automated decision can take up to 5 minutes.

**How to avoid:**
- Show `verification_status: 'submitted'` immediately after the Veriff session completes (via callback URL)
- Poll `/api/kyc-status?bookingId=X` every 5 seconds for up to 10 minutes using `setInterval` in the booking confirmation step, or use Supabase Realtime to push the status update when the webhook updates `profiles.kyc_status`
- Veriff webhook events: `verification.approved`, `verification.resubmission_requested`, `verification.declined` — update `profiles.kyc_status` accordingly

---

### Pitfall 7: UAE PDPL Compliance for PII Storage

**What goes wrong:** Storing passport scans, selfie photos, and driving license images in Supabase Storage without a lawful basis or without disclosing retention policy violates the UAE Personal Data Protection Law (PDPL), Federal Decree-Law No. 45 of 2021.

**Why it happens:** PDPL applies to any processing of personal data of individuals in the UAE (extraterritorial scope). Tourists are covered. Data must be processed with a lawful basis (e.g., contractual necessity for rental).

**How to avoid:**
- In Phase 3: store KYC documents in a private Supabase Storage bucket with user-scoped RLS. Do not expose documents publicly.
- Add a clear privacy notice / consent checkbox before initiating KYC that explains: what data is collected, why (UAE rental regulations, RTA compliance), how long it's retained, and user rights.
- Defer server-to-server KYC data sharing with third parties (Veriff already handles their data obligations under their DPA).
- Flag: "UAE legal review required before production PII storage" — do not go live without legal sign-off.

---

## Code Examples

### Bookings Table Extension Migration

```sql
-- supabase/migrations/20260220200000_extend_bookings_phase3.sql
-- Extend bookings table with all Phase 3 fields

-- Duration and pricing
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS duration_type TEXT CHECK (duration_type IN ('daily', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS start_time TIME,  -- time of day for pickup

  -- Delivery / return
  ADD COLUMN IF NOT EXISTS pickup_method TEXT CHECK (pickup_method IN ('delivery', 'self_pickup')) DEFAULT 'self_pickup',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS return_method TEXT CHECK (return_method IN ('collection', 'self_dropoff')) DEFAULT 'self_dropoff',

  -- Deposit
  ADD COLUMN IF NOT EXISTS deposit_choice TEXT CHECK (deposit_choice IN ('deposit', 'no_deposit')) DEFAULT 'deposit',
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2),

  -- Pricing breakdown (snapshot at booking time)
  ADD COLUMN IF NOT EXISTS rental_subtotal NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_deposit_surcharge NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_due NUMERIC(10, 2),

  -- Payment
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('card', 'apple_pay', 'google_pay', 'cash')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS stripe_rental_pi_id TEXT,      -- PaymentIntent for rental charge
  ADD COLUMN IF NOT EXISTS stripe_deposit_pi_id TEXT,     -- PaymentIntent for deposit hold
  ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'held', 'captured', 'voided')),

  -- Updated timestamp
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- KYC status on profiles (not bookings — status is per-user, not per-booking)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'none' CHECK (kyc_status IN ('none', 'submitted', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS kyc_provider TEXT,              -- 'veriff'
  ADD COLUMN IF NOT EXISTS kyc_session_id TEXT,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

-- Stripe webhook idempotency table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additional bookings policies
CREATE POLICY "Admin can manage all bookings"
  ON bookings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime on bookings for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

### Stripe Payment Element Setup (Client Component)

```typescript
// Source: docs.stripe.com/sdks/stripejs-react
// components/booking/StepPayment.tsx
'use client'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
// IMPORTANT: loadStripe() called OUTSIDE component to avoid recreating on every render

interface StepPaymentProps {
  clientSecret: string   // from createPaymentIntent Server Action
  onSuccess: () => void
}

export function StepPayment({ clientSecret, onSuccess }: StepPaymentProps) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm onSuccess={onSuccess} />
    </Elements>
  )
}

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/confirmation`,
      },
      redirect: 'if_required',  // Avoids redirect for card payments
    })

    if (!error) onSuccess()
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Express Checkout renders Apple Pay / Google Pay buttons */}
      <ExpressCheckoutElement onConfirm={() => { /* handled by Stripe */ }} />
      <div className="my-4 text-brand-muted text-sm text-center">or pay with card</div>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>Pay Now</button>
    </form>
  )
}
```

### React DayPicker Range Selection

```typescript
// Source: daypicker.dev/selections/disabling-dates
// components/booking/StepDuration.tsx (excerpt)
'use client'
import { DayPicker, DateRange } from 'react-day-picker'
import { useState } from 'react'

export function DateRangePicker({
  bookedRanges,
  onChange,
}: {
  bookedRanges: Array<{ from: Date; to: Date }>
  onChange: (range: DateRange) => void
}) {
  const [range, setRange] = useState<DateRange | undefined>()

  return (
    <DayPicker
      mode="range"
      selected={range}
      onSelect={(r) => { setRange(r); if (r?.from && r?.to) onChange(r) }}
      disabled={[
        { before: new Date() },
        ...bookedRanges,  // Array of { from: Date, to: Date } — same shape as DateRange
      ]}
      excludeDisabled  // Prevents selecting a range that spans disabled dates
      numberOfMonths={2}
      // Reuse existing classNames from AvailabilityCalendar.tsx
    />
  )
}
```

### Supabase Realtime Booking Status

```typescript
// Source: supabase.com/docs/guides/realtime/postgres-changes
// components/booking/BookingStatusPoller.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function BookingStatusListener({ bookingId }: { bookingId: string }) {
  const [status, setStatus] = useState<string>('pending')
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`booking:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          setStatus(payload.new.status)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId])

  return <div>Booking status: {status}</div>
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Places Autocomplete class | `PlaceAutocompleteElement` or Mapbox | March 2025 | New Google Maps customers cannot use the legacy `Autocomplete` class; Mapbox is now the cleaner default |
| Stripe Payment Request Button | `ExpressCheckoutElement` | 2024 | Payment Request Button is legacy; Express Checkout handles Apple Pay + Google Pay + Link + PayPal in one component |
| Onfido standalone → Entrust ownership | Onfido now operates under Entrust brand | April 2024 | SDK docs at `documentation.identity.entrust.com`; API and SDK are unchanged |
| Stripe Checkout (hosted page) | Stripe Elements (embedded UI) | Ongoing | Elements gives full design control needed for luxury theme; Checkout is fine for prototypes |
| Supabase `createClientComponentClient` (auth-helpers) | `@supabase/ssr` createBrowserClient | 2024 | `auth-helpers` deprecated; project already uses `@supabase/ssr` |

**Deprecated/outdated:**
- `google.maps.places.Autocomplete`: Unavailable to new customers as of March 1, 2025. Use `PlaceAutocompleteElement` (new Google) or Mapbox AddressAutofill.
- `@supabase/auth-helpers-nextjs`: Deprecated; project correctly uses `@supabase/ssr`.
- Stripe Payment Request Button: Replaced by `ExpressCheckoutElement`.

---

## Open Questions

1. **Deposit hold duration for rentals longer than 7 days**
   - What we know: Standard card-not-present auth hold is 7 days; Extended Authorization allows up to 30 days but requires IC+ pricing from Stripe
   - What's unclear: Is LuxeClub on IC+ pricing? Can they get it for UAE account?
   - Recommendation: Contact Stripe support to confirm Extended Auth availability for UAE account. If not available, consider charging deposit outright and refunding on return (simpler, no expiry risk)

2. **Crypto payment (PAY-04) viability**
   - What we know: Stripe stablecoin is US-only. Stripe UAE account cannot use it.
   - What's unclear: Is PAY-04 a hard requirement for v1 or can it be deferred?
   - Recommendation: Defer to Phase 4. If needed for v1, integrate a crypto-native processor (NOWPayments has UAE support and a REST API) as a separate payment path.

3. **Veriff UAE document coverage**
   - What we know: Veriff claims 12,000+ documents, passive liveness, $0.80/check Essential tier
   - What's unclear: Explicit UAE passport and driving license support not confirmed from official docs (website JS-blocked the SDK docs page)
   - Recommendation: Start Veriff free trial and test with UAE passport before committing; Onfido has explicit 2,500-document coverage including UAE as a fallback.

4. **KYC data storage — Supabase vs KYC provider only**
   - What we know: PDPL requires lawful basis for PII storage; Veriff stores verification data on their servers (covered by their DPA)
   - What's unclear: Does LuxeClub need to retain document images at all, or is a verified status flag + Veriff report ID sufficient?
   - Recommendation: For v1, do not store document images in Supabase Storage. Store only `kyc_status`, `kyc_session_id`, and `kyc_verified_at` on `profiles`. Veriff retains the actual documents. This minimizes PDPL exposure.

5. **Cash on delivery (PAY-05) workflow**
   - What we know: No Stripe integration needed; admin manually confirms cash receipt
   - What's unclear: How does the system prevent cars being dispatched before cash is confirmed?
   - Recommendation: Cash bookings create a booking with `payment_status: 'pending_cash'`. Admin dashboard shows these as requiring manual confirmation. Car dispatch is blocked until admin marks as `payment_status: 'paid'`. Stripe not involved for cash bookings.

6. **Mapbox pricing for UAE users**
   - What we know: Mapbox charges per API call for autocomplete (each character entry and final selection)
   - What's unclear: Volume estimates for UAE addresses, cost per month at projected booking volumes
   - Recommendation: Mapbox free tier includes 50,000 address autofill sessions/month. At typical booking volumes (hundreds/month not thousands), cost is minimal. Monitor and upgrade if needed.

---

## Sources

### Primary (HIGH confidence)
- `docs.stripe.com/payments/place-a-hold-on-a-payment-method` — manual capture PaymentIntent, hold durations, capture/void flow
- `docs.stripe.com/payments/extended-authorization` — 30-day hold, IC+ pricing requirement, no UAE regional restrictions
- `docs.stripe.com/elements/express-checkout-element` — Apple Pay + Google Pay via ExpressCheckoutElement
- `docs.stripe.com/sdks/stripejs-react` — Elements provider, PaymentElement, useStripe/useElements hooks, CheckoutProvider pattern
- `docs.stripe.com/apple-pay` — domain verification file at `/.well-known/apple-developer-merchantid-domain-association`
- `docs.stripe.com/payments/accept-stablecoin-payments` — confirmed US-only restriction for accepting stablecoins
- `supabase.com/docs/guides/storage/security/access-control` — RLS policy patterns for private buckets, user-scoped folder paths
- `supabase.com/docs/guides/functions/examples/stripe-webhooks` — webhook signature verification with raw body
- `resend.com/docs/send-with-nextjs` — Resend + React Email integration pattern for Next.js App Router
- `daypicker.dev/selections/disabling-dates` — `disabled` prop matcher types, `excludeDisabled` for range mode
- `docs.mapbox.com/mapbox-search-js/api/react/autofill/` — AddressAutofill React component, minimap, pin confirmation
- `github.com/Veriff/veriff-js-sdk` — Veriff JS SDK initialization, session URL flow, `@veriff/js-sdk` npm package

### Secondary (MEDIUM confidence)
- `veriff.com/plans/self-serve` — $49/month Essential, $0.80/check, 30-day/100-verification free trial (verified on Veriff website)
- `beverified.org/providers/veriff/` — Veriff vs Onfido comparison (third-party, cross-referenced with official sites)
- `support.stripe.com/questions/which-payments-methods-and-products-are-available-in-the-uae` — UAE supports Visa, Mastercard, Apple Pay, Google Pay, Link (JS-blocked page; cross-verified via Stripe UAE developer blog)
- `stripe.dev/blog/getting-started-with-stripe-in-the-uae` — UAE Stripe account availability confirmed
- `feecalculator.io/stripe-fees-united-arab-emirates` — 2.9% + AED 1.00 domestic, 3.9% + 1% international (third-party, widely cited)
- `pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/` — Server Action + webhook patterns for Next.js 15
- `documentation.identity.entrust.com/getting-started/quick-start-guide/` — Onfido (Entrust) 8-step integration flow, webhook events, SDK token + workflow run ID pattern

### Tertiary (LOW confidence — requires validation)
- Veriff UAE document coverage (passport + driving license): website confirmed via marketing copy but specific document list behind account signup
- Crypto payment via third-party processor for UAE (NOWPayments availability): mentioned in community resources, not directly verified
- Exact Stripe IC+ pricing availability for UAE accounts: documented feature, UAE availability inferred from "no regional restrictions" language

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs/npm
- Architecture patterns: HIGH — based on official Stripe, Supabase, react-hook-form, react-day-picker documentation
- Stripe UAE payment methods: HIGH — confirmed via Stripe support and developer blog
- Stripe stablecoin UAE block: HIGH — explicitly documented on official Stripe docs
- KYC provider (Veriff): MEDIUM — pricing verified, UAE doc coverage needs trial confirmation
- Mapbox AddressAutofill: HIGH — official docs verified, Google deprecation confirmed via GitHub issue
- Pitfalls: HIGH for deposit expiry/webhook patterns (official docs), MEDIUM for KYC-specific pitfalls (based on provider patterns)
- UAE PDPL compliance: MEDIUM — law text verified, specific technical requirements unclear pending executive regulations

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days — Stripe and Supabase are stable; Veriff pricing may change)
