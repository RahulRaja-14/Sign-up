import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // For password resets, the redirect URL will be `/reset-password`.
      // For sign-ups, it will be `/`.
      // We handle both cases here.
      const redirectPath = next.startsWith('/reset-password') ? next : '/dashboard'
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not process authentication request.`)
}
