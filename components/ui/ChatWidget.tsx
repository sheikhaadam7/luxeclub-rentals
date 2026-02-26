'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from '@/lib/i18n/context'

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false })

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const { t } = useTranslation()

  function handleToggle() {
    if (!hasOpened) setHasOpened(true)
    setOpen((prev) => !prev)
  }

  return (
    <>
      {/* Floating chat button — bottom-left */}
      <button
        onClick={handleToggle}
        aria-label={open ? t('chat.ariaClose') : t('chat.ariaOpen')}
        className="fixed bottom-6 left-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-brand-cyan text-brand-black shadow-lg shadow-brand-cyan/25 hover:scale-110 hover:shadow-brand-cyan/40 transition-all duration-300 cursor-pointer"
      >
        {open ? (
          // Close icon
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Chat bubble icon
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
            <path d="M7 9h10v2H7zm0-3h10v2H7z" />
          </svg>
        )}
      </button>

      {/* Chat panel — only mounts once, then toggles visibility */}
      {hasOpened && (
        <ChatPanel open={open} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
