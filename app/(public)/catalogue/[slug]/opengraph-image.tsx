import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Vehicle — LuxeClub Rentals'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Fetch vehicle via Supabase REST API (edge-compatible, no server-only import)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  let vehicle: { name: string; daily_rate: number | null; primary_image_url: string | null } | null = null

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/vehicles?slug=eq.${encodeURIComponent(slug)}&select=name,daily_rate,primary_image_url&limit=1`,
      { headers: { apikey: supabaseKey!, Authorization: `Bearer ${supabaseKey}` } },
    )
    const rows = await res.json()
    if (rows?.length > 0) vehicle = rows[0]
  } catch { /* fall through to fallback */ }

  // Fallback: generic branded OG image
  if (!vehicle) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)', fontFamily: 'sans-serif' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, #c9a96e, transparent)' }} />
          <span style={{ fontSize: 72, fontWeight: 700, color: '#ffffff' }}>LuxeClub Rentals</span>
          <span style={{ fontSize: 28, color: '#c9a96e', marginTop: 16 }}>Luxury & Sports Cars in Dubai</span>
        </div>
      ),
      { ...size },
    )
  }

  // Fetch vehicle image as base64 for ImageResponse
  let imgSrc: string | null = null
  if (vehicle.primary_image_url) {
    try {
      const imgRes = await fetch(vehicle.primary_image_url)
      const buf = await imgRes.arrayBuffer()
      const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
      imgSrc = `data:${contentType};base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`
    } catch { /* no image */ }
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontFamily: 'sans-serif', position: 'relative', background: '#0a0a0a' }}>
        {/* Vehicle photo background */}
        {imgSrc && (
          <img src={imgSrc} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }} />
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, #c9a96e, transparent)' }} />
        {/* Content */}
        <div style={{ position: 'relative', padding: '40px 60px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
            LuxeClub Rentals
          </span>
          <span style={{ fontSize: 52, fontWeight: 700, color: '#ffffff' }}>
            {vehicle.name}
          </span>
          {vehicle.daily_rate && (
            <span style={{ fontSize: 28, color: '#c9a96e' }}>
              AED {vehicle.daily_rate.toLocaleString('en-US')}/day
            </span>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
