/**
 * One-off preview: renders BookingConfirmationEmail to two HTML files
 * (Cash flow and Card flow) so you can open them in a browser to see
 * exactly how the email looks before any real send.
 *
 * Run:
 *   npx tsx scripts/preview-booking-email.tsx
 *
 * Output:
 *   tmp/email-preview-cash.html
 *   tmp/email-preview-card.html
 *
 * Then open both in your browser.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '@react-email/render'
import { BookingConfirmationEmail } from '../components/email/BookingConfirmationEmail'

const TMP_DIR = resolve(process.cwd(), 'tmp')
mkdirSync(TMP_DIR, { recursive: true })

const baseBooking = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  vehicleName: 'Audi Q3 S Line',
  vehicleImage:
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80',
  startDate: '2026-06-21',
  endDate: '2026-06-25',
  startTime: '12:00',
  endTime: '21:30',
  pickupMethod: 'delivery' as const,
  returnMethod: 'collection' as const,
  deliveryAddress: 'Dubai Int. Airport Terminal 1',
  collectionAddress: 'Dubai Int. Airport Terminal 1',
  depositChoice: 'deposit' as const,
  depositAmount: 3000,
  paymentMethod: 'card' as const,
  status: 'pending',
  firstName: 'Lisa',
  isLoggedIn: true,
}

// Pay-on-delivery: holding deposit now, balance at handover.
const cashBooking = {
  ...baseBooking,
  totalDue: 1232.0,
  reservationFee: 450.0,
  amountPaid: 450.0,
  balanceDueOnPickup: 782.0,
  paymentMethod: 'cash' as const,
}

// Card: the whole rental is charged now. reservationFee stays at 450 --
// it is the non-refundable slice of a late cancellation, NOT what was
// charged. Getting those two confused is what made the receipt tell a
// customer charged 1,232 that they had paid 450.
const cardBooking = {
  ...baseBooking,
  totalDue: 1232.0,
  reservationFee: 450.0,
  amountPaid: 1232.0,
  balanceDueOnPickup: 0,
  paymentMethod: 'card' as const,
}

async function writePreview(filename: string, booking: typeof cashBooking | typeof cardBooking) {
  const html = await render(BookingConfirmationEmail({ booking }))
  const path = resolve(TMP_DIR, filename)
  writeFileSync(path, html, 'utf8')
  console.log(`Wrote ${path}`)
}

async function main() {
  await writePreview('email-preview-cash.html', cashBooking)
  await writePreview('email-preview-card.html', cardBooking)
  console.log('\nOpen these in your browser to preview:')
  console.log(`  file:///${resolve(TMP_DIR, 'email-preview-cash.html').replace(/\\/g, '/')}`)
  console.log(`  file:///${resolve(TMP_DIR, 'email-preview-card.html').replace(/\\/g, '/')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
