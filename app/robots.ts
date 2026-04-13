import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/account', '/bookings', '/book/', '/sign-in', '/reset-password'],
      },
    ],
    sitemap: 'https://luxeclubrentals.com/sitemap.xml',
  }
}
