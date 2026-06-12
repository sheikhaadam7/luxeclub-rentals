import { cookies, headers } from 'next/headers'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { ChatWidget } from '@/components/ui/ChatWidget'
import { CurrencyProvider, type Currency } from '@/lib/currency/context'
import { currencyForCountry } from '@/lib/currency/country-map'
import { LanguageProvider } from '@/lib/i18n/context'

export default async function GuidesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const userChoice = cookieStore.get('luxeclub-currency')?.value as Currency | undefined
  const geoGuess = cookieStore.get('geo-currency')?.value as Currency | undefined
  const headerCountry = (await headers()).get('x-vercel-ip-country')
  const initialCurrency: Currency = userChoice ?? geoGuess ?? currencyForCountry(headerCountry)

  return (
    <LanguageProvider>
      <CurrencyProvider initialCurrency={initialCurrency}>
        <NavBar isAuthenticated={false} />
        {children}
        <Footer />
        <WhatsAppFloat />
        <ChatWidget />
      </CurrencyProvider>
    </LanguageProvider>
  )
}
