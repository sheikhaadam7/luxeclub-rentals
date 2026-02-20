import { AuthGate } from '@/components/auth/AuthGate'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-luxury flex flex-col items-center justify-center px-4 py-12">
      {/* Subtle top border accent */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-brand-cyan opacity-30" />

      <div className="w-full max-w-sm flex flex-col gap-10">
        {/* Brand wordmark */}
        <header className="text-center flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
            LuxeClub
          </h1>
          <p className="text-xs text-brand-muted uppercase tracking-[0.2em]">
            Dubai Luxury Rentals
          </p>
        </header>

        {/* Separator */}
        <div className="h-[1px] bg-brand-subtle" />

        {/* Auth forms — login/signup/otp managed by AuthGate */}
        <section>
          <AuthGate />
        </section>

        {/* Footer tagline */}
        <footer className="text-center">
          <p className="text-[11px] text-white/20 tracking-wide">
            Exclusive membership &mdash; Dubai
          </p>
        </footer>
      </div>
    </main>
  )
}
