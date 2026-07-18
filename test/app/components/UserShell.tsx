'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import UserSidebar from './UserSidebar'

export default function UserShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#f8f8f8] overflow-hidden">
      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <button
          className="md:hidden fixed top-4 left-4 z-10 p-2 bg-white rounded-lg shadow-sm text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
