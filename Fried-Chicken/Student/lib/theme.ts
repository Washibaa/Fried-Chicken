// Light/Dark mode preference (SRS 3.2.2), applied as a `dark` class on <html>.
// A pre-paint script in the root layout applies the saved theme before hydration.

import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'rupp-theme'
const listeners = new Set<() => void>()

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  try {
    window.localStorage.setItem(KEY, theme)
  } catch {
    // private mode etc. — theme still applies for this page view
  }
  document.documentElement.classList.toggle('dark', theme === 'dark')
  listeners.forEach(l => l())
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'light')
}
