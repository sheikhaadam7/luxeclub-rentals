'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface ImageGalleryProps {
  images: string[]
  alt: string
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const prev = () => setActiveIndex(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
  const next = () => setActiveIndex(activeIndex === images.length - 1 ? 0 : activeIndex + 1)

  useEffect(() => {
    images.forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [images])

  if (images.length === 0) return null

  const progress = ((activeIndex + 1) / images.length) * 100

  return (
    <div>
      {/* Main image */}
      <div className="group relative aspect-[2/1] w-full max-w-4xl mx-auto overflow-hidden bg-black">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${alt} — ${i + 1} of ${images.length}`}
            fill
            className={`object-cover ${i === activeIndex ? 'z-10' : 'z-0 invisible'}`}
            priority={i === 0}
            loading={i < 3 ? 'eager' : 'lazy'}
            sizes="(max-width: 896px) 100vw, 896px"
          />
        ))}

        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {images.length > 1 && (
          <>
            {/* Left arrow — sharp square */}
            <button
              onClick={prev}
              className="absolute left-0 top-0 bottom-0 w-14 z-30 flex items-center justify-center
                         bg-transparent hover:bg-white/5
                         text-white/40 hover:text-white
                         opacity-0 group-hover:opacity-100 transition-all duration-200"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right arrow — sharp square */}
            <button
              onClick={next}
              className="absolute right-0 top-0 bottom-0 w-14 z-30 flex items-center justify-center
                         bg-transparent hover:bg-white/5
                         text-white/40 hover:text-white
                         opacity-0 group-hover:opacity-100 transition-all duration-200"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Counter */}
            <span className="absolute bottom-3 right-4 z-30 text-[11px] text-white/40 tracking-[0.2em] font-light
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {String(activeIndex + 1).padStart(2, '0')} — {String(images.length).padStart(2, '0')}
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      {images.length > 1 && (
        <div className="w-full max-w-4xl mx-auto h-[1px] bg-white/10">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
