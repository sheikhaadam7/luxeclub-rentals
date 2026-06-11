'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when the viewport matches `(max-width: 639px)` (Tailwind `sm` breakpoint).
 * SSR-safe: initial value is false; updates after mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return isMobile
}
