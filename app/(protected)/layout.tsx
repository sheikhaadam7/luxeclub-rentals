import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { CurrencyProvider } from '@/lib/currency/context'
import { LanguageProvider } from '@/lib/i18n/context'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const detectedCountry = headersList.get('x-vercel-ip-country') ?? undefined
  const supabase = await createClient()
  // SECURITY: getClaims() validates JWT signature — not spoofable like getSession().
  // This is a defense-in-depth check against CVE-2025-29927 middleware bypass.
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    redirect('/sign-in')
  }

  return (
    <LanguageProvider detectedCountry={detectedCountry}>
      <CurrencyProvider>
        <NavBar />
        {children}
        <Footer />
        <WhatsAppFloat />
      </CurrencyProvider>
    </LanguageProvider>
  )
}
