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

      // ── Old /garage + /old-garage index pages → current /catalogue ──────
      // The previous version of the site used /garage/ as the vehicle
      // detail route. We deliberately do NOT keep generic /garage/:slug or
      // /old-garage/:slug catch-all 301s — those would mask retired cars
      // as soft-404s on /catalogue/:slug. Instead, anything not matched by
      // a specific override above is handled by app/garage/[slug]/route.ts
      // and app/old-garage/[slug]/route.ts which return 410 Gone.
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
