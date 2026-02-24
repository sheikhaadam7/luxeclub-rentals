'use client'

import { useEffect, useRef, useState } from 'react'

interface LazyVideoProps {
  webmSrc: string
  mp4Src: string
  className?: string
}

export function LazyVideo({ webmSrc, mp4Src, className }: LazyVideoProps) {
  const [ready, setReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const id =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => setReady(true), { timeout: 2000 })
        : (setTimeout(() => setReady(true), 2000) as unknown as number)

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id)
      } else {
        clearTimeout(id)
      }
    }
  }, [])

  if (!ready) return null

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      className={className}
    >
      <source src={webmSrc} type="video/webm" />
      <source src={mp4Src} type="video/mp4" />
    </video>
  )
}
