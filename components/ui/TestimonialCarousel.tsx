'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Testimonial {
  name: string
  text: string
  rating: number
  relativeTime?: string
  profilePhoto?: string
}

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    name: 'Ahmed K.',
    text: 'Exceptional service from start to finish. The Rolls Royce Cullinan was immaculate and delivered right to my hotel at 6 AM. The driver was professional and the handover took less than 5 minutes. I\'ve rented from three other companies in Dubai — LuxeClub is on another level entirely.',
    rating: 5,
  },
  {
    name: 'Sarah M.',
    text: 'Rented the Porsche 911 GT3 for a weekend getaway to Hatta. The booking process was seamless and the car was in perfect condition. My only minor note would be that I wished they had a wider colour selection, but the white looked stunning anyway. Truly a premium experience.',
    rating: 4,
  },
  {
    name: 'James L.',
    text: 'Best luxury car rental in Dubai, hands down. I\'m a returning customer — this was my fourth rental with LuxeClub. The Bentley Continental GT exceeded all expectations. What sets them apart is the personal touch: they remembered my preferences from last time and had everything ready. Professional team and competitive pricing.',
    rating: 5,
  },
  {
    name: 'Fatima R.',
    text: 'Used LuxeClub for a corporate event — rented three vehicles and everything was handled flawlessly. Their team coordinated delivery to three different locations simultaneously. The attention to detail is unmatched. Already booked again for our annual gala.',
    rating: 5,
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function TestimonialCarousel({ reviews }: { reviews?: Testimonial[] }) {
  const testimonials = reviews && reviews.length > 0 ? reviews : FALLBACK_TESTIMONIALS
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    if (isHovered) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isHovered, testimonials.length])

  const testimonial = testimonials[activeIndex]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div key={activeIndex} className="animate-testimonial-in max-w-2xl mx-auto">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 sm:p-10 space-y-5 hover:border-white/[0.15] transition-colors duration-300">
          <div className="flex items-center justify-between">
            <StarRating count={testimonial.rating} />
            {/* Google logo */}
            <svg className="h-5 w-5 opacity-40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <p className="text-base text-white/80 leading-relaxed">
            &ldquo;{testimonial.text}&rdquo;
          </p>
          <div className="flex items-center gap-3 pt-1">
            {testimonial.profilePhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={testimonial.profilePhoto}
                alt={testimonial.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center text-sm font-semibold text-white/60">
                {testimonial.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{testimonial.name}</p>
              {testimonial.relativeTime && (
                <p className="text-xs text-white/40">{testimonial.relativeTime}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to testimonial ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'bg-brand-purple w-6'
                : 'bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
