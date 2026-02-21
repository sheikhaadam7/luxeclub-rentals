'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptDelivery } from '@/app/actions/bookings'

interface AcceptDeliveryButtonProps {
  bookingId: string
}

export default function AcceptDeliveryButton({ bookingId }: AcceptDeliveryButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setLoading(true)
    setError(null)

    const result = await acceptDelivery(bookingId)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Refresh the page to show updated status
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Confirming...' : 'Confirm Delivery Received'}
      </button>
    </div>
  )
}
