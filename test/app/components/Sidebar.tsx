'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, BarChart2, LogOut, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { label: 'Dashboard', href: '/admin/home', icon: LayoutDashboard, badge: undefined },
  { label: 'Leave', href: '/admin/leave', icon: CalendarDays, badge: undefined },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart2, badge: undefined },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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

        {/* Profile */}
        <div className="flex flex-col items-center pt-10 pb-8 px-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-3 select-none">
            T
          </div>
          <p className="text-gray-900 font-semibold text-base">Theara</p>
          <p className="text-gray-400 text-xs mt-1">#2024-001</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1" aria-label="Main navigation">
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

        {/* Logout */}
        <div className="px-4 pb-8 pt-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
