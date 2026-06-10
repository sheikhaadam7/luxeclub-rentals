'use client'

import { UseFormReturn } from 'react-hook-form'
import type { BookingFormValues } from '@/lib/validations/booking'
import { Input } from '@/components/ui/Input'
import { useTranslation } from '@/lib/i18n/context'

interface StepGuestContactProps {
  form: UseFormReturn<BookingFormValues>
  /** Navigation buttons (Back / Continue) rendered inside the white card */
  navButtons?: React.ReactNode
  /** Called when the user taps the back chevron on the card (mobile) */
  onBack?: () => void
}

export function StepGuestContact({ form, navButtons, onBack }: StepGuestContactProps) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-xl border-2 border-brand-cyan p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to previous step"
            className="sm:hidden -mt-2 -ml-2 mb-1 inline-flex items-center gap-1 h-10 pl-2 pr-3 text-[15px] font-bold text-black active:bg-black/10 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-zinc-900">
          {t('booking.contactDetails')}
        </h2>
        <p className="text-sm text-zinc-500">
          {t('booking.contactDetailsDesc')}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Input
          {...register('guestName')}
          variant="light"
          label={t('booking.fullName')}
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          error={errors.guestName?.message}
        />
        <Input
          {...register('guestEmail')}
          variant="light"
          label={t('booking.email')}
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          error={errors.guestEmail?.message}
        />
        <Input
          {...register('guestPhone')}
          variant="light"
          label={t('booking.phoneNumber')}
          type="tel"
          placeholder="+44 7700 900000"
          autoComplete="tel"
          error={errors.guestPhone?.message}
        />
      </div>

      {navButtons && <div className="pt-4 border-t border-zinc-200">{navButtons}</div>}
    </div>
  )
}
