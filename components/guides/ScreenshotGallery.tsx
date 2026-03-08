'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface ScreenshotGalleryProps {
  images: string[]
  alt: string
}

export function ScreenshotGallery({ images, alt }: ScreenshotGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const scrollYRef = useRef(0)

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index)
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
    <>
      {/* Thumbnail grid — portrait phone screenshots */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => openLightbox(i)}
            className="relative aspect-[9/16] overflow-hidden rounded-lg bg-white/[0.04] hover:opacity-80 transition-opacity duration-200 cursor-pointer"
          >
            <Image
              src={src}
              alt={`${alt} — ${i + 1} of ${images.length}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {typeof document !== 'undefined' && createPortal(
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

          {/* Main image — portrait oriented */}
          <div
            className={[
              'absolute inset-0 flex items-center justify-center px-4 sm:px-16 pt-16 pb-28 sm:pb-32 transition-all duration-300',
              lightboxOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
            ].join(' ')}
          >
            <div className="relative h-full max-h-[85vh] aspect-[9/16]">
              {images.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt={`${alt} — ${i + 1} of ${images.length}`}
                  fill
                  className={`object-contain transition-opacity duration-300 ${
                    i === activeIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes="(max-width: 640px) 90vw, 50vw"
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
                aria-label="Previous screenshot"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.08] text-white hover:bg-white/[0.15] transition-all duration-200"
                aria-label="Next screenshot"
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
                  className={`relative flex-shrink-0 w-10 h-[72px] sm:w-12 sm:h-[86px] overflow-hidden border-2 rounded transition-all duration-200 ${
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
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
