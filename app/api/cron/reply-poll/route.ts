/**
 * Hourly cron: poll Gmail for replies to sent pitches and flip their status.
 * Triggered by Vercel Cron (see vercel.json). Authenticates via CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/outreach/cron-auth'
import { pollRepliesForAllAdmins } from '@/app/actions/outreach'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  const res = await pollRepliesForAllAdmins()
  return NextResponse.json(res)
}
