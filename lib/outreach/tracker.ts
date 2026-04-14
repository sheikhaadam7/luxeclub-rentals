/**
 * Anchor mix + target URL distribution aggregates for the outreach dashboard.
 * Reads from outreach_pitches where status in ('sent', 'replied', 'published').
 */

import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnchorType } from './pitch-templates'

export interface AnchorMix {
  branded: number
  url: number
  generic: number
  partial: number
  exact: number
  total: number
  percents: Record<AnchorType, number>
}

export const ANCHOR_TARGETS: Record<AnchorType, number> = {
  branded: 30,
  url: 25,
  generic: 25,
  partial: 15,
  exact: 5,
}

const LIVE_STATUSES = ['sent', 'replied', 'published']

export async function computeAnchorMix(admin: SupabaseClient): Promise<AnchorMix> {
  const { data } = await admin
    .from('outreach_pitches')
    .select('anchor_type')
    .in('status', LIVE_STATUSES)

  const counts: Record<AnchorType, number> = {
    branded: 0, url: 0, generic: 0, partial: 0, exact: 0,
  }

  for (const row of data ?? []) {
    const type = row.anchor_type as AnchorType
    if (type in counts) counts[type]++
  }

  const total = counts.branded + counts.url + counts.generic + counts.partial + counts.exact
  const percents: Record<AnchorType, number> = { branded: 0, url: 0, generic: 0, partial: 0, exact: 0 }
  if (total > 0) {
    percents.branded = Math.round((counts.branded / total) * 100)
    percents.url = Math.round((counts.url / total) * 100)
    percents.generic = Math.round((counts.generic / total) * 100)
    percents.partial = Math.round((counts.partial / total) * 100)
    percents.exact = Math.round((counts.exact / total) * 100)
  }

  return { ...counts, total, percents }
}

export interface UrlDistribution {
  total: number
  byUrl: Array<{ url: string; count: number; percent: number }>
  homepagePercent: number
}

export async function computeUrlDistribution(admin: SupabaseClient): Promise<UrlDistribution> {
  const { data } = await admin
    .from('outreach_pitches')
    .select('target_url')
    .in('status', LIVE_STATUSES)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const url = row.target_url as string
    counts[url] = (counts[url] ?? 0) + 1
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const byUrl = Object.entries(counts)
    .map(([url, count]) => ({
      url,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const homepage = byUrl.find((e) => e.url === '/' || e.url === '/home')
  const homepagePercent = homepage?.percent ?? 0

  return { total, byUrl, homepagePercent }
}
