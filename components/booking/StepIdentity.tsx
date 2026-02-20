'use client'
import { useEffect, useRef, useState } from 'react'
import { createVeriffSession, getVerificationStatus, KycStatus } from '@/app/actions/identity'
import { VeriffWidget } from '@/components/identity/VeriffWidget'

interface StepIdentityProps {
  vehicleSlug: string
  /** Called when the user is verified and can advance to the next step */
  onNext: () => void
}

/**
 * Booking wizard — Step 4: Identity Verification
 *
 * Status-dependent UI:
 *  - 'none'               → Prompt to start Veriff
 *  - 'submitted'/'pending' → Polling spinner — auto-advances when verified
 *  - 'verified'           → Green check — auto-advances
 *  - 'rejected'           → Error with retry option
 */
export function StepIdentity({ vehicleSlug, onNext }: StepIdentityProps) {
  const [status, setStatus] = useState<KycStatus | null>(null)
  const [sessionUrl, setSessionUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load current KYC status on mount
  useEffect(() => {
    async function loadStatus() {
      const result = await getVerificationStatus()
      if ('error' in result) {
        setErrorMsg(result.error)
      } else {
        setStatus(result.status)
        if (result.status === 'verified') {
          // Auto-advance immediately if already verified
          onNext()
        }
      }
      setLoading(false)
    }
    loadStatus()
  }, [onNext])

  // Poll every 5 s when status is submitted or pending
  useEffect(() => {
    if (status !== 'submitted' && status !== 'pending') {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    pollingRef.current = setInterval(async () => {
      const result = await getVerificationStatus()
      if ('status' in result) {
        setStatus(result.status)
        if (result.status === 'verified') {
          onNext()
        }
      }
    }, 5000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [status, onNext])

  async function handleStartVerification() {
    setSessionLoading(true)
    setErrorMsg(null)

    // Persist vehicle slug so verify-callback can redirect back
    sessionStorage.setItem('booking_vehicle_slug', vehicleSlug)

    const result = await createVeriffSession()

    if ('alreadyVerified' in result) {
      setStatus('verified')
      onNext()
      return
    }

    if ('error' in result) {
      setErrorMsg(result.error)
      setSessionLoading(false)
      return
    }

    setSessionUrl(result.sessionUrl)
    setStatus('submitted')
    setSessionLoading(false)
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-border border-t-brand-cyan" />
      </div>
    )
  }

  // ---- Error state ----
  if (errorMsg && !status) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/40 p-5">
        <p className="text-sm text-red-300">{errorMsg}</p>
      </div>
    )
  }

  // ---- Verified ----
  if (status === 'verified') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-900/40 border border-green-700">
          <svg
            className="h-8 w-8 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-white">Identity Verified</p>
          <p className="text-xs text-brand-muted">Your documents have been confirmed.</p>
        </div>
        <button
          onClick={onNext}
          className="mt-2 rounded-lg bg-brand-cyan px-6 py-2.5 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors"
        >
          Continue
        </button>
      </div>
    )
  }

  // ---- Submitted / Pending (polling) ----
  if (status === 'submitted' || status === 'pending') {
    // If we have a sessionUrl (user just created session and hasn't been redirected yet), show widget
    if (sessionUrl) {
      return <VeriffWidget sessionUrl={sessionUrl} />
    }

    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-900/40 border border-yellow-700">
          <svg
            className="h-8 w-8 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-white">Verification In Progress</p>
          <p className="text-xs text-brand-muted">
            We&apos;re reviewing your documents. This usually takes a few minutes.
          </p>
        </div>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-border border-t-brand-cyan" />
      </div>
    )
  }

  // ---- Rejected ----
  if (status === 'rejected') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-900/40 border border-red-700">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Verification Failed</p>
            <p className="text-xs text-brand-muted">
              Your verification was not approved. Please ensure your documents are valid and the
              photos are clear.
            </p>
          </div>
        </div>

        {errorMsg && (
          <p className="text-center text-xs text-red-400">{errorMsg}</p>
        )}

        {sessionUrl ? (
          <VeriffWidget sessionUrl={sessionUrl} />
        ) : (
          <button
            onClick={handleStartVerification}
            disabled={sessionLoading}
            className="w-full rounded-lg bg-brand-cyan px-6 py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors disabled:opacity-50"
          >
            {sessionLoading ? 'Creating session...' : 'Try Again'}
          </button>
        )}
      </div>
    )
  }

  // ---- None — prompt verification ----
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-brand-border bg-brand-surface p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
          Identity Verification Required
        </h3>
        <p className="text-sm text-brand-muted">
          UAE rental regulations require us to verify your identity before your first booking. This
          is a one-time check — you won&apos;t need to repeat it for future rentals.
        </p>
        <ul className="space-y-1.5 text-xs text-brand-muted">
          <li className="flex items-center gap-2">
            <span className="text-brand-cyan">&#10003;</span> Passport or national ID
          </li>
          <li className="flex items-center gap-2">
            <span className="text-brand-cyan">&#10003;</span> Valid driving licence
          </li>
          <li className="flex items-center gap-2">
            <span className="text-brand-cyan">&#10003;</span> Quick selfie for liveness
          </li>
        </ul>
      </div>

      {errorMsg && (
        <p className="text-center text-xs text-red-400">{errorMsg}</p>
      )}

      {sessionUrl ? (
        <VeriffWidget sessionUrl={sessionUrl} />
      ) : (
        <button
          onClick={handleStartVerification}
          disabled={sessionLoading}
          className="w-full rounded-lg bg-brand-cyan px-6 py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:ring-offset-2 focus:ring-offset-black"
        >
          {sessionLoading ? 'Creating session...' : 'Verify My Identity'}
        </button>
      )}
    </div>
  )
}
