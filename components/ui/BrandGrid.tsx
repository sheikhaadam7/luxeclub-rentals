'use client'

import { useRef, useCallback } from 'react'
import Link from 'next/link'

const BRANDS = [
  { name: 'Lamborghini', logo: '/logos/brands/lamborghini.svg', href: '/rent-lamborghini-in-dubai', h: 125 },
  { name: 'Ferrari', logo: '/logos/brands/ferrari.svg', href: '/rent-ferrari-in-dubai', h: 125 },
  { name: 'Rolls Royce', logo: '/logos/brands/rolls-royce.svg', href: '/rent-rolls-royce-in-dubai', h: 110 },
  { name: 'Bentley', logo: '/logos/brands/bentley.svg', href: '/rent-bentley-in-dubai', h: 119 },
  { name: 'Porsche', logo: '/logos/brands/porsche.svg', href: '/rent-porsche-in-dubai', h: 124 },
  { name: 'Mercedes', logo: '/logos/brands/mercedes.svg', href: '/rent-mercedes-in-dubai', h: 100 },
  { name: 'Range Rover', logo: '/logos/brands/range-rover.svg', href: '/rent-range-rover-in-dubai', h: 79 },
  { name: 'McLaren', logo: '/logos/brands/mclaren.svg', href: '/rent-mclaren-in-dubai', h: 113 },
  { name: 'Aston Martin', logo: '/logos/brands/aston-martin.svg', href: '/rent-aston-martin-in-dubai', h: 125 },
  { name: 'BMW', logo: '/logos/brands/bmw.svg', href: '/rent-bmw-in-dubai', h: 100 },
  { name: 'Audi', logo: '/logos/brands/audi.svg', href: '/rent-audi-in-dubai', h: 94 },
  { name: 'Maserati', logo: '/logos/brands/maserati.svg', href: '/rent-maserati-in-dubai', h: 125 },
  { name: 'Cadillac', logo: '/logos/brands/cadillac.svg', href: '/rent-cadillac-in-dubai', h: 135 },
] as const

function HoloCard({ name, logo, href, h }: typeof BRANDS[number]) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current
    const glow = glowRef.current
    if (!card || !glow) return
    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (y - 0.5) * -30
    const rotateY = (x - 0.5) * 30
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`
    glow.style.opacity = '1'
    glow.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.25) 0%, rgba(201,169,110,0.1) 40%, transparent 70%)`
  }, [])

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current
    const glow = glowRef.current
    if (!card || !glow) return
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)'
    glow.style.opacity = '0'
  }, [])

  return (
    <Link
      ref={cardRef}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col items-center justify-center gap-3 p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-transform duration-200 ease-out group"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Holographic shimmer overlay */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 holo-shimmer pointer-events-none" />
      {/* Mouse-tracking glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
      />
      {/* Logo */}
      <div className="flex items-center justify-center h-28 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={`${name} logo`}
          style={{ height: h, width: 'auto', maxWidth: 'none' }}
          className="opacity-80 group-hover:opacity-100 transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
        />
      </div>
      {/* Brand name */}
      <span className="text-xs sm:text-sm text-white/50 group-hover:text-white font-medium transition-colors duration-300">
        {name}
      </span>
    </Link>
  )
}

export function BrandGrid() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center space-y-2 mb-10">
        <h3 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Browse by Brand
        </h3>
        <p className="text-sm text-brand-muted">
          Tap a badge to explore the fleet
        </p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {BRANDS.map((brand) => (
          <HoloCard key={brand.name} {...brand} />
        ))}
      </div>

      {/* Holographic shimmer CSS */}
      <style>{`
        .holo-shimmer {
          background: linear-gradient(
            125deg,
            transparent 0%,
            rgba(201,169,110,0.08) 20%,
            rgba(255,255,255,0.12) 35%,
            rgba(120,180,255,0.08) 50%,
            rgba(201,169,110,0.08) 65%,
            rgba(255,255,255,0.12) 80%,
            transparent 100%
          );
          background-size: 200% 200%;
        }
        .group:hover .holo-shimmer {
          opacity: 1;
          animation: holo-shift 3s ease infinite;
        }
        @keyframes holo-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </section>
  )
}
