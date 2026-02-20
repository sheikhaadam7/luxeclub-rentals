import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service_role key.
 * Bypasses RLS — only use in trusted server contexts (scraper, admin routes).
 *
 * NEVER import this in Client Components — the 'server-only' guard above
 * will cause a build error if you try.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
