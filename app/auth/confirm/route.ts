import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth confirmation route — handles Supabase email links.
 *
 * Supabase SSR uses PKCE flow, so the email link redirects here with:
 *   ?code=AUTH_CODE  (PKCE — exchangeCodeForSession)
 * OR for older/non-PKCE:
 *   ?token_hash=...&type=recovery  (verifyOtp)
 *
 * After exchanging, redirects to /reset-password for recovery, / for others.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'signup' | 'email' | null

  const redirectUrl = request.nextUrl.clone()
  const supabase = await createClient()

  let success = false
  let isRecovery = type === 'recovery'

  // PKCE flow — exchange auth code for session
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    success = !error
    // Check if this is a recovery session (type may not be in query params for PKCE)
    if (success && data?.user?.recovery_sent_at) {
      const recoverySentAt = new Date(data.user.recovery_sent_at).getTime()
      const now = Date.now()
      // If recovery was sent within the last 10 minutes, treat as recovery flow
      if (now - recoverySentAt < 10 * 60 * 1000) {
        isRecovery = true
      }
    }
  }
  // Legacy flow — verify OTP token hash
  else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
    success = !error
  }

  if (success) {
    if (isRecovery) {
      redirectUrl.pathname = '/reset-password'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }
    redirectUrl.pathname = '/'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  // Token invalid or missing — redirect to sign-in
  redirectUrl.pathname = '/sign-in'
  redirectUrl.search = ''
  return NextResponse.redirect(redirectUrl)
}
