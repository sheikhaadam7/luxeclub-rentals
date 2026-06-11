import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Img,
  Link,
} from '@react-email/components'
import { DAILY_KM_INCLUDED, EXTRA_KM_RATE_AED } from '@/lib/pricing/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingConfirmationEmailProps {
  booking: {
    id: string
    vehicleName: string
    vehicleImage?: string | null
    startDate: string // ISO date string "YYYY-MM-DD"
    endDate: string   // ISO date string "YYYY-MM-DD"
    /** "HH:mm" 24-hour. Falls back to "10:00" when null. */
    startTime?: string | null
    endTime?: string | null
    pickupMethod: 'delivery' | 'self_pickup'
    returnMethod: 'collection' | 'self_dropoff'
    deliveryAddress?: string | null
    collectionAddress?: string | null
    depositChoice: 'deposit' | 'no_deposit'
    depositAmount: number
    totalDue: number
    /** Flat fee collected at booking time to secure the reservation */
    reservationFee: number
    /** Amount owed in person on pickup day */
    balanceDueOnPickup: number
    paymentMethod: 'card' | 'apple_pay' | 'google_pay' | 'cash' | 'crypto'
    status: string
    /** First name to greet the customer with */
    firstName: string
    /** True if the customer was signed in — show "View or modify booking" CTA */
    isLoggedIn: boolean
  }
}

// ---------------------------------------------------------------------------
// Office address (fallback location label when self-pickup / self-dropoff)
// ---------------------------------------------------------------------------

const OFFICE_ADDRESS = 'Binary Tower, 32 Marasi Drive, Business Bay, Dubai'

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

