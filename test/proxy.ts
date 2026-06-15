import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isUserRoute = pathname.startsWith('/user')
  const isLoginPage = pathname === '/login'

  // Not authenticated — protect admin and user routes
  if (!session && (isAdminRoute || isUserRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session) {
    // Fetch role from the profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = profile?.role ?? 'user'

    // Already logged in on login page — go to their home
    if (isLoginPage) {
      return NextResponse.redirect(
        new URL(role === 'admin' ? '/admin/home' : '/user/home', request.url)
      )
    }

    // Regular user trying to access admin routes
    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/user/home', request.url))
    }

    // Admin trying to access user routes
    if (isUserRoute && role === 'admin') {
      return NextResponse.redirect(new URL('/admin/home', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/user/:path*', '/login'],
}
