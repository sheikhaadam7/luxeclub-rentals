'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getGoogleAuthUrl, disconnectGmail, checkForReplies } from '@/app/actions/outreach'

interface GmailConnectProps {
  connected: boolean
  email: string | null
}

export function GmailConnect({ connected, email }: GmailConnectProps) {
  const router = useRouter()
  const [isConnecting, startConnectTransition] = useTransition()
  const [isChecking, startCheckTransition] = useTransition()
  const [isDisconnecting, startDisconnectTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function handleConnect() {
    setMessage(null)
    startConnectTransition(async () => {
      const res = await getGoogleAuthUrl()
      if (res.error || !res.url) {
        setMessage({ ok: false, text: res.error ?? 'Failed' })
        return
      }
      window.location.href = res.url
    })
  }

  function handleDisconnect() {
    if (!confirm('Disconnect Gmail? Reply detection will stop until reconnected.')) return
    startDisconnectTransition(async () => {
      await disconnectGmail()
      router.refresh()
    })
  }

  function handleCheckReplies() {
    setMessage(null)
    startCheckTransition(async () => {
      const res = await checkForReplies()
      if (res.error) {
        setMessage({ ok: false, text: res.error })
      } else {
        setMessage({
          ok: true,
          text: `Checked ${res.checked} pitches, ${res.matched} replies detected`,
        })
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted">Gmail</p>
          <p className="text-sm mt-0.5">
            {connected ? (
              <span className="text-green-400">Connected {email ? `(${email})` : ''}</span>
            ) : (
              <span className="text-white/60">Not connected</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {connected ? (
            <>
              <button
                type="button"
                onClick={handleCheckReplies}
                disabled={isChecking}
                className="px-3 py-1.5 text-xs bg-brand-cyan text-white rounded hover:bg-brand-cyan-hover disabled:opacity-50"
              >
                {isChecking ? 'Checking…' : 'Check for replies'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 text-xs border border-white/15 text-white/60 rounded hover:bg-white/5 disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-3 py-1.5 text-xs bg-brand-cyan text-white rounded hover:bg-brand-cyan-hover disabled:opacity-50"
            >
              {isConnecting ? 'Redirecting…' : 'Connect Gmail'}
            </button>
          )}
        </div>
      </div>
      {message && (
        <p className={`text-[11px] ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
