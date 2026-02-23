'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface ImageGalleryProps {
  images: string[]
  alt: string
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)

  const prev = () => setActiveIndex(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
  const next = () => setActiveIndex(activeIndex === images.length - 1 ? 0 : activeIndex + 1)

  // Scroll the active thumbnail into view
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const thumb = strip.children[activeIndex] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex])

  if (images.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="group relative aspect-[16/10] w-full overflow-hidden">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${alt} — ${i + 1} of ${images.length}`}
            fill
            className={`object-cover transition-opacity duration-500 ease-out ${
              i === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
            priority={i === 0}
            loading={i < 3 ? 'eager' : 'lazy'}
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ))}

        {images.length > 1 && (
          <>
            {/* Left arrow */}
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20
                         flex items-center justify-center
                         text-white/70 hover:text-white
                         opacity-0 group-hover:opacity-100 transition-all duration-200"
              aria-label="Previous image"
            >
              <svg className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right arrow */}
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20
                         flex items-center justify-center
                         text-white/70 hover:text-white
                         opacity-0 group-hover:opacity-100 transition-all duration-200"
              aria-label="Next image"
            >
              <svg className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <span className="absolute bottom-3 right-4 z-30 text-[11px] text-white/40 tracking-[0.2em] font-light
                           opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {String(activeIndex + 1).padStart(2, '0')} — {String(images.length).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div ref={stripRef} className="flex overflow-x-auto scrollbar-hide">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-28 h-28 overflow-hidden transition-opacity duration-300 ${
                i === activeIndex
                  ? 'opacity-100'
                  : 'opacity-40 hover:opacity-70'
              }`}
            >
              <Image
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
