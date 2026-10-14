import { NextResponse } from 'next/server'
import { createAgreement, isStaff, listAgreements } from '@/lib/rental-agreements'

export const dynamic = 'force-dynamic'

/** Staff: list online rental agreements */
export async function GET() {
  if (!(await isStaff())) return NextResponse.json({ error: 'staff only' }, { status: 401 })
  return NextResponse.json({ agreements: await listAgreements() })
}

/** Staff: start a new agreement and get the customer's link token */
export async function POST() {
  if (!(await isStaff())) return NextResponse.json({ error: 'staff only' }, { status: 401 })
  const a = await createAgreement()
  return NextResponse.json({ token: a.token })
}
