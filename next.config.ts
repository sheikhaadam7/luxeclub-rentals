import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },
  async redirects() {
    return [
      // Renamed / removed vehicles — specific slug overrides must come
      // BEFORE the wildcard /garage/:slug rule so they match first.
      {
        source: '/garage/range-rover-orange',
        destination: '/catalogue/range-rover-svr',
        permanent: true,
      },
      {
        source: '/old-garage/range-rover-orange',
        destination: '/catalogue/range-rover-svr',
        permanent: true,
      },
      {
        source: '/garage/rolls-royce-dawn',
        destination: '/rent-rolls-royce-in-dubai',
        permanent: true,
      },
      {
        source: '/old-garage/rolls-royce-dawn',
        destination: '/rent-rolls-royce-in-dubai',
        permanent: true,
      },
      // Old /garage/* paths → current /catalogue/* equivalents.
      // The previous version of the site used /garage/ as the vehicle
      // detail route. Google still has these indexed — 301 redirects
      // consolidate the signals into the canonical /catalogue/ URLs.
      {
        source: '/garage/:slug',
        destination: '/catalogue/:slug',
        permanent: true,
      },
      {
        source: '/old-garage/:slug',
        destination: '/catalogue/:slug',
        permanent: true,
      },
      {
        source: '/garage',
        destination: '/catalogue',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
