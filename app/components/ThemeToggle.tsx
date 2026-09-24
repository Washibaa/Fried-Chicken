'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme, setTheme } from '@/lib/theme'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer ${className}`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
