'use client'

import { UseFormReturn } from 'react-hook-form'
import type { BookingFormValues } from '@/lib/validations/booking'
import { Input } from '@/components/ui/Input'

interface StepGuestContactProps {
  form: UseFormReturn<BookingFormValues>
}

export function StepGuestContact({ form }: StepGuestContactProps) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-white">
          Contact Details
        </h2>
        <p className="text-sm text-brand-muted">
          Enter your contact information so we can confirm your booking.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Input
          {...register('guestName')}
          label="Full Name"
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          error={errors.guestName?.message}
        />
        <Input
          {...register('guestEmail')}
          label="Email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          error={errors.guestEmail?.message}
        />
        <Input
          {...register('guestPhone')}
          label="Phone Number"
          type="tel"
          placeholder="+44 7700 900000"
          autoComplete="tel"
          error={errors.guestPhone?.message}
        />
      </div>
    </div>
  )
}
