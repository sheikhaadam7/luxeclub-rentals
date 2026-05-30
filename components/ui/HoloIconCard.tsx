'use client'

import { useRef, useCallback } from 'react'

interface HoloIconCardProps {
  iconPath: string
  title: string
  subtitle: string
}

/**
 * Holographic icon card — mirrors the BrandGrid HoloCard effect (3D tilt
 * tracking the mouse, radial glow following the cursor, animated shimmer
 * overlay on hover) but for non-clickable SVG-icon cards.
 */
export function HoloIconCard({ iconPath, title, subtitle }: HoloIconCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    const glow = glowRef.current
    if (!card || !glow) return
    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (y - 0.5) * -20
    const rotateY = (x - 0.5) * 20
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`
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
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-white/[0.04] border border-white/[0.08] rounded-xl p-6 text-center space-y-3 hover:border-brand-cyan/50 backdrop-blur-sm overflow-hidden transition-transform duration-200 ease-out group"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Holographic shimmer overlay */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 holo-shimmer pointer-events-none" />
      {/* Mouse-tracking radial glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
      />
      <svg
        className="relative w-10 h-10 mx-auto text-brand-cyan drop-shadow-[0_0_8px_rgba(201,169,110,0.3)] group-hover:drop-shadow-[0_0_16px_rgba(201,169,110,0.6)] transition-all duration-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
      <h3 className="relative font-display text-sm font-medium text-white leading-snug">{title}</h3>
      <p className="relative text-xs text-white/50 leading-relaxed">{subtitle}</p>
    </div>
  )
}
