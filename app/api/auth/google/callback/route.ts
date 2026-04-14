import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCodeForTokens } from '@/lib/outreach/gmail'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/admin?tab=outreach&gmail_error=${encodeURIComponent(error)}`, request.url))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/admin?tab=outreach&gmail_error=missing_code', request.url))
  }

  // Admin auth
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', claims.sub).single()
  if (profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const admin = createAdminClient()

    await admin.from('outreach_oauth_tokens').upsert({
      provider: 'google',
      admin_user_id: claims.sub,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at?.toISOString() ?? null,
      email: tokens.email,
      scopes: tokens.scopes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider,admin_user_id' })

    return NextResponse.redirect(new URL('/admin?tab=outreach&gmail_connected=1', request.url))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth exchange failed'
    return NextResponse.redirect(new URL(`/admin?tab=outreach&gmail_error=${encodeURIComponent(msg)}`, request.url))
  }
}
