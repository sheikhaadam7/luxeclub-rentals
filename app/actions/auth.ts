'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signUpSchema, loginSchema, phoneSchema, otpSchema, normalizeUAEPhone } from '@/lib/validations/auth'

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: error.message }

  const redirectTo = formData.get('redirectTo') as string | null
  redirect(redirectTo || '/')
}

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

  const redirectTo = formData.get('redirectTo') as string | null
  redirect(redirectTo || '/')
}

export async function resetPassword(email: string) {
  if (!email || typeof email !== 'string') {
    return { error: 'Please provide a valid email address' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://luxeclubrentals.com'}/auth/confirm`,
  })

  if (error) return { error: error.message }

  // Always return success to prevent email enumeration
  return { success: true }
}

export async function updatePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return { error: error.message }
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'global' })
  redirect('/sign-in')
}

export async function enrollPhoneMFA(rawPhone: string) {
  const parsed = phoneSchema.safeParse({ phone: rawPhone })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const e164 = normalizeUAEPhone(parsed.data.phone)
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'phone',
    phone: e164,
  })

  if (error) return { error: error.message }
  return { factorId: data.id }
}

export async function verifyPhone(phone: string, code: string) {
  const parsedCode = otpSchema.safeParse({ code })
  if (!parsedCode.success) {
    return { error: parsedCode.error.issues[0].message }
  }

  const supabase = await createClient()

  // Get the enrolled phone factor
  const { data: listData, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError) return { error: listError.message }

  const phoneFactor = listData.phone[0]
  if (!phoneFactor) return { error: 'Phone factor not found — please enroll again' }

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: phoneFactor.id,
  })
  if (challengeError) return { error: challengeError.message }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: phoneFactor.id,
    challengeId: challengeData.id,
    code: parsedCode.data.code,
  })
  if (verifyError) return { error: verifyError.message }

  redirect('/')
}
