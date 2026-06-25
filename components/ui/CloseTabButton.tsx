'use client'

/**
 * Floating "Close" pill used on pages that are typically opened in a new tab
 * from another flow (rental-terms, privacy, etc.). Tries window.close() first
 * (works for tabs opened via target="_blank" from the same origin), then falls
 * back to history.back() if the tab is still open after 100ms.
 *
 * Render this inside a fixed-position wrapper, e.g.:
 *   <div className="fixed top-20 right-4 sm:top-24 sm:right-6 z-[60]">
 *     <CloseTabButton />
 *   </div>
 */
export function CloseTabButton() {
  function handleClose() {
    try {
      window.close()
    } catch {
      /* ignore — try fallback */
    }
    setTimeout(() => {
      if (!document.hidden && window.history.length > 1) {
        window.history.back()
      }
    }, 100)
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-zinc-100 text-zinc-900 text-base font-semibold shadow-xl shadow-black/40 transition-colors"
      aria-label="Close and return to previous page"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      Close
    </button>
  )
}
