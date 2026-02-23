import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { CurrencyProvider } from '@/lib/currency/context'
import { LanguageProvider } from '@/lib/i18n/context'

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <NavBar isAuthenticated={false} />
        {children}
        <Footer />
        <WhatsAppFloat />
      </CurrencyProvider>
    </LanguageProvider>
  )
}
