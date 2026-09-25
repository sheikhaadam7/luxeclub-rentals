import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { guides } from '@/lib/guides'
import { moneyPages } from '@/lib/money-pages'
import { vehicleContentMap } from '@/lib/vehicle-content'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://luxeclubrentals.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/catalogue`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/booking-lookup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date('2026-04-24'), changeFrequency: 'yearly', priority: 0.3 },
  ]

  const supabase = await createClient()
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('slug, updated_at')
    .eq('is_available', true)

  const vehiclePages: MetadataRoute.Sitemap = (vehicles ?? []).map((v) => {
    // lastmod = MAX(supabase.updated_at, vehicleContentMap.updatedAt).
    // Editorial content edits happen in lib/vehicle-content.ts and don't touch
    // Supabase, so we take whichever is newer to signal Google that the page
    // is fresh regardless of which layer changed.
    const supabaseDate = v.updated_at ? new Date(v.updated_at) : new Date()
    const editorialRaw = vehicleContentMap[v.slug]?.updatedAt
    const editorialDate = editorialRaw ? new Date(editorialRaw) : null
    const lastModified = editorialDate && editorialDate > supabaseDate
      ? editorialDate
      : supabaseDate
    return {
      url: `${base}/catalogue/${v.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  })

  const guidePages: MetadataRoute.Sitemap = [
    { url: `${base}/guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...guides.map((g) => ({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.updatedDate ?? g.publishedDate),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  const moneyPageEntries: MetadataRoute.Sitemap = moneyPages.map((p) => ({
    url: `${base}/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticPages, ...vehiclePages, ...guidePages, ...moneyPageEntries]
}
