import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/outreach/cron-auth'
import { runMovementScan } from '@/app/actions/outreach'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })
  const res = await runMovementScan()
  return NextResponse.json(res)
}
