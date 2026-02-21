import 'server-only'
import Stripe from 'stripe'

/**
 * Server-only Stripe client singleton.
 * The 'server-only' guard above prevents this from being imported in Client Components.
 * Use for creating payment intents, confirming payments, and managing customers.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe)
