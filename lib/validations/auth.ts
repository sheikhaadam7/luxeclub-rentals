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

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(9, 'Enter a valid phone number')
    .max(15, 'Enter a valid phone number'),
})

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be digits only'),
})

/**
 * Normalises UAE phone numbers to E.164 (+971XXXXXXXXX).
 * Accepts local format (0501234567) or international (+971501234567).
 */
export function normalizeUAEPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '')
  if (cleaned.startsWith('+971')) return cleaned
  if (cleaned.startsWith('00971')) return '+' + cleaned.slice(2)
  if (cleaned.startsWith('0')) return '+971' + cleaned.slice(1)
  return '+971' + cleaned
}
