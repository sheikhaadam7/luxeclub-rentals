import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { ChatWidget } from '@/components/ui/ChatWidget'
import { CurrencyProvider, type Currency } from '@/lib/currency/context'
import { currencyForCountry } from '@/lib/currency/country-map'
import { LanguageProvider } from '@/lib/i18n/context'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  // SECURITY: getClaims() validates JWT signature — not spoofable like getSession().
  // This is a defense-in-depth check against CVE-2025-29927 middleware bypass.
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    redirect('/sign-in')
  }

  const cookieStore = await cookies()
  const userChoice = cookieStore.get('luxeclub-currency')?.value as Currency | undefined
  const geoGuess = cookieStore.get('geo-currency')?.value as Currency | undefined
  const headerCountry = (await headers()).get('x-vercel-ip-country')
  const initialCurrency: Currency = userChoice ?? geoGuess ?? currencyForCountry(headerCountry)

  return (
    <LanguageProvider>
      <CurrencyProvider initialCurrency={initialCurrency}>
        <NavBar />
        {children}
        <Footer />
        <WhatsAppFloat />
        <ChatWidget />
      </CurrencyProvider>
    </LanguageProvider>
  )
}
