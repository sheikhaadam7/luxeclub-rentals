import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { guides } from '@/lib/guides'
import { moneyPages } from '@/lib/money-pages'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://luxeclubrentals.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/catalogue`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/booking-lookup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const supabase = await createClient()
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('slug, updated_at')
    .eq('is_available', true)

  const vehiclePages: MetadataRoute.Sitemap = (vehicles ?? []).map((v) => ({
    url: `${base}/catalogue/${v.slug}`,
    lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const guidePages: MetadataRoute.Sitemap = [
    { url: `${base}/guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...guides.map((g) => ({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.publishedDate),
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
