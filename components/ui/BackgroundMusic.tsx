'use client'

import { useState, useRef, useCallback, createContext, useContext } from 'react'

// Shared audio state across all MusicButton instances
interface MusicContextValue {
  playing: boolean
  toggle: () => void
}

const MusicContext = createContext<MusicContextValue>({ playing: false, toggle: () => {} })

/**
 * Wrap the app (or navbar) with this provider — renders the <audio> once.
 * All MusicButton instances share the same play/pause state.
 */
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      audio.pause()
      setPlaying(false)
    }
  }, [])

  return (
    <MusicContext.Provider value={{ playing, toggle }}>
      <audio ref={audioRef} src="/audio/bg-music.mp3" loop preload="auto" />
      {children}
    </MusicContext.Provider>
  )
}

/**
 * Compact play/pause button — can be rendered multiple times,
 * all instances share the same audio via MusicProvider.
 */
export function BackgroundMusic({ className = '' }: { className?: string }) {
  const { playing, toggle } = useContext(MusicContext)

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggle() }}
        className={`group flex items-center justify-center w-8 h-8 rounded-lg text-brand-muted hover:text-white hover:bg-white/[0.06] transition-all duration-200 ${className}`}
        aria-label={playing ? 'Pause music' : 'Play music'}
        title={playing ? 'Pause music' : 'Play music'}
      >
        {playing ? (
          <>
            {/* EQ bars — hidden on hover */}
            <div className="flex items-end gap-[2px] h-3.5 group-hover:hidden">
              <span className="w-[2px] bg-current rounded-full animate-eq-1" style={{ height: '60%' }} />
              <span className="w-[2px] bg-current rounded-full animate-eq-2" style={{ height: '100%' }} />
              <span className="w-[2px] bg-current rounded-full animate-eq-3" style={{ height: '40%' }} />
              <span className="w-[2px] bg-current rounded-full animate-eq-4" style={{ height: '80%' }} />
            </div>
            {/* Pause icon — shown on hover */}
            <svg className="w-3.5 h-3.5 hidden group-hover:block" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </>
        ) : (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes eq-bounce-1 { 0%,100% { height: 40%; } 50% { height: 100%; } }
        @keyframes eq-bounce-2 { 0%,100% { height: 100%; } 50% { height: 30%; } }
        @keyframes eq-bounce-3 { 0%,100% { height: 60%; } 50% { height: 90%; } }
        @keyframes eq-bounce-4 { 0%,100% { height: 80%; } 50% { height: 50%; } }
        .animate-eq-1 { animation: eq-bounce-1 0.8s ease-in-out infinite; }
        .animate-eq-2 { animation: eq-bounce-2 0.6s ease-in-out infinite; }
        .animate-eq-3 { animation: eq-bounce-3 0.9s ease-in-out infinite; }
        .animate-eq-4 { animation: eq-bounce-4 0.7s ease-in-out infinite; }
      `}</style>
    </>
  )
}
