import { createClient } from '@/lib/supabase/server'

const CACHE_GONE = 'public, s-maxage=31536000, immutable'
const CACHE_REDIRECT = 'public, s-maxage=86400'

export async function legacyGarageResponse(
  slug: string,
  withBody: boolean
): Promise<Response> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vehicles')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (data) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: `/catalogue/${slug}`,
        'Cache-Control': CACHE_REDIRECT,
      },
    })
  }

  const headers: Record<string, string> = { 'Cache-Control': CACHE_GONE }
  if (withBody) headers['Content-Type'] = 'text/plain'
  return new Response(withBody ? 'Gone' : null, { status: 410, headers })
}
