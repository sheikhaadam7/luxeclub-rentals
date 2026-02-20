'use client'

interface VeriffWidgetProps {
  sessionUrl: string
}

/**
 * Veriff redirect flow widget.
 *
 * Uses redirect (not iframe) — mobile-first for UAE tourists.
 * The callback URL (/book/verify-callback) reads sessionStorage to route
 * the user back to their booking after Veriff completes.
 */
export function VeriffWidget({ sessionUrl }: VeriffWidgetProps) {
  function handleStartVerification() {
    window.location.href = sessionUrl
  }

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border border-brand-border bg-brand-surface p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
          What to Prepare
        </h3>
        <ul className="space-y-2 text-sm text-brand-muted">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-brand-cyan">&#10003;</span>
            <span>Valid passport or national ID</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-brand-cyan">&#10003;</span>
            <span>Valid driving licence</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-brand-cyan">&#10003;</span>
            <span>Selfie for liveness check</span>
          </li>
        </ul>
        <p className="text-xs text-brand-muted pt-1">
          You&apos;ll be guided through passport, driving licence, and selfie verification. This
          usually takes 2–3 minutes.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleStartVerification}
        className="w-full rounded-lg bg-brand-cyan px-6 py-3 text-sm font-semibold text-black hover:bg-brand-cyan-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:ring-offset-2 focus:ring-offset-black"
      >
        Start Verification
      </button>

      {/* Trust signal */}
      <p className="text-center text-xs text-brand-muted">
        Powered by Veriff &mdash; bank-grade identity verification
      </p>
    </div>
  )
}
