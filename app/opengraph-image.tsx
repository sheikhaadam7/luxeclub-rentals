import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'LuxeClub Rentals — Luxury Car Rental in Dubai'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, transparent, #c9a96e, transparent)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>
            Premium Car Hire
          </span>
          <span style={{ fontSize: 72, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
            LuxeClub Rentals
          </span>
          <span style={{ fontSize: 28, color: '#c9a96e', letterSpacing: '0.05em' }}>
            Luxury & Sports Cars in Dubai
          </span>
        </div>
        {/* Bottom info bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            gap: 40,
            fontSize: 18,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          <span>Insurance Included</span>
          <span>Delivery All Over Dubai</span>
          <span>24/7 Concierge</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
