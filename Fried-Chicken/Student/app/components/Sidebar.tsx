'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  BarChart2,
  Terminal,
  UserCircle,
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  CalendarRange,
  LogOut,
  X,
} from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { supabase } from '@/lib/supabase'
import { resolveAvatar } from '@/lib/avatar'
import { leaveScopeFor } from '@/lib/leaveScope'
import { useSelectedClass } from '@/lib/selectedClass'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Cached across (re)mounts so the sidebar shows the correct identity instantly
// instead of briefly falling back to a default role.
let cachedName = ''
let cachedInitial = ''
let cachedRole = ''
let cachedAvatar: string | null = null

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState(cachedName)
  const [initial, setInitial] = useState(cachedInitial)
  const [role, setRole] = useState(cachedRole)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatar)
  const [pendingLeaves, setPendingLeaves] = useState<number | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null)
  const selectedClass = useSelectedClass()

  // Identity (name + role) doesn't change during a session — fetch it once.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Staff'
      cachedName = name
      cachedInitial = name[0].toUpperCase()
      setUserName(name)
      setInitial(cachedInitial)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, avatar_url')
        .eq('id', user.id)
        .single()
      cachedRole = profile?.role ?? (user.user_metadata?.role as string) ?? 'teacher'
      setRole(cachedRole)
      cachedAvatar = profile?.avatar_url ?? null
      setAvatarUrl(cachedAvatar)
    })
  }, [])

  // Pending-leave badge can change as you work — refresh it on navigation.
  // Scoped by routing so the number matches what the Leave page will show:
  // a 1-day request goes to the class monitor, not to a teacher.
  useEffect(() => {
    let query = supabase
      .from('leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    const scope = leaveScopeFor(role)
    if (scope) query = query.or(scope)
    query.then(({ count }) => setPendingLeaves(count ?? 0))
  }, [pathname, role])

  // Accounts waiting on approval. Only admins can read other profiles, so this
  // quietly returns 0 for teachers — who don't see the nav item anyway.
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingApprovals(count ?? 0))
  }, [pathname])

  const isAdmin = role === 'admin'

  // Uploaded picture first, then the role default (students keep the initial fallback)
  const avatarSrc = resolveAvatar(avatarUrl, role)

  const navItems = [
    { label: 'Dashboard', href: '/admin/home', icon: LayoutDashboard, badge: undefined as number | undefined },
    { label: 'Attendance', href: '/admin/attendance', icon: ClipboardList, badge: undefined },
    { label: 'Leave', href: '/admin/leave', icon: CalendarDays, badge: pendingLeaves || undefined },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart2, badge: undefined },
    ...(isAdmin ? [{ label: 'Approvals', href: '/admin/approvals', icon: UserCheck, badge: pendingApprovals || undefined }] : []),
    ...(isAdmin ? [{ label: 'Students', href: '/admin/students', icon: Users, badge: undefined as number | undefined }] : []),
    ...(isAdmin ? [{ label: 'Teachers', href: '/admin/teachers', icon: GraduationCap, badge: undefined as number | undefined }] : []),
    ...(isAdmin ? [{ label: 'Subjects', href: '/admin/subjects', icon: BookOpen, badge: undefined as number | undefined }] : []),
    ...(isAdmin ? [{ label: 'Semesters', href: '/admin/semesters', icon: CalendarRange, badge: undefined as number | undefined }] : []),
    ...(isAdmin ? [{ label: 'Log', href: '/admin/log', icon: Terminal, badge: undefined as number | undefined }] : []),
    { label: 'Profile', href: '/admin/profile', icon: UserCircle, badge: undefined },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 h-full w-[270px] bg-white z-30 flex flex-col',
          'transition-transform duration-300 ease-in-out shadow-lg',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:translate-x-0 md:shadow-none md:z-auto md:flex-shrink-0',
        ].join(' ')}
      >
        <button
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 md:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>

        {/* Profile — fixed at the top, never scrolls or squashes */}
        <div className="flex-shrink-0 flex flex-col items-center pt-10 pb-6 px-6 border-b border-gray-100">
          {avatarSrc ? (
            <div
              className="w-16 h-16 rounded-full bg-cover bg-center mb-3 ring-2 ring-white shadow-sm"
              style={{ backgroundImage: `url('${avatarSrc}')` }}
              role="img"
              aria-label={userName || 'Profile photo'}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-3 select-none">
              {initial || '?'}
            </div>
          )}
          <p className="text-gray-900 font-semibold text-base">{userName || '—'}</p>
          {role && (
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5 ${
                isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}
            >
              {isAdmin ? 'Admin' : 'Teacher'}
            </span>
          )}
          <p className="text-xs text-gray-400 mt-2.5">
            {selectedClass ? selectedClass.name : 'All Classes'}
            {' · '}
            <Link href="/admin/classes" className="text-blue-600 hover:text-blue-700 font-medium">
              Change
            </Link>
          </p>
        </div>

        {/* Navigation */}
        {/* Only this scrolls, so Logout below stays reachable however many
            nav items an admin has. min-h-0 is what allows a flex child to
            shrink past its content — without it the list pushes Logout off
            the bottom of the sidebar instead of scrolling. */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-1"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const { label, href, icon: Icon } = item
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
              >
                <Icon size={18} />
                {label}
                {item.badge !== undefined && (
                  <span className="ml-auto text-xs font-semibold text-blue-600">({item.badge})</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout & theme — pinned to the bottom, outside the scroll area */}
        <div className="flex-shrink-0 px-4 pb-6 pt-4 border-t border-gray-100 flex items-center gap-1 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 flex-1 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Logout
          </button>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}
