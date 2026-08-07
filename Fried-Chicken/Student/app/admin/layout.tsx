'use client'

import { usePathname } from 'next/navigation'
import DashboardShell from '@/app/components/DashboardShell'

// One shared shell for the whole staff area, so the sidebar stays mounted while
// navigating between tabs (no remount → no role flash, no wasteful refetch).
// The Choose Class screen is full-screen, so it opts out of the shell.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/admin/classes') {
    return <>{children}</>
  }

  return <DashboardShell>{children}</DashboardShell>
}
