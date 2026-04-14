'use client'

import { useEffect, useState } from 'react'

/**
 * Claude-style rotating + pulsing sparkle with a live HH:MM:SS timer.
 * Pure CSS animation (rotate + pulse), no dependencies.
 *
 *   <LoadingSparkle label="Searching" />
 *
 * Pass startedAt (epoch ms) to show elapsed time; omit for a simple spinner.
 */
export function LoadingSparkle({
  label,
  startedAt,
  className = '',
}: {
  label?: string
  startedAt?: number
  className?: string
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : null
  const formatted = elapsed !== null
    ? elapsed < 60
      ? `${elapsed}s`
      : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    : null

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Sparkle />
      {label && <span>{label}</span>}
      {formatted && <span className="font-mono tabular-nums text-white/60">{formatted}</span>}
    </span>
  )
}

function Sparkle() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      className="text-brand-cyan"
      style={{
        animation: 'luxeSparkleSpin 1.2s linear infinite, luxeSparklePulse 1.2s ease-in-out infinite',
      }}
      aria-hidden="true"
    >
      {/* Four-point star (asterisk-like) */}
      <path
        d="M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5Z"
        fill="currentColor"
      />
      <style>{`
        @keyframes luxeSparkleSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes luxeSparklePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        svg { transform-origin: center; }
      `}</style>
    </svg>
  )
}
