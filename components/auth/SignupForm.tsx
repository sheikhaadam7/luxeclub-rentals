'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUpSchema } from '@/lib/validations/auth'
import { signUp } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type SignUpFormData = z.infer<typeof signUpSchema>

interface SignupFormProps {
  onSwitch: () => void
  redirectTo?: string
}

export function SignupForm({ onSwitch, redirectTo }: SignupFormProps) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) })

  const onSubmit = (data: SignUpFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)
      if (redirectTo) formData.set('redirectTo', redirectTo)

      const result = await signUp(formData)
      if (result?.error) {
        form.setError('root', { message: result.error })
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        {...form.register('email')}
        label="Email"
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        error={form.formState.errors.email?.message}
      />
      <Input
        {...form.register('password')}
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
      />
      {form.formState.errors.root && (
        <p className="text-sm text-red-400">{form.formState.errors.root.message}</p>
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
