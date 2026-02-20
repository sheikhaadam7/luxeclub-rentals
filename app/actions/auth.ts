'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signUpSchema, loginSchema, phoneSchema, otpSchema, normalizeUAEPhone } from '@/lib/validations/auth'

// Sign up with email + password. Returns { userId } on success, { error } on failure.
// Does NOT log the user in — email confirmation may be disabled in Supabase dashboard for v1.
export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: error.message }
  return { userId: data.user?.id }
}

// Enroll phone as MFA factor and immediately send OTP challenge.
// Call this after signUp() succeeds, while the user is authenticated.
// Returns { factorId, challengeId } for the OTP step, or { error }.
export async function enrollPhoneMFA(phone: string) {
  const parsed = phoneSchema.safeParse({ phone })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const e164Phone = normalizeUAEPhone(parsed.data.phone)
  const supabase = await createClient()

  // Enroll phone as MFA factor
  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'phone',
    phone: e164Phone,
  })
  if (enrollError) return { error: enrollError.message }

  // Immediately trigger SMS OTP challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: enrollData.id,
  })
  if (challengeError) return { error: challengeError.message }

  return { factorId: enrollData.id, challengeId: challengeData.id }
}

// Verify the OTP code entered by the user.
// On success, redirects to /dashboard. On failure, returns { error }.
export async function verifyPhoneMFA(factorId: string, challengeId: string, code: string) {
  const parsed = otpSchema.safeParse({ code })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code: parsed.data.code,
  })

  if (error) return { error: error.message }
  redirect('/dashboard')
}

// Log in with email + password. On success, redirects to /dashboard.
// On failure, returns { error }.
export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: error.message }
  redirect('/dashboard')
}

// Log out from any page. Always redirects to / (the login gate).
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
