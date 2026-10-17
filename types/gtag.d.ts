/**
 * Minimal typing for the Google Analytics tag.
 *
 * The site loads gtag.js as a raw script in `app/layout.tsx`, with no npm
 * package behind it, so nothing in the repo knows these globals exist.
 * Without this, any reference to `window.dataLayer` is a TypeScript
 * error.
 *
 * `dataLayer` is typed rather than `gtag` deliberately: we push to the
 * queue directly instead of calling the helper, so an event survives
 * being fired before the library has finished loading. See lib/analytics.ts.
 */
export {}

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}
