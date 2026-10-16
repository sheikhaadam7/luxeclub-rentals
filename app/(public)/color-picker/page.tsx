'use client'

import { useRef, useState } from 'react'

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sN * Math.min(lN, 1 - lN)
  const f = (n: number) => {
    const c = lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const CURRENT_BRAND_CYAN = '#C9A96E'

const QUICK_SHADES = [
  // Champagne / gold family (current brand)
  '#C9A96E',
  '#D4B97A',
  '#B8945A',
  '#E8C887',
  '#A88B52',
  // Cooler metals
  '#A89986',
  '#8B7355',
  // Cyans (in case user wants to shift)
  '#00B8D4',
  '#0891B2',
  '#06B6D4',
  // Neutrals
  '#71717A',
  '#52525B',
  '#27272A',
]

export default function ColorPickerPage() {
  const [hue, setHue] = useState(39) // warm gold-ish to match #C9A96E
  const [hovered, setHovered] = useState<{ hex: string; s: number; l: number } | null>(null)
  const [locked, setLocked] = useState<string>(CURRENT_BRAND_CYAN)
  const [alpha, setAlpha] = useState(5) // background alpha %, default matches Step 4
  const padRef = useRef<HTMLDivElement>(null)

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = padRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    const s = Math.round(x * 100)
    const l = Math.round((1 - y) * 100)
    setHovered({ hex: hslToHex(hue, s, l), s, l })
  }

  function handleClick() {
    if (hovered) setLocked(hovered.hex)
  }

  function copyHex(hex: string) {
    navigator.clipboard?.writeText(hex)
  }

  return (
    <main className="min-h-screen bg-luxury py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-white">Color picker</h1>
          <p className="text-sm text-brand-muted">
            Move the mouse over the pad to preview shades. Click to lock. Adjust hue with the slider.
            Right side shows how the picked color would look as a Step 4 selected option box.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Picker */}
          <section className="space-y-4">
            <div
              ref={padRef}
              role="application"
              aria-label="Color picker pad"
              onMouseMove={handleMove}
              onMouseLeave={() => setHovered(null)}
              onClick={handleClick}
              className="relative w-full h-[420px] rounded-[var(--radius-card)] cursor-crosshair border border-brand-border overflow-hidden"
              style={{
                background: `
                  linear-gradient(to top, #000, transparent),
                  linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
                `,
              }}
            />

            {/* Hue slider */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-brand-muted">Hue ({hue}°)</span>
              <input
                type="range"
                min={0}
                max={360}
                value={hue}
                onChange={(e) => setHue(+e.target.value)}
                className="block w-full h-3 mt-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background:
                    'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
                }}
              />
            </label>

            {/* Live readouts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[var(--radius-card)] bg-brand-surface border border-brand-border p-4">
                <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Hovered</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-md border border-brand-border"
                    style={{ background: hovered?.hex ?? 'transparent' }}
                  />
                  <div className="font-mono text-lg text-white">
                    {hovered?.hex ?? '—'}
                  </div>
                </div>
              </div>
              <div className="rounded-[var(--radius-card)] bg-brand-surface border border-brand-border p-4">
                <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Locked</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => copyHex(locked)}
                    title="Click to copy hex"
                    className="w-12 h-12 rounded-md border border-brand-border cursor-pointer"
                    style={{ background: locked }}
                  />
                  <button
                    type="button"
                    onClick={() => copyHex(locked)}
                    className="font-mono text-lg text-white cursor-pointer hover:text-brand-cyan transition-colors"
                  >
                    {locked}
                  </button>
                </div>
                <p className="text-[11px] text-brand-muted mt-2">Click swatch or hex to copy</p>
              </div>
            </div>

            {/* Quick shades */}
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-muted mb-3">Quick shades</p>
              <div className="grid grid-cols-7 gap-2">
                {QUICK_SHADES.map((shade) => (
                  <button
                    key={shade}
                    type="button"
                    onClick={() => setLocked(shade)}
                    title={shade}
                    className={`aspect-square rounded-md border-2 cursor-pointer transition-transform hover:scale-105 ${
                      locked === shade ? 'border-white' : 'border-brand-border'
                    }`}
                    style={{ background: shade }}
                  />
                ))}
              </div>
            </div>

            {/* Background alpha for "tinted" preview */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-brand-muted">
                Selected-box background alpha ({alpha}%)
              </span>
              <input
                type="range"
                min={0}
                max={30}
                value={alpha}
                onChange={(e) => setAlpha(+e.target.value)}
                className="block w-full mt-2 cursor-pointer"
              />
            </label>
          </section>

          {/* Preview */}
          <aside className="space-y-4">
            <h2 className="text-xs uppercase tracking-wider text-brand-muted">
              Step 4 — selected option preview
            </h2>

            <div className="bg-white rounded-[var(--radius-card)] p-5 space-y-3 shadow-xl border-2 border-brand-cyan">
              <p className="text-sm font-semibold text-zinc-700">Current ({CURRENT_BRAND_CYAN})</p>
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  borderColor: CURRENT_BRAND_CYAN,
                  background: hexToRgba(CURRENT_BRAND_CYAN, 0.05),
                }}
              >
                <p className="text-sm font-semibold" style={{ color: CURRENT_BRAND_CYAN }}>
                  Delivery
                </p>
                <p className="text-xs text-zinc-600 mt-1">Bring the car to your address.</p>
              </div>

              <p className="text-sm font-semibold text-zinc-700 pt-2">Your pick ({locked})</p>
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  borderColor: locked,
                  background: hexToRgba(locked, alpha / 100),
                }}
              >
                <p className="text-sm font-semibold" style={{ color: locked }}>
                  Delivery
                </p>
                <p className="text-xs text-zinc-600 mt-1">Bring the car to your address.</p>
              </div>

              <p className="text-sm font-semibold text-zinc-700 pt-2">Side by side (unselected)</p>
              <div
                className="rounded-lg p-4 border border-zinc-300"
              >
                <p className="text-sm font-semibold text-zinc-900">Self pickup</p>
                <p className="text-xs text-zinc-600 mt-1">Collect from our showroom.</p>
              </div>
            </div>

            {/* Dark-card preview (in case the user wants it visible on dark surfaces) */}
            <div className="bg-brand-surface border border-brand-border rounded-[var(--radius-card)] p-5 space-y-3">
              <p className="text-xs uppercase tracking-wider text-brand-muted">On dark surface</p>
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  borderColor: locked,
                  background: hexToRgba(locked, alpha / 100),
                }}
              >
                <p className="text-sm font-semibold" style={{ color: locked }}>
                  Delivery
                </p>
                <p className="text-xs text-brand-muted mt-1">Bring the car to your address.</p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="text-xs text-brand-muted pt-6 border-t border-brand-border">
          When you've picked a shade, copy the hex and tell me which step / element you want it
          applied to.
        </footer>
      </div>
    </main>
  )
}
