'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { InlineLoginForm, InlineSignupForm } from '@/components/booking/StepAuth'
import { useTranslation } from '@/lib/i18n/context'

interface SignInModalProps {
  open: boolean
  onClose: () => void
  /** Fires after a successful sign-in OR sign-up — closes the modal in the caller. */
  onAuthenticated: () => void
}

export function SignInModal({ open, onClose, onAuthenticated }: SignInModalProps) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  useEffect(() => setMounted(true), [])

  // Reset to login mode whenever the modal reopens
  useEffect(() => {
    if (open) setMode('login')
  }, [open])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
      className={`fixed inset-0 z-[120] ${open ? '' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`absolute inset-0 bg-black/60 transition-opacity duration-150 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Centered card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-white rounded-2xl shadow-2xl border-2 border-brand-cyan
            w-full max-w-[440px] max-h-[88vh] flex flex-col overflow-hidden
            transition-[opacity,transform] duration-150 will-change-[opacity,transform]
            ${open ? 'pointer-events-auto opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-[0.98]'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-zinc-900">
              {mode === 'login' ? t('booking.signInContinue') : t('booking.createAccount')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="px-6 pb-4 text-base text-zinc-500">
            {mode === 'login' ? t('booking.signInDesc') : t('booking.createAccountDesc')}
          </p>

          {/* Form */}
          <div className="px-6 pb-6 overflow-y-auto">
            {mode === 'login' ? (
              <InlineLoginForm
                onSwitch={() => setMode('signup')}
                onAuthenticated={onAuthenticated}
              />
            ) : (
              <InlineSignupForm
                onSwitch={() => setMode('login')}
                onAuthenticated={onAuthenticated}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
