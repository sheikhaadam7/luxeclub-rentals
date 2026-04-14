/**
 * Vercel Cron authentication helper.
 *
 * Vercel Cron sends requests to cron routes with
 *   Authorization: Bearer <CRON_SECRET>
 * where CRON_SECRET is a project env var. This helper verifies the header so
 * random internet traffic can't trigger our cron work.
 */

import 'server-only'
import { NextRequest } from 'next/server'

export function verifyCronRequest(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.CRON_SECRET
  if (!expected) return { ok: false, reason: 'CRON_SECRET not configured' }

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? ''
  const expectedHeader = `Bearer ${expected}`
  if (header !== expectedHeader) return { ok: false, reason: 'Invalid or missing cron secret' }
  return { ok: true }
}
