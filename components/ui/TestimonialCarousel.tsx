'use client'

import { useState, useEffect, useCallback } from 'react'

interface Testimonial {
  name: string
  location: string
  text: string
  rating: number
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Ahmed K.',
    location: 'Dubai Marina',
    text: 'Exceptional service from start to finish. The Rolls Royce Cullinan was immaculate and delivered right to my hotel at 6 AM. The driver was professional and the handover took less than 5 minutes. I\'ve rented from three other companies in Dubai — LuxeClub is on another level entirely.',
    rating: 5,
  },
  {
    name: 'Sarah M.',
    location: 'Palm Jumeirah',
    text: 'Rented the Porsche 911 GT3 for a weekend getaway to Hatta. The booking process was seamless and the car was in perfect condition. My only minor note would be that I wished they had a wider colour selection, but the white looked stunning anyway. Truly a premium experience.',
    rating: 4,
  },
  {
    name: 'James L.',
    location: 'Downtown Dubai',
    text: 'Best luxury car rental in Dubai, hands down. I\'m a returning customer — this was my fourth rental with LuxeClub. The Bentley Continental GT exceeded all expectations. What sets them apart is the personal touch: they remembered my preferences from last time and had everything ready. Professional team and competitive pricing.',
    rating: 5,
  },
  {
    name: 'Fatima R.',
    location: 'Business Bay',
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

export function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    if (isHovered) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isHovered])

  const testimonial = TESTIMONIALS[activeIndex]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div key={activeIndex} className="animate-testimonial-in max-w-2xl mx-auto">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 sm:p-10 space-y-5 hover:border-white/[0.15] transition-colors duration-300">
          <StarRating count={testimonial.rating} />
          <p className="text-base text-white/80 leading-relaxed">
            &ldquo;{testimonial.text}&rdquo;
          </p>
          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center text-sm font-semibold text-white/60">
              {testimonial.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{testimonial.name}</p>
              <p className="text-xs text-white/40">{testimonial.location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {TESTIMONIALS.map((_, i) => (
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
