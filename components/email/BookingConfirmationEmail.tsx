import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
} from '@react-email/components'

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
    durationType: 'daily' | 'weekly' | 'monthly'
    pickupMethod: 'delivery' | 'self_pickup'
    returnMethod: 'collection' | 'self_dropoff'
    deliveryAddress?: string | null
    depositChoice: 'deposit' | 'no_deposit'
    rentalSubtotal: number
    deliveryFee: number
    returnFee: number
    noDepositSurcharge: number
    depositAmount: number
    totalDue: number
    paymentMethod: 'card' | 'apple_pay' | 'google_pay' | 'cash'
    status: string
  }
}

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

function formatAED(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDurationType(type: string): string {
  if (type === 'daily') return 'Daily'
  if (type === 'weekly') return 'Weekly'
  if (type === 'monthly') return 'Monthly'
  return type
}

function formatPickupMethod(method: string): string {
  if (method === 'delivery') return 'Delivery to your location'
  return 'Office Pickup — Downtown Dubai'
}

function formatReturnMethod(method: string): string {
  if (method === 'collection') return 'Collection from your location'
  return 'Office Return — Downtown Dubai'
}

function formatPaymentMethod(method: string): string {
  if (method === 'cash') return 'Cash on Delivery'
  if (method === 'apple_pay') return 'Apple Pay'
  if (method === 'google_pay') return 'Google Pay'
  return 'Card'
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  body: {
    backgroundColor: '#000000',
    margin: '0',
    padding: '0',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  container: {
    maxWidth: '580px',
    margin: '0 auto',
    padding: '0',
    backgroundColor: '#0a0a0a',
  },
  header: {
    backgroundColor: '#000000',
    padding: '32px 40px 24px',
    borderBottom: '1px solid #1a1a1a',
  },
  brandName: {
    color: '#ffffff',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '20px',
    fontWeight: '600',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    margin: '0 0 4px 0',
  },
  brandTagline: {
    color: '#666666',
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    margin: '0',
  },
  heroSection: {
    padding: '40px 40px 32px',
    textAlign: 'center' as const,
  },
  confirmedHeading: {
    color: '#00ccff',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '13px',
    fontWeight: '400',
    letterSpacing: '0.3em',
    textTransform: 'uppercase' as const,
    margin: '0 0 12px 0',
  },
  vehicleHeading: {
    color: '#ffffff',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '28px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
  },
  statusBadge: {
    display: 'inline-block',
    backgroundColor: '#003344',
    border: '1px solid #00ccff33',
    borderRadius: '20px',
    color: '#00ccff',
    fontSize: '11px',
    fontFamily: 'Arial, Helvetica, sans-serif',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    padding: '4px 16px',
    margin: '8px 0 0 0',
  },
  vehicleImage: {
    borderRadius: '4px',
    display: 'block',
    margin: '24px auto 0',
  },
  sectionContainer: {
    padding: '0 40px',
  },
  sectionTitle: {
    color: '#00ccff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.25em',
    textTransform: 'uppercase' as const,
    margin: '0 0 16px 0',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  detailLabel: {
    color: '#888888',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    margin: '0',
  },
  detailValue: {
    color: '#ffffff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    textAlign: 'right' as const,
    margin: '0',
  },
  divider: {
    borderColor: '#1a1a1a',
    margin: '24px 0',
  },
  pricingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  pricingLabel: {
    color: '#888888',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    margin: '0',
  },
  pricingValue: {
    color: '#cccccc',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    margin: '0',
  },
  totalLabel: {
    color: '#ffffff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0',
  },
  totalValue: {
    color: '#ffffff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0',
  },
  depositNote: {
    color: '#888888',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11px',
    fontStyle: 'italic',
    margin: '4px 0 0 0',
    textAlign: 'right' as const,
  },
  paymentBadgeContainer: {
    textAlign: 'center' as const,
    padding: '24px 0',
  },
  paymentBadge: {
    display: 'inline-block',
    backgroundColor: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    color: '#aaaaaa',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    padding: '8px 20px',
  },
  referenceContainer: {
    backgroundColor: '#0d0d0d',
    border: '1px solid #1a1a1a',
    borderRadius: '4px',
    padding: '16px 24px',
    margin: '0 40px 32px',
    textAlign: 'center' as const,
  },
  referenceLabel: {
    color: '#666666',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '10px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    margin: '0 0 6px 0',
  },
  referenceValue: {
    color: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '0.15em',
    margin: '0',
  },
  footer: {
    backgroundColor: '#000000',
    borderTop: '1px solid #1a1a1a',
    padding: '24px 40px',
    textAlign: 'center' as const,
  },
  footerText: {
    color: '#444444',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11px',
    margin: '0 0 4px 0',
    lineHeight: '1.5',
  },
  footerLink: {
    color: '#444444',
    fontSize: '11px',
    fontFamily: 'Arial, Helvetica, sans-serif',
    textDecoration: 'underline',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingConfirmationEmail({ booking }: BookingConfirmationEmailProps) {
  const dateRange = `${formatDate(booking.startDate)} — ${formatDate(booking.endDate)}`
  const bookingRef = booking.id.replace(/-/g, '').substring(0, 8).toUpperCase()

  return (
    <Html lang="en">
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* ---- Header / Brand ---- */}
          <Section style={styles.header}>
            <Text style={styles.brandName}>LuxeClub</Text>
            <Text style={styles.brandTagline}>Luxury Car Rentals · Downtown Dubai</Text>
          </Section>

          {/* ---- Hero / Confirmation ---- */}
          <Section style={styles.heroSection}>
            <Text style={styles.confirmedHeading}>Booking Confirmed</Text>
            <Heading as="h1" style={styles.vehicleHeading}>{booking.vehicleName}</Heading>
            <Text style={styles.statusBadge}>
              {booking.status === 'pending_cash' ? 'Pending Cash Payment' : 'Confirmed'}
            </Text>
            {booking.vehicleImage && (
              <Img
                src={booking.vehicleImage}
                alt={booking.vehicleName}
                width={460}
                height={260}
                style={styles.vehicleImage}
              />
            )}
          </Section>

          <Hr style={styles.divider} />

          {/* ---- Booking Details ---- */}
          <Section style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Booking Details</Text>

            {/* Dates */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={styles.detailLabel}>Dates</td>
                  <td style={{ ...styles.detailValue, textAlign: 'right' }}>{dateRange}</td>
                </tr>
              </tbody>
            </table>

            {/* Duration type */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={styles.detailLabel}>Rate Type</td>
                  <td style={{ ...styles.detailValue, textAlign: 'right' }}>{formatDurationType(booking.durationType)}</td>
                </tr>
              </tbody>
            </table>

            {/* Pickup */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={styles.detailLabel}>Pickup</td>
                  <td style={{ ...styles.detailValue, textAlign: 'right' }}>{formatPickupMethod(booking.pickupMethod)}</td>
                </tr>
              </tbody>
            </table>

            {/* Delivery address */}
            {booking.pickupMethod === 'delivery' && booking.deliveryAddress && (
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <td style={styles.detailLabel}>Delivery Address</td>
                    <td style={{ ...styles.detailValue, textAlign: 'right', maxWidth: '260px' }}>{booking.deliveryAddress}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Return */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '0' }}>
              <tbody>
                <tr>
                  <td style={styles.detailLabel}>Return</td>
                  <td style={{ ...styles.detailValue, textAlign: 'right' }}>{formatReturnMethod(booking.returnMethod)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={{ ...styles.divider, margin: '24px 40px' }} />

          {/* ---- Pricing Breakdown ---- */}
          <Section style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Pricing Breakdown</Text>

            {/* Rental subtotal */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={styles.pricingLabel}>Rental Subtotal</td>
                  <td style={{ ...styles.pricingValue, textAlign: 'right' }}>{formatAED(booking.rentalSubtotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Delivery fee */}
            {booking.deliveryFee > 0 && (
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <td style={styles.pricingLabel}>Delivery Fee</td>
                    <td style={{ ...styles.pricingValue, textAlign: 'right' }}>{formatAED(booking.deliveryFee)}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Return fee */}
            {booking.returnFee > 0 && (
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <td style={styles.pricingLabel}>Return Collection Fee</td>
                    <td style={{ ...styles.pricingValue, textAlign: 'right' }}>{formatAED(booking.returnFee)}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* No-deposit surcharge */}
            {booking.noDepositSurcharge > 0 && (
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <td style={styles.pricingLabel}>No-Deposit Surcharge</td>
                    <td style={{ ...styles.pricingValue, textAlign: 'right' }}>{formatAED(booking.noDepositSurcharge)}</td>
                  </tr>
                </tbody>
              </table>
            )}

            <Hr style={{ borderColor: '#2a2a2a', margin: '12px 0' }} />

            {/* Total */}
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: '0' }}>
              <tbody>
                <tr>
                  <td style={styles.totalLabel}>Total Due</td>
                  <td style={{ ...styles.totalValue, textAlign: 'right' }}>{formatAED(booking.totalDue)}</td>
                </tr>
              </tbody>
            </table>

            {/* Deposit hold */}
            {booking.depositChoice === 'deposit' && booking.depositAmount > 0 && (
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: '12px' }}>
                <tbody>
                  <tr>
                    <td style={styles.pricingLabel}>Security Deposit Hold</td>
                    <td style={{ textAlign: 'right' as const }}>
                      <Text style={{ ...styles.pricingValue, margin: '0', textAlign: 'right' }}>{formatAED(booking.depositAmount)}</Text>
                      <Text style={styles.depositNote}>Pre-authorized, not charged</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Section>

          {/* ---- Payment Method ---- */}
          <Section style={styles.paymentBadgeContainer}>
            <Text style={styles.paymentBadge}>
              Paid via {formatPaymentMethod(booking.paymentMethod)}
            </Text>
          </Section>

          {/* ---- Booking Reference ---- */}
          <Section style={styles.referenceContainer}>
            <Text style={styles.referenceLabel}>Booking Reference</Text>
            <Text style={styles.referenceValue}>{bookingRef}</Text>
          </Section>

          {/* ---- Footer ---- */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>LuxeClub Rentals · Downtown Dubai, UAE</Text>
            <Text style={styles.footerText}>
              Questions? Reply to this email or visit{' '}
              <a href="https://luxeclubrentals.com" style={styles.footerLink}>
                luxeclubrentals.com
              </a>
            </Text>
            <Text style={{ ...styles.footerText, marginTop: '12px' }}>
              <a href="https://luxeclubrentals.com/unsubscribe" style={styles.footerLink}>
                Unsubscribe from booking notifications
              </a>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export default BookingConfirmationEmail
