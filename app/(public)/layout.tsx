import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/nav/NavBar'
import { Footer } from '@/components/nav/Footer'
import { WhatsAppFloat } from '@/components/ui/WhatsAppFloat'
import { CurrencyProvider } from '@/lib/currency/context'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const isAuthenticated = !!claimsData?.claims

  return (
    <CurrencyProvider>
      <NavBar isAuthenticated={isAuthenticated} />
      {children}
      <Footer />
      <WhatsAppFloat />
    </CurrencyProvider>
  )
}
