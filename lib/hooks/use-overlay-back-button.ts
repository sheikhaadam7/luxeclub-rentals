'use client'

import { useEffect, useRef } from 'react'

/**
 * Intercepts the system Back button while a full-screen overlay is open
 * so it closes the overlay instead of navigating away from the page.
 *
 * Pushes a sentinel history entry on open; when the browser fires `popstate`
 * (e.g. Android Back button), calls `onClose` instead of letting the page
 * navigate. On natural close (X / Continue), pops the sentinel.
 *
 * `onClose` is read through a ref so the effect only re-runs when `open`
 * actually flips — callers don't have to memoize the callback. Without this,
 * any parent re-render while open=true would queue an extra history.back(),
 * popping the user past the page they were on.
 */
export function useOverlayBackButton(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    let popped = false
    window.history.pushState({ overlay: true }, '')

    const handlePopState = () => {
      popped = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!popped) {
        // Overlay was closed by some other means (X, Continue, Escape) —
        // pop the sentinel entry so history stays clean.
        window.history.back()
      }
    }
  }, [open])
}
