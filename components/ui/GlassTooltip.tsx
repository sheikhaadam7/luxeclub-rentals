'use client'

import { ReactNode } from 'react'

interface GlassTooltipProps {
  label: ReactNode
  children: ReactNode
  className?: string
  /** Position of the tooltip relative to the trigger. Defaults to bottom. */
  placement?: 'top' | 'bottom'
  /** Width of the tooltip bubble. Defaults to w-64. */
  width?: string
}

/**
 * Apple-style frosted-glass tooltip. Pure CSS (group-hover) — no JS state,
 * no layout shift, no portal. Wrap any trigger: the tooltip appears on hover
 * or keyboard focus and fades out cleanly.
 *
 *   <GlassTooltip label="Domain Rating from Ahrefs">
 *     <span>DR</span>
 *   </GlassTooltip>
 */
export function GlassTooltip({
  label,
  children,
  className = '',
  placement = 'bottom',
  width = 'w-64',
}: GlassTooltipProps) {
  const posClasses = placement === 'bottom'
    ? 'top-full mt-2'
    : 'bottom-full mb-2'

  return (
    <span className={`relative inline-flex group/tip focus-within:z-40 ${className}`} tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute left-1/2 -translate-x-1/2',
          posClasses,
          width,
          'z-50 px-3 py-2 rounded-xl',
          'bg-white/[0.08] backdrop-blur-xl',
          'border border-white/15',
          'shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
          'text-[11px] font-normal leading-relaxed text-white/90 normal-case tracking-normal',
          'whitespace-normal text-left',
          'opacity-0 translate-y-1 group-hover/tip:opacity-100 group-hover/tip:translate-y-0',
          'group-focus-within/tip:opacity-100 group-focus-within/tip:translate-y-0',
          'transition-all duration-200 ease-out',
        ].join(' ')}
      >
        {label}
      </span>
    </span>
  )
}
