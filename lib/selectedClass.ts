// The class a teacher/admin picked on the Choose Class screen.
// Stored client-side; null means "all classes".

import { useSyncExternalStore } from 'react'

export interface SelectedClass {
  id: string
  name: string
}

const KEY = 'rupp-selected-class'

// Snapshot is cached so useSyncExternalStore gets a stable reference
let cachedRaw: string | null = null
let cachedValue: SelectedClass | null = null

export function getSelectedClass(): SelectedClass | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedValue = raw ? (JSON.parse(raw) as SelectedClass) : null
    }
    return cachedValue
  } catch {
    return null
  }
}

export function setSelectedClass(value: SelectedClass | null) {
  if (typeof window === 'undefined') return
  if (value) window.localStorage.setItem(KEY, JSON.stringify(value))
  else window.localStorage.removeItem(KEY)
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export function useSelectedClass(): SelectedClass | null {
  return useSyncExternalStore(subscribe, getSelectedClass, () => null)
}
