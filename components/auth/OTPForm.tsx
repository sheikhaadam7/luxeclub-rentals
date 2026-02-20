'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { otpSchema } from '@/lib/validations/auth'
import { verifyPhoneMFA } from '@/app/actions/auth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type OTPFormData = z.infer<typeof otpSchema>

interface OTPFormProps {
  factorId: string
  challengeId: string
}

export function OTPForm({ factorId, challengeId }: OTPFormProps) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OTPFormData>({ resolver: zodResolver(otpSchema) })

  const onSubmit = (data: OTPFormData) => {
    startTransition(async () => {
      const result = await verifyPhoneMFA(factorId, challengeId, data.code)
      if (result?.error) {
        setError('root', { message: result.error })
      }
      // On success, verifyPhoneMFA() calls redirect('/dashboard') server-side
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <p className="text-sm text-white/50 text-center">
        Enter the 6-digit code sent to your phone
      </p>
      <Input
        {...register('code')}
        label="Verification code"
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        autoComplete="one-time-code"
        error={errors.code?.message}
      />
      {errors.root && (
        <p className="text-sm text-red-400">{errors.root.message}</p>
      )}
      <Button type="submit" loading={isPending}>
        Verify phone
      </Button>
    </form>
  )
}
