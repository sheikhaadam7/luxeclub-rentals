import Link from 'next/link'
import { AuthGate } from '@/components/auth/AuthGate'

interface PageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { redirectTo } = await searchParams

  return (
    <main className="min-h-screen bg-luxury flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-cyan/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-brand-cyan/[0.02] blur-[100px] pointer-events-none" />

      {/* Subtle top border accent */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-white/30 hover:text-white/70 transition-colors duration-300"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Home
      </Link>

      <div className="relative w-full max-w-sm flex flex-col gap-10">
        {/* Brand wordmark */}
        <header className="text-center flex flex-col gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
            LuxeClub
          </h1>
          <p className="text-xs text-brand-muted uppercase tracking-[0.25em]">
            Dubai Luxury Rentals
          </p>
        </header>

        {/* Glass card with auth forms */}
        <div className="glass border border-white/[0.08] rounded-2xl p-8">
          <AuthGate redirectTo={redirectTo} />
        </div>

        {/* Footer tagline */}
        <footer className="text-center space-y-3">
          <p className="text-[11px] text-white/20 tracking-wide">
            Exclusive membership &mdash; Dubai
          </p>
        </footer>
      </div>
    </main>
  )
}
