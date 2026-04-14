/**
 * Monthly API quota tracking helpers for outreach_api_usage.
 */

import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type OutreachProvider = 'hunter' | 'serper' | 'scrapingbee'

const QUOTA_LIMITS: Record<OutreachProvider, number> = {
  hunter: 25,       // free tier
  serper: 2500,     // free credits first month; 100/mo thereafter
  scrapingbee: 1000, // free plan
}

function firstOfMonth(): string {
  const d = new Date()
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

/** Current month's usage for a provider. Returns 0 if no row yet. */
export async function getUsage(
  admin: SupabaseClient,
  provider: OutreachProvider
): Promise<{ used: number; limit: number }> {
  const month = firstOfMonth()
  const { data } = await admin
    .from('outreach_api_usage')
    .select('searches_used')
    .eq('month', month)
    .eq('provider', provider)
    .maybeSingle()

  return { used: data?.searches_used ?? 0, limit: QUOTA_LIMITS[provider] }
}

/** Returns true if another call fits within the monthly limit. */
export async function canUseQuota(
  admin: SupabaseClient,
  provider: OutreachProvider
): Promise<boolean> {
  const { used, limit } = await getUsage(admin, provider)
  return used < limit
}

/** Increments the monthly counter by 1 (or n). Idempotent upsert. */
export async function incrementUsage(
  admin: SupabaseClient,
  provider: OutreachProvider,
  n = 1
): Promise<void> {
  const month = firstOfMonth()
  // Try to insert first; if conflict, increment.
  const { error: insertError } = await admin.from('outreach_api_usage').insert({
    month,
    provider,
    searches_used: n,
  })

  if (insertError && insertError.code === '23505') {
    // Row exists — do an atomic increment via raw RPC substitute (select + update).
    // Postgres doesn't have native increment via Supabase JS client without RPC,
    // so we read-then-write. Acceptable for low concurrency (user clicks).
    const { data } = await admin
      .from('outreach_api_usage')
      .select('searches_used')
      .eq('month', month)
      .eq('provider', provider)
      .single()

    await admin
      .from('outreach_api_usage')
      .update({ searches_used: (data?.searches_used ?? 0) + n })
      .eq('month', month)
      .eq('provider', provider)
  }
}

export function quotaLimit(provider: OutreachProvider): number {
  return QUOTA_LIMITS[provider]
}
