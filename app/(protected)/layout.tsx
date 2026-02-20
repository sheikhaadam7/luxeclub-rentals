import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    redirect('/')
  }

  return <>{children}</>
}
