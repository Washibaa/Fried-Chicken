import { supabase } from './supabase'

// Fire-and-forget activity logging for the admin Log page.
// Failures are swallowed so logging can never break a user action.
export function logActivity(message: string) {
  supabase
    .from('activity_logs')
    .insert({ message })
    .then(({ error }) => {
      if (error) console.warn('activity log failed:', error.message)
    })
}
