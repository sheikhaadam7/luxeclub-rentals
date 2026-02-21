import 'server-only'
import { Resend } from 'resend'
import { render } from '@react-email/render'
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

  const html = await render(react)

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'LuxeClub Rentals <onboarding@resend.dev>',
    to,
    subject,
    html,
  })

  if (result.error) {
    console.error('sendEmail: Resend API error', result.error)
  } else {
    console.log('sendEmail: sent successfully', result.data?.id)
  }

  return result
}