function formatTime(hhmm: string | null | undefined, fallback = '10:00'): string {
  const t = hhmm || fallback
  const [hStr, mStr] = t.split(':')
  const h = Number(hStr)
  const m = Number(mStr ?? 0)
  if (Number.isNaN(h)) return t
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

function formatAED(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function googleMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ---------------------------------------------------------------------------
// Styles — dark photographic hero + white body cards on a soft grey page
// background. Mirrors the booking wizard's Steps 4–6 visual language so the
// post-pay email feels like a direct continuation of the flow.
// ---------------------------------------------------------------------------

const BRAND_GOLD = '#C9A96E'

const styles = {
  body: {
    backgroundColor: '#f4f4f5',
    margin: '0',
    padding: '0',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0',
    backgroundColor: '#f4f4f5',
  },

  // ---- Hero ----
  heroOuter: {
    backgroundColor: '#0a0a0a',
    padding: '0',
  },
  heroBrandRow: {
    padding: '20px 28px',
  },
  heroBrandName: {
    color: '#ffffff',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    margin: 0,
  },
  heroImageWrap: {
    position: 'relative' as const,
    backgroundColor: '#000000',
  },
  heroImage: {
    display: 'block',
    width: '100%',
    height: 'auto',
    maxHeight: '260px',
    objectFit: 'cover' as const,
  },
  heroCopy: {
    padding: '28px 28px 32px',
    backgroundColor: '#0a0a0a',
  },
  heroBookingNumber: {
    color: '#888888',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    letterSpacing: '0.08em',
    margin: '0 0 12px 0',
  },
  heroHeadline: {
    color: '#ffffff',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: '1.2',
    margin: '0 0 8px 0',
  },
  heroSubtitle: {
    color: '#cccccc',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },

  // ---- Body card shell ----
  cardOuter: {
    padding: '16px 16px 0',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: '12px',
    padding: '24px',
  },
  cardTitle: {
    color: '#18181b',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 16px 0',
  },

  // ---- Itinerary timeline ----
  itineraryRow: {
    paddingBottom: '8px',
  },
  itineraryDate: {
    color: '#18181b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    margin: '0 0 4px 0',
    lineHeight: '1.3',
  },
  itineraryLocation: {
    color: '#52525b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    margin: '0 0 4px 0',
    lineHeight: '1.4',
  },
  itineraryLink: {
    color: '#18181b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'underline',
  },

  // ---- Checklist (What to bring) ----
  checklistRow: {
    paddingBottom: '16px',
  },
  checklistHeading: {
    color: '#18181b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    margin: '0 0 4px 0',
  },
  checklistBody: {
    color: '#52525b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '0 0 4px 0',
  },
  checklistSub: {
    color: '#71717a',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: '0',
  },

  // ---- Included items ----
  includedRow: {
    paddingBottom: '10px',
  },
  includedText: {
    color: '#3f3f46',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    lineHeight: '1.45',
    margin: '0',
  },

  // ---- Payment details ----
  paymentRow: {
    paddingBottom: '10px',
  },
  paymentLabel: {
    color: '#52525b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    margin: 0,
  },
  paymentValue: {
    color: '#18181b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    margin: 0,
  },
  depositExplainer: {
    color: '#52525b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '12px 0 0 0',
  },
  cancelBadge: {
    color: '#15803d',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    margin: '16px 0 4px 0',
  },
  cancelBody: {
    color: '#52525b',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0,
  },

  // ---- CTA button (View or modify booking) ----
  ctaButton: {
    display: 'inline-block',
    backgroundColor: BRAND_GOLD,
    color: '#000000',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: '999px',
    marginTop: '12px',
  },

  // ---- Footer ----
  footer: {
    padding: '24px 28px',
    textAlign: 'center' as const,
  },
  footerText: {
    color: '#71717a',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: '0 0 4px 0',
  },
  footerLink: {
    color: '#71717a',
    fontSize: '12px',
    fontFamily: 'Arial, Helvetica, sans-serif',
    textDecoration: 'underline',
  },
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function Hero({
  firstName,
  bookingRef,
  vehicleName,
  vehicleImage,
}: {
  firstName: string
  bookingRef: string
  vehicleName: string
  vehicleImage?: string | null
}) {
  return (
    <Section style={styles.heroOuter}>
      <Section style={styles.heroBrandRow}>
        <Text style={styles.heroBrandName}>LuxeClub</Text>
      </Section>

      {vehicleImage && (
        <Section style={styles.heroImageWrap}>
          <Img
            src={vehicleImage}
            alt={vehicleName}
            width={600}
            height={260}
            style={styles.heroImage}
          />
        </Section>
      )}

      <Section style={styles.heroCopy}>
        <Text style={styles.heroBookingNumber}>Booking {bookingRef}</Text>
        <Heading as="h1" style={styles.heroHeadline}>
          Your booking is confirmed!
        </Heading>
        <Text style={styles.heroSubtitle}>
          We look forward to seeing you, {firstName}.
        </Text>
      </Section>
    </Section>
  )
}

function Itinerary({
  startDate,
  endDate,
  startTime,
  endTime,
  pickupMethod,
  returnMethod,
  deliveryAddress,
  collectionAddress,
  isLoggedIn,
}: {
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  pickupMethod: 'delivery' | 'self_pickup'
  returnMethod: 'collection' | 'self_dropoff'
  deliveryAddress?: string | null
  collectionAddress?: string | null
  isLoggedIn: boolean
}) {
  const pickupLocation =
    pickupMethod === 'delivery' && deliveryAddress
      ? deliveryAddress
      : OFFICE_ADDRESS
  const returnLocation =
    returnMethod === 'collection' && collectionAddress
      ? collectionAddress
      : OFFICE_ADDRESS

  return (
    <Section style={styles.cardOuter}>
      <Section style={styles.card}>
        <Heading as="h2" style={styles.cardTitle}>Your itinerary</Heading>

        <Section style={styles.itineraryRow}>
          <Text style={styles.itineraryDate}>
            Pickup on {formatDate(startDate)} at {formatTime(startTime)}
          </Text>
          <Text style={styles.itineraryLocation}>{pickupLocation}</Text>
          <Link href={googleMapsHref(pickupLocation)} style={styles.itineraryLink}>
            See directions
          </Link>
        </Section>

        <Section style={{ paddingTop: '14px' }}>
          <Text style={styles.itineraryDate}>
            Return on {formatDate(endDate)} at {formatTime(endTime, '20:00')}
          </Text>
          <Text style={styles.itineraryLocation}>{returnLocation}</Text>
        </Section>

        {isLoggedIn && (
          <Section style={{ paddingTop: '8px' }}>
            <Link href="https://luxeclubrentals.com/bookings" style={styles.ctaButton}>
              View or modify booking
            </Link>
          </Section>
        )}
      </Section>
    </Section>
  )
}

function WhatToBring() {
  return (
    <Section style={styles.cardOuter}>
      <Section style={styles.card}>
        <Heading as="h2" style={styles.cardTitle}>What you need to bring at pickup</Heading>

        <Section style={styles.checklistRow}>
          <Text style={styles.checklistHeading}>Driver&apos;s licence</Text>
          <Text style={styles.checklistBody}>
            <strong>UAE residents:</strong> a valid UAE driving licence.
          </Text>
          <Text style={styles.checklistSub}>
            <strong>Visitors:</strong> a valid physical driving licence from your home
            country (with an International Driving Permit if your licence is not in
            English or Arabic).
          </Text>
        </Section>

        <Section style={styles.checklistRow}>
          <Text style={styles.checklistHeading}>Identification</Text>
          <Text style={styles.checklistBody}>
            <strong>UAE residents:</strong> your Emirates ID.
          </Text>
          <Text style={styles.checklistSub}>
            <strong>Visitors:</strong> a valid passport.
          </Text>
        </Section>

        <Section>
          <Text style={styles.checklistHeading}>Payment method</Text>
          <Text style={styles.checklistBody}>
            A physical credit card in the renter&apos;s name.
          </Text>
          <Text style={styles.checklistSub}>
            See{' '}
            <Link href="https://luxeclubrentals.com/contact" style={{ color: '#52525b', textDecoration: 'underline' }}>
              rental conditions
            </Link>{' '}
            for accepted payment methods.
          </Text>
        </Section>
      </Section>
    </Section>
  )
}

function IncludedInBooking({ depositAmount }: { depositAmount: number }) {
  return (
    <Section style={styles.cardOuter}>
      <Section style={styles.card}>
        <Heading as="h2" style={styles.cardTitle}>What&apos;s included in your booking</Heading>

        <Section style={styles.includedRow}>
          <Text style={styles.includedText}>Third-party insurance.</Text>
        </Section>

        <Section style={styles.includedRow}>
          <Text style={styles.includedText}>
            Up to {DAILY_KM_INCLUDED.toLocaleString()} km per day, AED {EXTRA_KM_RATE_AED} per
            additional kilometre.
          </Text>
        </Section>

        {depositAmount > 0 && (
          <Section style={styles.includedRow}>
            <Text style={styles.includedText}>
              Deductible up to {formatAED(depositAmount)} for collision damage or theft.
            </Text>
          </Section>
        )}
      </Section>
    </Section>
  )
}

function PaymentDetails({
  totalDue,
  reservationFee,
  balanceDueOnPickup,
  depositChoice,
  depositAmount,
  startDate,
}: {
  totalDue: number
  reservationFee: number
  balanceDueOnPickup: number
  depositChoice: 'deposit' | 'no_deposit'
  depositAmount: number
  startDate: string
}) {
  const showDepositHold = depositChoice === 'deposit' && depositAmount > 0

  return (
    <Section style={styles.cardOuter}>
      <Section style={styles.card}>
        <Heading as="h2" style={styles.cardTitle}>Payment details</Heading>

        {/* Paid today */}
        <table width="100%" cellPadding="0" cellSpacing="0" style={styles.paymentRow}>
          <tbody>
            <tr>
              <td style={styles.paymentLabel}>Paid today (reservation fee)</td>
              <td style={{ ...styles.paymentValue, textAlign: 'right' }}>
                {formatAED(reservationFee)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Balance due on pickup */}
        {balanceDueOnPickup > 0 && (
          <table width="100%" cellPadding="0" cellSpacing="0" style={styles.paymentRow}>
            <tbody>
              <tr>
                <td style={styles.paymentLabel}>Rental amount to pay at pickup</td>
                <td style={{ ...styles.paymentValue, textAlign: 'right' }}>
                  {formatAED(balanceDueOnPickup)}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Booking total */}
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ ...styles.paymentRow, paddingTop: '8px', borderTop: '1px solid #e4e4e7' }}>
          <tbody>
            <tr>
              <td style={{ ...styles.paymentLabel, paddingTop: '10px' }}>Booking total</td>
              <td style={{ ...styles.paymentValue, textAlign: 'right', paddingTop: '10px' }}>
                {formatAED(totalDue)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Refundable deposit hold */}
        {showDepositHold && (
          <Text style={styles.depositExplainer}>
            <strong style={{ color: '#18181b' }}>Refundable deposit hold.</strong>{' '}
            At pickup, we place a temporary {formatAED(depositAmount)} hold on
            your card. It is not a charge and is released within a few business
            days of returning the vehicle.
          </Text>
        )}

        {/* Free cancellation badge */}
        <Text style={styles.cancelBadge}>
          ✓ Free cancellation until {formatDate(startDate)}
        </Text>
        <Text style={styles.cancelBody}>
          You can cancel or modify your booking for a full refund up to 24 hours
          before pickup. Cancellations within 24 hours of the start time, or
          no-shows, forfeit the {formatAED(reservationFee)} reservation fee.
        </Text>
      </Section>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingConfirmationEmail({ booking }: BookingConfirmationEmailProps) {
  const bookingRef = booking.id.replace(/-/g, '').substring(0, 8).toUpperCase()

  return (
    <Html lang="en">
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>

          <Hero
            firstName={booking.firstName}
            bookingRef={bookingRef}
            vehicleName={booking.vehicleName}
            vehicleImage={booking.vehicleImage ?? null}
          />

          <Itinerary
            startDate={booking.startDate}
            endDate={booking.endDate}
            startTime={booking.startTime}
            endTime={booking.endTime}
            pickupMethod={booking.pickupMethod}
            returnMethod={booking.returnMethod}
            deliveryAddress={booking.deliveryAddress}
            collectionAddress={booking.collectionAddress}
            isLoggedIn={booking.isLoggedIn}
          />

          <WhatToBring />

          <IncludedInBooking depositAmount={booking.depositAmount} />

          <PaymentDetails
            totalDue={booking.totalDue}
            reservationFee={booking.reservationFee}
            balanceDueOnPickup={booking.balanceDueOnPickup}
            depositChoice={booking.depositChoice}
            depositAmount={booking.depositAmount}
            startDate={booking.startDate}
          />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              LuxeClub Rentals · {OFFICE_ADDRESS}
            </Text>
            <Text style={styles.footerText}>
              Questions? Reply to this email or visit{' '}
              <Link href="https://luxeclubrentals.com" style={styles.footerLink}>
                luxeclubrentals.com
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export default BookingConfirmationEmail
