'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginSchema, signUpSchema } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type LoginFormData = z.infer<typeof loginSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

interface StepAuthProps {
  onAuthenticated: () => void
}

export function StepAuth({ onAuthenticated }: StepAuthProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-white">
          {mode === 'login' ? 'Sign in to continue' : 'Create an account'}
        </h2>
        <p className="text-sm text-brand-muted">
          {mode === 'login'
            ? 'Sign in to your account to complete your booking.'
            : 'Create a free account to complete your booking.'}
        </p>
      </div>

      {mode === 'login' ? (
        <InlineLoginForm onSwitch={() => setMode('signup')} onAuthenticated={onAuthenticated} />
      ) : (
        <InlineSignupForm onSwitch={() => setMode('login')} onAuthenticated={onAuthenticated} />
      )}
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
        label="Email"
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
      />

      {errors.root && (
        <p className="text-sm text-red-400">{errors.root.message}</p>
      )}

      <Button type="submit" loading={isPending}>
        Sign in
      </Button>

      <button
        type="button"
        onClick={onSwitch}
        className="text-xs text-white/40 hover:text-white/70 transition-colors text-center"
      >
        Don&apos;t have an account? Create one
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
        label="Email"
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        error={errors.password?.message}
      />

      {errors.root && (
        <p className="text-sm text-red-400">{errors.root.message}</p>
      )}

      <Button type="submit" loading={isPending}>
        Create account
      </Button>

      <button
        type="button"
        onClick={onSwitch}
        className="text-xs text-white/40 hover:text-white/70 transition-colors text-center"
      >
        Already have an account? Sign in
      </button>
    </form>
  )
}
