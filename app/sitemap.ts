import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.luxeclubrentals.ae'

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/catalogue`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
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

  return [...staticPages, ...vehiclePages]
}
