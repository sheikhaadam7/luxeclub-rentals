'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useLanguage, LANGUAGES, flagUrl } from '@/lib/i18n/context'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium tracking-wide text-white border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/30 transition-all duration-200"
      >
        <Image
          src={flagUrl(current.country, 'w40')}
          alt=""
          width={18}
          height={13}
          className="rounded-[2px] object-cover"
          unoptimized
        />
        {current.code.toUpperCase()}
        <svg
          className={['w-3 h-3 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-brand-border bg-brand-surface shadow-xl overflow-hidden z-50">
          {LANGUAGES.map(({ code, label, country }) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLanguage(code)
                setOpen(false)
              }}
              className={[
                'w-full text-left px-3 py-2 text-[13px] font-medium transition-colors flex items-center gap-2.5',
                code === language
                  ? 'text-brand-cyan bg-white/[0.06]'
                  : 'text-brand-muted hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <Image
                src={flagUrl(country, 'w40')}
                alt=""
                width={20}
                height={15}
                className="rounded-[2px] object-cover shrink-0"
                unoptimized
              />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Inline variant for mobile menu — horizontal scrollable row of flag buttons */
export function LanguageSelectorInline() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-1.5 px-4 py-3 mx-1 rounded-xl border border-white/[0.1] bg-white/[0.04] overflow-x-auto">
      <span className="text-xs text-white uppercase tracking-wider mr-1.5 font-medium shrink-0">Language</span>
      {LANGUAGES.map(({ code, country }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={[
            'flex items-center justify-center px-2 py-1.5 rounded-lg transition-colors shrink-0',
            code === language
              ? 'bg-white shadow-sm'
              : 'border border-white/15 hover:border-white/30',
          ].join(' ')}
        >
          <Image
            src={flagUrl(country, 'w40')}
            alt=""
            width={22}
            height={16}
            className="rounded-[2px] object-cover"
            unoptimized
          />
        </button>
      ))}
    </div>
  )
}
