import { headers } from 'next/headers'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { CurrencyProvider } from '@/lib/currency/context'
import { LanguageProvider } from '@/lib/i18n/context'

export default async function GuidesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const detectedCountry = headersList.get('x-vercel-ip-country') ?? undefined

  return (
    <LanguageProvider detectedCountry={detectedCountry}>
      <CurrencyProvider>
        <NavBar isAuthenticated={false} />
        {children}
        <Footer />
        <WhatsAppFloat />
      </CurrencyProvider>
    </LanguageProvider>
  )
}
