import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes any unauthenticated user may access
const PUBLIC_PATHS    = ['/', '/forgot-password', '/join']
const PUBLIC_PREFIXES = ['/auth/', '/onboarding', '/join']

// API routes & static — never redirect
const SKIP_PREFIXES   = ['/api/', '/_next/', '/favicon']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const path = request.nextUrl.pathname

  // Skip API routes and static files entirely
  if (SKIP_PREFIXES.some(p => path.startsWith(p))) return response

  // Collect cookies set during session refresh so we can attach them to any response
  const cookiesToForward: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
            cookiesToForward.push({ name, value, options: options as Record<string, unknown> })
          })
        },
      },
    }
  )

  // Helper: redirect and carry any refreshed session cookies
  function redirect(url: string) {
    const res = NextResponse.redirect(new URL(url, request.url))
    cookiesToForward.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { data: { user } } = await supabase.auth.getUser()

  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    PUBLIC_PREFIXES.some(p => path.startsWith(p))

  if (path === '/login' || path === '/signup') return redirect('/')

  // Not logged in on protected route → landing page
  if (!user && !isPublic) return redirect('/')

  // Logged-in user routing
  if (user) {
    // Use service role key (bypasses RLS) — identity already verified by getUser() above
    const profileRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${user.id}&limit=1`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        cache: 'no-store',
      }
    )
    const profileRows = await profileRes.json()
    const role: string | undefined = profileRows?.[0]?.role

    // Landing page → send to their dashboard
    if (path === '/') {
      if (role === 'brand')   return redirect('/dashboard/brand')
      if (role === 'creator') return redirect('/dashboard/creator')
      if (role === 'admin')   return redirect('/dashboard/admin')
      if (role === 'agency')  return redirect('/dashboard/agency')
      if (role === 'owner')   return redirect('/dashboard/admin')
      if (role === 'member')  return redirect('/dashboard/member')
      return response // no role yet — stay on landing
    }

    // Members go to member dashboard only
    if (role === 'member') {
      if (!path.startsWith('/dashboard/member') && !isPublic) return redirect('/dashboard/member')
      return response
    }

    const isAdminOrOwner = role === 'admin' || role === 'owner'
    const roleDash =
      role === 'brand'   ? '/dashboard/brand'   :
      role === 'creator' ? '/dashboard/creator' :
      role === 'agency'  ? '/dashboard/agency'  :
      isAdminOrOwner     ? '/dashboard/admin'   : '/'

    if (path.startsWith('/dashboard/brand/')   && role !== 'brand'   && !isAdminOrOwner) return redirect(roleDash)
    if (path.startsWith('/dashboard/creator/') && role !== 'creator' && !isAdminOrOwner) return redirect(roleDash)
    if (path.startsWith('/dashboard/agency/')  && role !== 'agency'  && !isAdminOrOwner) return redirect(roleDash)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
