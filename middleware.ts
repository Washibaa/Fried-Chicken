import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isApiRoute = pathname.startsWith('/api/')

  if (isApiRoute) return supabaseResponse

  if (!user) {
    if (isAuthPage) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Fetch role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    if (isAuthPage) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = profile.role

  // Redirect away from auth pages if already logged in
  if (isAuthPage) {
    return NextResponse.redirect(new URL(getDashboardUrl(role), request.url))
  }

  // Root → dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getDashboardUrl(role), request.url))
  }

  // Guard role-specific sections
  if (pathname.startsWith('/student') && role !== 'student') {
    return NextResponse.redirect(new URL(getDashboardUrl(role), request.url))
  }
  if (pathname.startsWith('/teacher') && !['teacher', 'head_of_department', 'administrator'].includes(role)) {
    return NextResponse.redirect(new URL(getDashboardUrl(role), request.url))
  }
  if (pathname.startsWith('/admin') && !['administrator', 'head_of_department'].includes(role)) {
    return NextResponse.redirect(new URL(getDashboardUrl(role), request.url))
  }

  return supabaseResponse
}

function getDashboardUrl(role: string): string {
  switch (role) {
    case 'student': return '/student/dashboard'
    case 'teacher': return '/teacher/dashboard'
    case 'head_of_department': return '/admin/dashboard'
    case 'administrator': return '/admin/dashboard'
    default: return '/login'
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
