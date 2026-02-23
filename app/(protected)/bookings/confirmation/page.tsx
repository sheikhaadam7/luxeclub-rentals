'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { useTranslation } from '@/lib/i18n/context'

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const redirectStatus = searchParams.get('redirect_status')
  const isSuccess = redirectStatus === 'succeeded'

  return (
    <main className="min-h-screen bg-luxury flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center space-y-6">
        {isSuccess ? (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-white">{t('confirmation.paymentConfirmed')}</h1>
            <p className="text-sm text-brand-muted">
              {t('confirmation.paymentConfirmedDesc')}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-white">{t('confirmation.paymentIssue')}</h1>
            <p className="text-sm text-brand-muted">
              {t('confirmation.paymentIssueDesc')}
            </p>
          </>
        )}

        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan-hover transition-colors"
        >
          {t('confirmation.viewBookings')}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </main>
  )
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-luxury flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-border border-t-brand-cyan" />
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  )
}
