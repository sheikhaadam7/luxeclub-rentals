'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations/auth'
import { login } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { z } from 'zod'

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSwitch: () => void
  onForgot: () => void
  redirectTo?: string
}

export function LoginForm({ onSwitch, onForgot, redirectTo }: LoginFormProps) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)
      if (redirectTo) formData.set('redirectTo', redirectTo)

      const result = await login(formData)
      if (result?.error) {
        setError('root', { message: result.error })
      }
    })
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgot}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Forgot password?
        </button>
      </div>

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
