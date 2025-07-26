import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

// The protected routes that require a user session.
const protectedRoutes = ["/dashboard", "/profile"];

// The authentication flow routes that should only be accessible
// when a user has a temporary session (e.g., after OTP verification).
const authFlowRoutes = ["/reset-password", "/verify-otp"];

// Public-only routes that should not be accessible to signed-in users.
const publicOnlyRoutes = ["/login", "/signup", "/forgot-password"];


export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Refresh the session before checking for a user.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Allow access to the reset-password page if a valid token is present,
  // even if there is no session. This is the crucial exception for our custom flow.
  if (pathname === '/reset-password' && request.nextUrl.searchParams.has('token')) {
    return response;
  }
  
  const isProtectedRoute = protectedRoutes.includes(pathname);
  const isAuthFlowRoute = authFlowRoutes.includes(pathname);
  const isPublicOnlyRoute = publicOnlyRoutes.includes(pathname);


  // If the user has no session and is trying to access a protected page
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If the user has a session and is trying to access a public-only route like login/signup
  if (session && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If the user has no session and lands on the root, redirect to login
  if (!session && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // The /reset-password and /verify-otp pages should only be accessible if there is
  // a temporary session or a valid token (handled above).
  if (!session && isAuthFlowRoute) {
    // We allow /verify-otp to be accessed without a session, as it's the first step.
    if(pathname === '/verify-otp') {
      return response;
    }
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
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};