'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface ImageGalleryProps {
  images: string[]
  alt: string
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const scrollYRef = useRef(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const prev = () => setActiveIndex(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
  const next = () => setActiveIndex(activeIndex === images.length - 1 ? 0 : activeIndex + 1)

  // Scroll the active thumbnail into view
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const thumb = strip.children[activeIndex] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex])

  const openLightbox = useCallback(() => {
    scrollYRef.current = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollYRef.current}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.overflow = ''
    window.scrollTo(0, scrollYRef.current)
  }, [])

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1))
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen, images.length, closeLightbox])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
    }
  }, [])

  if (images.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="group relative aspect-[16/10] w-full overflow-hidden cursor-pointer" onClick={openLightbox}>
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
              onClick={(e) => { e.stopPropagation(); prev() }}
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
              onClick={(e) => { e.stopPropagation(); next() }}
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

      {/* Lightbox overlay */}
      {mounted && createPortal(
        <div
          className={[
            'fixed inset-0 z-[100] transition-all duration-300',
            lightboxOpen ? 'visible' : 'invisible pointer-events-none',
          ].join(' ')}
        >
          {/* Backdrop */}
          <div
            className={[
              'absolute inset-0 bg-black/95 transition-opacity duration-300',
              lightboxOpen ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={closeLightbox}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className={[
              'absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.1] text-white hover:bg-white/[0.2] transition-all duration-200',
              lightboxOpen ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            aria-label="Close gallery"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div className={[
              'absolute top-5 left-1/2 -translate-x-1/2 z-20 text-sm text-white/50 transition-opacity duration-200',
              lightboxOpen ? 'opacity-100' : 'opacity-0',
            ].join(' ')}>
              {activeIndex + 1} / {images.length}
            </div>
          )}

          {/* Main image */}
          <div
            className={[
              'absolute inset-0 flex items-center justify-center px-4 sm:px-16 pt-16 pb-28 sm:pb-32 transition-all duration-300',
              lightboxOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
            ].join(' ')}
          >
            <div className="relative w-full h-full max-w-6xl max-h-[80vh]">
              {images.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt={`${alt} — ${i + 1} of ${images.length}`}
                  fill
                  className={`object-contain transition-opacity duration-300 ${
                    i === activeIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes="100vw"
                  priority={i === activeIndex}
                />
              ))}
            </div>
          </div>

          {/* Nav arrows */}
          {images.length > 1 && lightboxOpen && (
            <>
              <button
                onClick={() => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.08] text-white hover:bg-white/[0.15] transition-all duration-200"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.08] text-white hover:bg-white/[0.15] transition-all duration-200"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Thumbnail strip in lightbox */}
          {images.length > 1 && lightboxOpen && (
            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-1.5 px-4 overflow-x-auto scrollbar-hide">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border-2 transition-all duration-200 ${
                    i === activeIndex
                      ? 'border-white opacity-100'
                      : 'border-transparent opacity-40 hover:opacity-70'
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${alt} thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
