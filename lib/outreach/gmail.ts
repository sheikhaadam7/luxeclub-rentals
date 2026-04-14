/**
 * Gmail API client for reply detection.
 * Uses OAuth2 with user's refresh token.
 */

import 'server-only'
import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

export interface GmailMessage {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  receivedAt: Date
}

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`
}

export function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri())
}

export function buildAuthUrl(state: string): string {
  const oauth = createOAuthClient()
  return oauth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
    state,
  })
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string | null
  expires_at: Date | null
  email: string | null
  scopes: string[]
}> {
  const oauth = createOAuthClient()
  const { tokens } = await oauth.getToken(code)

  // Get user email via id_token or a userinfo call
  let email: string | null = null
  if (tokens.id_token) {
    const parts = tokens.id_token.split('.')
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
        email = payload.email ?? null
      } catch { /* ignore */ }
    }
  }

  return {
    access_token: tokens.access_token ?? '',
    refresh_token: tokens.refresh_token ?? null,
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email,
    scopes: typeof tokens.scope === 'string' ? tokens.scope.split(' ') : [],
  }
}

/**
 * List messages received since a given date. Returns parsed messages.
 * Caller provides an OAuth2 client with valid credentials.
 */
export async function listRecentMessages(
  auth: OAuth2Client,
  sinceDate: Date
): Promise<GmailMessage[]> {
  const gmail = google.gmail({ version: 'v1', auth })

  // Gmail search: in:inbox after:YYYY/MM/DD
  const dateStr = sinceDate.toISOString().slice(0, 10).replace(/-/g, '/')
  const query = `in:inbox after:${dateStr}`

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100,
  })

  const ids = listRes.data.messages ?? []
  const out: GmailMessage[] = []

  for (const ref of ids) {
    if (!ref.id) continue
    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: ref.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      })
      const m = msgRes.data
      const headers = m.payload?.headers ?? []
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

      out.push({
        id: m.id ?? '',
        threadId: m.threadId ?? '',
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        snippet: m.snippet ?? '',
        receivedAt: new Date(parseInt(m.internalDate ?? '0', 10)),
      })
    } catch (err) {
      console.error(`[listRecentMessages] Failed to fetch message ${ref.id}:`, err)
    }
  }

  return out
}

/**
 * Parse email address from a "Name <email@domain>" style header.
 */
export function extractEmail(header: string): string {
  const match = header.match(/<([^>]+)>/)
  if (match) return match[1].toLowerCase()
  return header.trim().toLowerCase()
}
