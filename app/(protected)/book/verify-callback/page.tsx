'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /book/verify-callback
 *
 * Landing page for users returning from Veriff's hosted verification flow.
 * Reads 'booking_vehicle_slug' from sessionStorage and redirects back to
 * /book/{slug} so the user can continue their booking wizard.
 * Falls back to /catalogue if no slug is found.
 */
export default function VerifyCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const slug = sessionStorage.getItem('booking_vehicle_slug')
    // Clear immediately after reading — prevent stale redirects
    sessionStorage.removeItem('booking_vehicle_slug')

    if (slug) {
      router.push(`/book/${slug}`)
    } else {
      router.push('/catalogue')
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-luxury">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-border border-t-brand-cyan" />
        <p className="text-sm text-brand-muted">Returning to your booking&hellip;</p>
      </div>
    </main>
  )
}
