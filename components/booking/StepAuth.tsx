'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginSchema, signUpSchema } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/i18n/context'

type LoginFormData = z.infer<typeof loginSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

interface StepAuthProps {
  onAuthenticated: () => void
  /** Navigation buttons (Back / Continue) rendered inside the white card */
  navButtons?: React.ReactNode
  /** Called when the user taps the back chevron on the card (mobile) */
  onBack?: () => void
}

export function StepAuth({ onAuthenticated, navButtons, onBack }: StepAuthProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to previous step"
            className="sm:hidden -mt-2 -ml-2 mb-1 inline-flex items-center justify-center w-10 h-10 text-zinc-700 active:bg-zinc-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-zinc-900">
          {mode === 'login' ? t('booking.signInContinue') : t('booking.createAccount')}
        </h2>
        <p className="text-sm text-zinc-500">
          {mode === 'login'
            ? t('booking.signInDesc')
            : t('booking.createAccountDesc')}
        </p>
      </div>

      {mode === 'login' ? (
        <InlineLoginForm onSwitch={() => setMode('signup')} onAuthenticated={onAuthenticated} />
      ) : (
        <InlineSignupForm onSwitch={() => setMode('login')} onAuthenticated={onAuthenticated} />
      )}

      {navButtons && <div className="pt-4 border-t border-zinc-200">{navButtons}</div>}
    </div>
  )
}

function InlineLoginForm({
  onSwitch,
  onAuthenticated,
}: {
  onSwitch: () => void
  onAuthenticated: () => void
}) {
  const { t } = useTranslation()
  const [isPending, setIsPending] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    setIsPending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) {
        setError('root', { message: error.message })
        return
      }
      onAuthenticated()
    } catch {
      setError('root', { message: 'Something went wrong. Please try again.' })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        {...register('email')}
        variant="light"
        label={t('booking.email')}
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        variant="light"
        label={t('booking.password')}
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
      />

      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}

      <Button type="submit" loading={isPending}>
        {t('booking.signIn')}
      </Button>

      <button
        type="button"
        onClick={onSwitch}
        className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors text-center"
      >
        {t('booking.noAccount')}
      </button>
    </form>
  )
}

function InlineSignupForm({
  onSwitch,
  onAuthenticated,
}: {
  onSwitch: () => void
  onAuthenticated: () => void
}) {
  const { t } = useTranslation()
  const [isPending, setIsPending] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) })

  const onSubmit = async (data: SignUpFormData) => {
    setIsPending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })
      if (error) {
        setError('root', { message: error.message })
        return
      }
      onAuthenticated()
    } catch {
      setError('root', { message: 'Something went wrong. Please try again.' })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        {...register('email')}
        variant="light"
        label={t('booking.email')}
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        variant="light"
        label={t('booking.password')}
        type="password"
        placeholder={t('booking.minChars')}
        autoComplete="new-password"
        error={errors.password?.message}
      />

      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}

      <Button type="submit" loading={isPending}>
        {t('booking.createAccountBtn')}
      </Button>

      <button
        type="button"
        onClick={onSwitch}
        className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors text-center"
      >
        {t('booking.hasAccount')}
      </button>
    </form>
  )
}
