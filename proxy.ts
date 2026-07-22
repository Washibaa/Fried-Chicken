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
  const isUserRoute = pathname.startsWith('/student')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  // Not authenticated — protect admin and user routes
  if (!session && (isAdminRoute || isUserRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session) {
    // Fetch role from the profiles table, falling back to auth metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role: string =
      profile?.role ?? (session.user.user_metadata?.role as string) ?? 'user'
    // Teachers and admins share the staff dashboard; only admins see the log
    const isStaff = role === 'admin' || role === 'teacher'

    // Already logged in on login/register — go to their home
    if (isAuthPage) {
      return NextResponse.redirect(
        new URL(isStaff ? '/admin/classes' : '/student/home', request.url)
      )
    }

    // Student trying to access staff routes
    if (isAdminRoute && !isStaff) {
      return NextResponse.redirect(new URL('/student/home', request.url))
    }

    // The system log is admin-only
    if (pathname.startsWith('/admin/log') && role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/home', request.url))
    }

    // Staff trying to access student routes
    if (isUserRoute && isStaff) {
      return NextResponse.redirect(new URL('/admin/home', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login', '/register'],
}
