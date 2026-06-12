const CACHE = 'public, s-maxage=31536000, immutable'

export async function GET() {
  return new Response('Gone', {
    status: 410,
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': CACHE },
  })
}

export async function HEAD() {
  return new Response(null, {
    status: 410,
    headers: { 'Cache-Control': CACHE },
  })
}
