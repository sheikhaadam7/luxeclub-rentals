'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Vehicle {
  slug: string
  name: string
  primary_image_url: string | null
  daily_rate: number | null
}

interface HeroSearchProps {
  vehicles: Vehicle[]
}

function ResultsList({
  vehicles,
  onSelect,
}: {
  vehicles: Vehicle[]
  onSelect: (slug: string) => void
}) {
  return (
    <ul>
      {vehicles.map((vehicle) => (
        <li key={vehicle.slug} className="border-b border-white/[0.06] last:border-b-0">
          <button
            type="button"
            onClick={() => onSelect(vehicle.slug)}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4 sm:gap-5 text-left hover:bg-white/[0.06] transition-colors duration-150"
          >
            <div className="relative w-30 h-18 sm:w-40 sm:h-24 flex-shrink-0 bg-white/[0.04]">
              {vehicle.primary_image_url ? (
                <Image
                  src={vehicle.primary_image_url}
                  alt={vehicle.name}
                  fill
                  sizes="(min-width: 640px) 160px, 120px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base text-white font-medium truncate">{vehicle.name}</p>
              {vehicle.daily_rate && (
                <p className="text-xs sm:text-sm text-white/40">
                  AED {vehicle.daily_rate.toLocaleString()} / day
                </p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function HeroSearch({ vehicles }: HeroSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollYRef = useRef(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const filtered = query.trim()
    ? vehicles.filter((v) => v.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  function handleSelect(slug: string) {
    closeSearch()
    router.push(`/catalogue/${slug}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (filtered.length === 1) {
      handleSelect(filtered[0].slug)
    } else if (query.trim()) {
      closeSearch()
      router.push(`/catalogue?search=${encodeURIComponent(query.trim())}`)
    }
  }

  function openSearch() {
    scrollYRef.current = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollYRef.current}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function closeSearch() {
    setIsOpen(false)
    setQuery('')
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.overflow = ''
    window.scrollTo(0, scrollYRef.current)
  }

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) closeSearch()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

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

  return (
    <>
      {/* Search trigger button */}
      <button
        type="button"
        onClick={openSearch}
        className="animate-fade-in-left relative z-20 flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 border border-white/[0.12] text-white/50 text-sm sm:text-base transition-all duration-200 hover:border-white/30 hover:text-white/70 active:bg-white/[0.06]"
        style={{ animationDelay: '280ms' }}
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        Search cars...
      </button>

      {/* Full-screen search overlay — portaled to body */}
      {mounted && createPortal(
        <div
          className={[
            'fixed inset-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
            isOpen ? 'visible' : 'invisible pointer-events-none',
          ].join(' ')}
        >
          {/* Backdrop */}
          <div
            className={[
              'absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500',
              isOpen ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          {/* Panel */}
          <div
            className={[
              'absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col',
              isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
            ].join(' ')}
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-white/[0.06]">
              <span className="text-base font-medium text-white">Search</span>
              <button
                type="button"
                onClick={closeSearch}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.15] transition-colors duration-200"
                aria-label="Close search"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search input */}
            <div className="px-5 sm:px-8 pt-4">
              <form onSubmit={handleSubmit} className="relative max-w-2xl">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cars..."
                  className="w-full pl-12 pr-4 py-3.5 bg-transparent border border-white/[0.12] text-white placeholder:text-white/30 text-base focus:outline-none focus:border-white/30 transition-all duration-200"
                />
              </form>
            </div>

            {/* Results */}
            <div data-scroll-region className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8 pt-2">
              <div className="max-w-2xl">
                {query.trim() && filtered.length > 0 && (
                  <ResultsList vehicles={filtered} onSelect={handleSelect} />
                )}
                {query.trim() && filtered.length === 0 && (
                  <p className="text-sm text-white/40 py-4">No cars found</p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
