import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { moneyPages } from '@/lib/money-pages'
import { currencyForCountry } from '@/lib/currency/country-map'

// Build a Set of all money-page slugs at module load. These are SEO landing
// pages registered in lib/money-pages.ts — all must be publicly accessible.
// Using a Set keeps the per-request lookup O(1).
const MONEY_PAGE_PATHS = new Set(moneyPages.map((p) => `/${p.slug}`))

const GEO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// Sets the geo-currency cookie on the response IFF the visitor has neither
// an explicit picker choice nor a previous geo guess. Idempotent — safe to
// call before any return path.
function setGeoCookieIfNeeded(response: NextResponse, request: NextRequest) {
  if (request.cookies.has('luxeclub-currency')) return
  if (request.cookies.has('geo-currency')) return
  const country = request.headers.get('x-vercel-ip-country')
  const currency = currencyForCountry(country)
  response.cookies.set('geo-currency', currency, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: GEO_COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function middleware(request: NextRequest) {
  // www → non-www 301 redirect. Google indexes both www and non-www
  // as separate sites, splitting authority. Force everything to non-www.
  const host = request.headers.get('host') ?? ''
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone()
    url.host = host.replace(/^www\./, '')
    return NextResponse.redirect(url, 301)
  }

  // /api/* gets no geo cookie (JSON responses don't need it) and bypasses
  // auth + supabase entirely below. Route handlers manage their own auth.
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // SECURITY: Always use getClaims() on the server.
  // getSession() does NOT validate JWT signature and can be spoofed.
  // getClaims() validates the JWT signature against Supabase's public keys on every call.
  // Returns { data: { claims } } where claims contains sub, email, etc. from the JWT payload.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims ?? null

  // Public routes — accessible without auth
  const publicPaths = ['/', '/sign-in', '/about', '/contact', '/faq', '/catalogue', '/guides', '/reset-password', '/booking-lookup', '/privacy', '/rental-terms', '/bookings/confirmation']
  const isPublicRoute =
    publicPaths.includes(pathname) ||
    MONEY_PAGE_PATHS.has(pathname) ||
    pathname.startsWith('/catalogue/') ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/guides/') ||
    pathname.startsWith('/rent-') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/garage') ||
    pathname.startsWith('/old-garage') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'

  // Unauthenticated user trying to access a protected route — redirect to sign-in
  // Preserve the intended destination so we can redirect back after login
  if (!claims && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('redirectTo', pathname)
    const redirectResponse = NextResponse.redirect(url)
    setGeoCookieIfNeeded(redirectResponse, request)
    return redirectResponse
  }

  // Authenticated user visiting the sign-in page — redirect to home
  if (claims && pathname === '/sign-in') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirectResponse = NextResponse.redirect(url)
    setGeoCookieIfNeeded(redirectResponse, request)
    return redirectResponse
  }

  // Set the geo cookie AFTER all supabase logic — supabaseResponse may have
  // been reassigned inside the setAll callback, so we attach to the final ref.
  setGeoCookieIfNeeded(supabaseResponse, request)
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, and common image/font extensions
     *
     * NOTE: Route group folders like (protected) are stripped from URLs.
     * The URL /dashboard is NOT /(protected)/dashboard.
     * This matcher protects ALL routes including /dashboard, /catalogue, etc.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|mp4|mp3|woff2?)$).*)',
  ],
}
