'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const startedRef = useRef(false)

  // On first user gesture anywhere on the page, start playback
  useEffect(() => {
    function startOnGesture() {
      if (startedRef.current) return
      const audio = audioRef.current
      if (!audio) return
      startedRef.current = true
      audio.play().then(() => setPlaying(true)).catch(() => {
        startedRef.current = false
      })
    }

    const events = ['click', 'touchstart', 'keydown', 'scroll'] as const
    events.forEach((e) => document.addEventListener(e, startOnGesture, { once: true, passive: true }))
    return () => {
      events.forEach((e) => document.removeEventListener(e, startOnGesture))
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      audio.pause()
      setPlaying(false)
    }
  }, [])

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress(audio.currentTime / audio.duration)
  }, [])

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current
    const audio = audioRef.current
    if (!bar || !audio || !audio.duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * audio.duration
    setProgress(ratio)
  }, [])

  return (
    <>
      <audio
        ref={audioRef}
        src="/audio/bg-music.mp3"
        loop
        preload="auto"
        onTimeUpdate={onTimeUpdate}
      />

      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[55]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] shadow-lg shadow-black/20">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); togglePlay() }}
            className="flex items-center justify-center w-6 h-6 text-white/80 hover:text-white transition-colors duration-150"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div
            ref={barRef}
            onClick={(e) => { e.stopPropagation(); seek(e) }}
            className="w-24 sm:w-32 h-[3px] bg-white/[0.12] rounded-full cursor-pointer group relative"
          >
            <div
              className="h-full bg-white/60 rounded-full transition-none"
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ left: `calc(${progress * 100}% - 4px)` }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
