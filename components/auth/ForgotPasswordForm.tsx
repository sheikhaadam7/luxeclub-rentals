'use client'

import { useState, useTransition } from 'react'
import { resetPassword } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ForgotPasswordFormProps {
  onBack: () => void
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    startTransition(async () => {
      const result = await resetPassword(email.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-white">Check your email</p>
          <p className="text-xs text-brand-muted leading-relaxed">
            If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent a password reset link.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-white/40 hover:text-white/70 transition-colors text-center"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-white">Reset your password</p>
        <p className="text-xs text-brand-muted leading-relaxed">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <Button type="submit" loading={isPending}>
        Send reset link
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="text-xs text-white/40 hover:text-white/70 transition-colors text-center"
      >
        Back to sign in
      </button>
    </form>
  )
}
