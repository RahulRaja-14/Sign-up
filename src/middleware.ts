import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Public routes that do not require authentication
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password', '/verify-otp'];
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/profile'];
  // Routes that require a session but are part of an auth flow
  const authFlowRoutes = ['/reset-password'];


  const isPublicRoute = publicRoutes.includes(pathname);
  const isProtectedRoute = protectedRoutes.some(p => pathname.startsWith(p));
  const isAuthFlowRoute = authFlowRoutes.includes(pathname);

  // If the user has no session and is trying to access a protected page
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If the user has a session and is trying to access a public-only route like login/signup
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If the user has no session and lands on the root, redirect to login
  if (!session && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // The /reset-password page should only be accessible if there is an active session
  // which is granted after clicking the recovery link.
  if (!session && isAuthFlowRoute) {
    return NextResponse.redirect(new URL('/forgot-password?error=Invalid session. Please start the password reset process again.', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
