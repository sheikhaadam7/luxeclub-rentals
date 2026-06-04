import type { Metadata } from 'next'
import Link from 'next/link'

// Co-located 404 boundary for /catalogue/[slug].
// Required for Next.js to set HTTP 404 when notFound() is thrown in page.tsx
// (without this file, the boundary falls back to the global default which can
// render the not-found UI at HTTP 200 — a soft-404 that confuses Google).
export const metadata: Metadata = {
  title: 'Vehicle Not Found',
  description: 'The vehicle you were looking for is not in our current fleet. Browse the full catalogue at LuxeClub Rentals Dubai.',
  robots: { index: false, follow: true },
}

export default function VehicleNotFound() {
  return (
    <main className="min-h-screen bg-luxury flex items-center justify-center px-4 py-24">
      <div className="max-w-md text-center space-y-6">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-cyan/80 font-medium">
          404 — Vehicle Not Found
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
          We couldn&apos;t find that car
        </h1>
        <p className="text-base text-white/60 leading-relaxed">
          The vehicle you were looking for isn&apos;t in our current fleet. Browse the full catalogue to find your next rental.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/catalogue"
            className="inline-block px-6 py-3 bg-brand-cyan text-black text-sm font-semibold tracking-wide uppercase hover:bg-white transition-colors duration-300"
          >
            Browse the Fleet
          </Link>
          <Link
            href="/"
            className="inline-block px-6 py-3 border border-white/20 text-white text-sm font-semibold tracking-wide uppercase hover:bg-white/[0.05] transition-colors duration-300"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
