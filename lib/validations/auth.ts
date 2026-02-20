import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be under 72 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Accepts UAE local format (0501234567) or E.164 (+971501234567)
export const phoneSchema = z.object({
  phone: z
    .string()
    .regex(
      /^(\+971|0)(5[024568]|2[234679]|3[0-9]|4[0-9]|6[0-9]|7[0-9]|9[0-9])\d{7}$/,
      'Enter a valid UAE phone number (e.g. 0501234567)'
    ),
})

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, 'OTP code must be 6 digits')
    .regex(/^\d{6}$/, 'OTP code must be digits only'),
})

// Normalize UAE phone to E.164 format for Supabase MFA enrollment
export function normalizeUAEPhone(phone: string): string {
  if (phone.startsWith('+971')) return phone
  if (phone.startsWith('0')) return '+971' + phone.slice(1)
  return '+971' + phone
}
