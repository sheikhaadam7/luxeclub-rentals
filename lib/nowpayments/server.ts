import 'server-only'

/**
 * Server-only NOWPayments API helper.
 * The 'server-only' guard above prevents this from being imported in Client Components.
 *
 * Uses direct fetch instead of the SDK because the SDK hardcodes the production
 * API URL and does not support the sandbox endpoint. This helper auto-selects
 * sandbox vs production based on the NOWPAYMENTS_SANDBOX env var.
 */

const API_KEY = process.env.NOWPAYMENTS_API_KEY ?? ''
const IS_SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true'
const BASE_URL = IS_SANDBOX
  ? 'https://api-sandbox.nowpayments.io/v1'
  : 'https://api.nowpayments.io/v1'

export interface CreateInvoiceParams {
  price_amount: number
  price_currency: string
  pay_currency?: string
  ipn_callback_url?: string
  order_id?: string
  order_description?: string
  success_url?: string
  cancel_url?: string
}

export interface InvoiceResult {
  id: number
  order_id: string
  order_description: string
  price_amount: number
  price_currency: string
  invoice_url: string
  success_url: string
  cancel_url: string
  created_at: string
  updated_at: string
}

export const nowpayments = API_KEY
  ? {
      async createInvoice(params: CreateInvoiceParams): Promise<InvoiceResult> {
        const res = await fetch(`${BASE_URL}/invoice`, {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        })

        const data = await res.json()

        if (!res.ok) {
          console.error('NOWPayments API error:', res.status, JSON.stringify(data))
          throw new Error(data.message ?? `NOWPayments API error (${res.status})`)
        }

        return data as InvoiceResult
      },
    }
  : null
