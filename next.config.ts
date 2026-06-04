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
      // ── Renamed / removed vehicles ──────────────────────────────────────
      // Specific slug overrides MUST come BEFORE the wildcard /garage/:slug
      // and the numeric catch-all so they match first.
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
      // Old "rolls-royce-cullinan" → current "rolls-royce-culli-mansory"
      // (the only Cullinan in the current fleet). Caught in GSC.
      {
        source: '/garage/rolls-royce-cullinan',
        destination: '/catalogue/rolls-royce-culli-mansory',
        permanent: true,
      },
      {
        source: '/old-garage/rolls-royce-cullinan',
        destination: '/catalogue/rolls-royce-culli-mansory',
        permanent: true,
      },
      {
        source: '/catalogue/rolls-royce-cullinan',
        destination: '/catalogue/rolls-royce-culli-mansory',
        permanent: true,
      },

      // ── Numeric ID URLs from the OLD site ───────────────────────────────
      // The previous CMS used numeric vehicle IDs in paths (e.g. /garage/1000,
      // /catalogue/1000). Those IDs do not map to anything in the current
      // database, so send all numeric paths to the fleet listing page —
      // this preserves the link equity instead of letting them 404 + noindex.
      // Path-level regex `(\\d+)` matches one-or-more digits only.
      {
        source: '/garage/:id(\\d+)',
        destination: '/catalogue',
        permanent: true,
      },
      {
        source: '/old-garage/:id(\\d+)',
        destination: '/catalogue',
        permanent: true,
      },
      {
        source: '/catalogue/:id(\\d+)',
        destination: '/catalogue',
        permanent: true,
      },

      // ── Old /garage/* + /old-garage/* → current /catalogue/* ────────────
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
      {
        source: '/old-garage',
        destination: '/catalogue',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
