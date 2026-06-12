import { legacyGarageResponse } from '@/lib/legacy-garage-route'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Params) {
  return legacyGarageResponse((await params).slug, true)
}

export async function HEAD(_req: Request, { params }: Params) {
  return legacyGarageResponse((await params).slug, false)
}
