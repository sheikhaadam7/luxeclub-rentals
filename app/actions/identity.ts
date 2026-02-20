'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type KycStatus = 'none' | 'submitted' | 'pending' | 'verified' | 'rejected'

/**
 * Create a Veriff verification session for the authenticated user.
 * Returns the Veriff-hosted session URL the user is redirected to.
 * Returns { alreadyVerified: true } if the user already has kyc_status = 'verified'.
 */
export async function createVeriffSession(): Promise<
  | { alreadyVerified: true }
  | { sessionUrl: string; sessionId: string }
  | { error: string }
> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return { error: 'Not authenticated' }
  }

  const user = userData.user

  // Check if user is already verified — skip session creation
  const { data: profile } = await supabase
    .from('profiles')
    .select('kyc_status')
    .eq('id', user.id)
    .single()

  if (profile?.kyc_status === 'verified') {
    return { alreadyVerified: true }
  }

  // Create a Veriff verification session
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/book/verify-callback`

  let veriffResponse: Response
  try {
    veriffResponse = await fetch('https://stationapi.veriff.com/v1/sessions', {
      method: 'POST',
      headers: {
        'X-AUTH-CLIENT': process.env.VERIFF_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verification: {
          callback: callbackUrl,
          person: { firstName: '', lastName: '' },
          vendorData: user.id,
          timestamp: new Date().toISOString(),
        },
      }),
    })
  } catch (err) {
    console.error('createVeriffSession: fetch error', err)
    return { error: 'Failed to create verification session' }
  }

  if (!veriffResponse.ok) {
    const text = await veriffResponse.text()
    console.error('createVeriffSession: Veriff API error', veriffResponse.status, text)
    return { error: 'Verification service unavailable' }
  }

  const json = await veriffResponse.json()
  const sessionUrl: string = json?.verification?.url
  const sessionId: string = json?.verification?.id

  if (!sessionUrl || !sessionId) {
    console.error('createVeriffSession: unexpected Veriff response shape', json)
    return { error: 'Invalid response from verification service' }
  }

  // Persist session ID and mark as submitted in profiles
  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from('profiles')
    .update({
      kyc_session_id: sessionId,
      kyc_status: 'submitted',
      kyc_provider: 'veriff',
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('createVeriffSession: profile update error', updateError)
    return { error: 'Failed to save verification session' }
  }

  return { sessionUrl, sessionId }
}

/**
 * Return the current KYC status for the authenticated user.
 */
export async function getVerificationStatus(): Promise<
  { status: KycStatus } | { error: string }
> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()

  if (authError || !userData.user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('kyc_status')
    .eq('id', userData.user.id)
    .single()

  if (profileError) {
    console.error('getVerificationStatus: profile query error', profileError)
    return { error: 'Failed to fetch verification status' }
  }

  const raw = profile?.kyc_status as string | null | undefined
  const validStatuses: KycStatus[] = ['none', 'submitted', 'pending', 'verified', 'rejected']
  const status: KycStatus = validStatuses.includes(raw as KycStatus)
    ? (raw as KycStatus)
    : 'none'

  return { status }
}
