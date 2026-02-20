'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUpSchema, phoneSchema } from '@/lib/validations/auth'
import { signUp, enrollPhoneMFA } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type SignUpFormData = z.infer<typeof signUpSchema>
type PhoneFormData = z.infer<typeof phoneSchema>

interface SignupFormProps {
  onSwitch: () => void
  onPhoneStep: (mfa: { factorId: string; challengeId: string }) => void
}

export function SignupForm({ onSwitch, onPhoneStep }: SignupFormProps) {
  const [step, setStep] = useState<'account' | 'phone'>('account')
  const [isPending, startTransition] = useTransition()

  const accountForm = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) })
  const phoneForm = useForm<PhoneFormData>({ resolver: zodResolver(phoneSchema) })

  const onAccountSubmit = (data: SignUpFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)

      const result = await signUp(formData)
      if (result?.error) {
        accountForm.setError('root', { message: result.error })
        return
      }
      setStep('phone')
    })
  }

  const onPhoneSubmit = (data: PhoneFormData) => {
    startTransition(async () => {
      const result = await enrollPhoneMFA(data.phone)
      if (result?.error) {
        phoneForm.setError('root', { message: result.error })
        return
      }
      if (result?.factorId && result?.challengeId) {
        onPhoneStep({ factorId: result.factorId, challengeId: result.challengeId })
      }
    })
  }

  if (step === 'phone') {
    return (
      <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="flex flex-col gap-5">
        <p className="text-sm text-white/50 text-center">
          Enter your UAE mobile number to receive a verification code
        </p>
        <Input
          {...phoneForm.register('phone')}
          label="Phone number"
          type="tel"
          placeholder="0501234567"
          autoComplete="tel"
          error={phoneForm.formState.errors.phone?.message}
        />
        {phoneForm.formState.errors.root && (
          <p className="text-sm text-red-400">{phoneForm.formState.errors.root.message}</p>
        )}
        <Button type="submit" loading={isPending}>
          Send verification code
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="flex flex-col gap-5">
      <Input
        {...accountForm.register('email')}
        label="Email"
        type="email"
        placeholder="your@email.com"
        autoComplete="email"
        error={accountForm.formState.errors.email?.message}
      />
      <Input
        {...accountForm.register('password')}
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        error={accountForm.formState.errors.password?.message}
      />
      {accountForm.formState.errors.root && (
        <p className="text-sm text-red-400">{accountForm.formState.errors.root.message}</p>
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
