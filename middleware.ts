import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // Public routes — accessible without auth
  const publicPaths = ['/', '/sign-in', '/about', '/contact', '/faq', '/catalogue', '/guides', '/reset-password', '/booking-lookup']
  const isPublicRoute = publicPaths.includes(pathname) || pathname.startsWith('/catalogue/') || pathname.startsWith('/book/') || pathname.startsWith('/auth/') || pathname.startsWith('/guides/')

  // Unauthenticated user trying to access a protected route — redirect to sign-in
  // Preserve the intended destination so we can redirect back after login
  if (!claims && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated user visiting the sign-in page — redirect to home
  if (claims && pathname === '/sign-in') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

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
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|woff2?)$).*)',
  ],
}
