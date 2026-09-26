'use client'

/**
 * Small inline-SVG social icon. Switch on the platform key; each case returns
 * the official mark for that platform, sized 16×16 by default and inheriting
 * currentColor for stroke/fill.
 *
 * If a platform is added to lib/social.ts SOCIAL_PLATFORMS without a case here,
 * the default returns null and warns loudly in dev so nothing renders silently.
 */

interface SocialIconProps {
  platformKey: string
  className?: string
}

export function SocialIcon({ platformKey, className = 'w-4 h-4 shrink-0' }: SocialIconProps) {
  switch (platformKey) {
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      )
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.408.593 24 1.325 24H12.82v-9.294H9.692V11.08h3.128V8.407c0-3.099 1.894-4.786 4.659-4.786 1.325 0 2.464.099 2.796.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.762v2.311h3.591l-.467 3.626h-3.124V24h6.116C23.408 24 24 23.408 24 22.676V1.325C24 .593 23.408 0 22.675 0z" />
        </svg>
      )
    default:
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`SocialIcon: no SVG registered for platform key "${platformKey}"`)
      }
      return null
  }
}
