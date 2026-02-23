'use client'

import { useEffect, useRef } from 'react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function ScrollReveal({ children, className = '', delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Ensure the initial opacity:0 state is painted before observing,
    // otherwise the observer fires before the browser paints and
    // the transition is never visible.
    const rafId = requestAnimationFrame(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.transitionDelay = `${delay}ms`
            el.classList.add('scroll-revealed')
            observer.unobserve(el)
          }
        },
        { threshold: 0.15 }
      )

      observer.observe(el)
      observerRef.current = observer
    })

    return () => {
      cancelAnimationFrame(rafId)
      observerRef.current?.disconnect()
    }
  }, [delay])

  return (
    <div ref={ref} className={`scroll-reveal ${className}`}>
      {children}
    </div>
  )
}
