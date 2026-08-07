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
  const isMonitorRoute = pathname.startsWith('/monitor')
  const isPendingRoute = pathname.startsWith('/pending')

  // Not authenticated — protect every role's area
  if (!session && (isAdminRoute || isUserRoute || isMonitorRoute || isPendingRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', session.user.id)
      .single()

    // A self-registered account is 'pending' until an admin approves it, and
    // can't reach any part of the app until then. Note the role below is only
    // read from profiles: the JWT's user_metadata role is chosen by whoever
    // registered, so trusting it would let anyone grant themselves admin.
    const approved = profile?.status === 'approved'

    if (!approved && (isAdminRoute || isUserRoute || isMonitorRoute)) {
      return NextResponse.redirect(new URL('/pending', request.url))
    }

    // Nothing to wait for — keep approved users off the holding page
    if (approved && isPendingRoute) {
      const role = profile?.role ?? 'user'
      const target = role === 'admin' || role === 'teacher' ? '/admin/classes' : '/student/home'
      return NextResponse.redirect(new URL(target, request.url))
    }

    const role: string = profile?.role ?? 'user'
    // Teachers and admins share the staff dashboard; only admins see the log
    const isStaff = role === 'admin' || role === 'teacher'

    // Staff land on the dashboard; students (including class monitors) on the app
    const home = isStaff ? '/admin/classes' : '/student/home'

    // Note: authenticated users are NOT auto-forwarded off /login or /register,
    // so the login page always shows when the app is opened (the user signs in
    // each time). Role-based protection for the app routes still applies below.

    // Only staff use the /admin dashboard
    if (isAdminRoute && !isStaff) {
      return NextResponse.redirect(new URL(home, request.url))
    }

    // The system log and student management are admin-only
    if (pathname.startsWith('/admin/log') && role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/home', request.url))
    }
    if (pathname.startsWith('/admin/students') && role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/home', request.url))
    }
    // Only an admin / Head of Dept assigns classes to teachers, defines
    // subjects, or starts and deletes semesters
    if (
      (pathname.startsWith('/admin/teachers') ||
        pathname.startsWith('/admin/subjects') ||
        pathname.startsWith('/admin/semesters') ||
        pathname.startsWith('/admin/approvals')) &&
      role !== 'admin'
    ) {
      return NextResponse.redirect(new URL('/admin/home', request.url))
    }

    // Staff don't use the student area
    if (isUserRoute && isStaff) {
      return NextResponse.redirect(new URL(home, request.url))
    }

    // The /monitor area is for students who are their class's monitor
    if (isMonitorRoute) {
      const { data: monitorRow } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_monitor', true)
        .maybeSingle()

      if (!monitorRow) {
        return NextResponse.redirect(new URL(home, request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/student/:path*',
    '/monitor/:path*',
    '/pending',
    '/login',
    '/register',
  ],
}
