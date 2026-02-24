import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { CurrencyProvider } from '@/lib/currency/context'
import { LanguageProvider } from '@/lib/i18n/context'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const detectedCountry = headersList.get('x-vercel-ip-country') ?? undefined
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const isAuthenticated = !!claimsData?.claims

  return (
    <LanguageProvider detectedCountry={detectedCountry}>
      <CurrencyProvider>
        <NavBar isAuthenticated={isAuthenticated} />
        {children}
        <Footer />
        <WhatsAppFloat />
      </CurrencyProvider>
    </LanguageProvider>
  )
}
