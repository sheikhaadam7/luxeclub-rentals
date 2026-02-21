import 'server-only'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

/**
 * Server-only Resend email helper.
 * The 'server-only' guard above prevents this from being imported in Client Components.
 * Used for sending transactional booking confirmation emails.
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: ReactElement
}

/**
 * Send a transactional email via Resend.
 * @param to     - Recipient email address or array of addresses
 * @param subject - Email subject line
 * @param react   - React Email component to render as HTML
 */
export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  if (!resend) {
    console.log('sendEmail: skipped (RESEND_API_KEY not configured)')
    return null
  }

  return resend.emails.send({
    from: 'LuxeClub Rentals <bookings@luxeclubrentals.com>',
    to,
    subject,
    react,
  })
}
