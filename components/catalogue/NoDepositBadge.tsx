'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export function NoDepositBadge() {
  // `hovered` is transient cursor state (mouse/pen only).
  // `sticky` is click/tap-toggle state (primary for touch devices).
  // expanded = either true.
  const [hovered, setHovered] = useState(false)
  const [sticky, setSticky] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close sticky-expanded panel when tapping outside (touch + click-outside UX).
  useEffect(() => {
    if (!sticky) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setSticky(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [sticky])

  const expanded = hovered || sticky

  // Only treat real cursor input (mouse/pen) as hover — ignore touch so we
  // don't get a ghost-hover flash on mobile taps.
  const isCursorInput = (e: ReactPointerEvent) =>
    e.pointerType === 'mouse' || e.pointerType === 'pen'

  return (
    <div
      ref={rootRef}
      className="inline-flex flex-col items-start"
      onPointerEnter={(e) => isCursorInput(e) && setHovered(true)}
      onPointerLeave={(e) => isCursorInput(e) && setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => setSticky((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide no-deposit eligibility' : 'Show no-deposit eligibility'}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan text-xs font-semibold tracking-wide uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        No Deposit Available
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v.01M11 12h1v4h1" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-2 w-full bg-white/[0.04] border border-white/[0.12] p-3 text-xs text-white/75 space-y-1.5">
          <p className="text-white/90 font-medium mb-1">Eligibility criteria</p>
          <div className="flex items-start gap-2">
            <span className="text-brand-cyan shrink-0">•</span>
            <span>Age 23+</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-brand-cyan shrink-0">•</span>
            <span>Driving licence check</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-brand-cyan shrink-0">•</span>
            <span>Subject to approval</span>
          </div>
        </div>
      )}
    </div>
  )
}
