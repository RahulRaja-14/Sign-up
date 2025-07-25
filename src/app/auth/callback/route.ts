import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // The `next` parameter might be present for old links, but we will prioritize the type of auth.
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Check the type of email action.
      // A password recovery email will have a `recovery` type.
      // A signup email will have a `signup` type.
      const type = searchParams.get('type')
      if (type === 'recovery') {
        // If it's a recovery link, we need to redirect to the reset-password page.
        // We can't pass the session in the URL, but the session is now set in the cookies,
        // so the reset-password page will be able to access it.
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      
      // For sign-ups, redirect to dashboard.
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not process authentication request.`)
}
