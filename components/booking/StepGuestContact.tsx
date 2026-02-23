'use client'

import { UseFormReturn } from 'react-hook-form'
import type { BookingFormValues } from '@/lib/validations/booking'
import { Input } from '@/components/ui/Input'
import { useTranslation } from '@/lib/i18n/context'

interface StepGuestContactProps {
  form: UseFormReturn<BookingFormValues>
}

export function StepGuestContact({ form }: StepGuestContactProps) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-white">
          {t('booking.contactDetails')}
        </h2>
        <p className="text-sm text-brand-muted">
          {t('booking.contactDetailsDesc')}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Input
          {...register('guestName')}
          label={t('booking.fullName')}
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          error={errors.guestName?.message}
        />
        <Input
          {...register('guestEmail')}
          label={t('booking.email')}
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          error={errors.guestEmail?.message}
        />
        <Input
          {...register('guestPhone')}
          label={t('booking.phoneNumber')}
          type="tel"
          placeholder="+44 7700 900000"
          autoComplete="tel"
          error={errors.guestPhone?.message}
        />
      </div>
    </div>
  )
}
