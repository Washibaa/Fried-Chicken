'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Hourglass, XCircle, LogOut, RefreshCw } from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { supabase } from '@/lib/supabase'

const ROLE_LABEL: Record<string, string> = {
  user: 'Student',
  teacher: 'Teacher',
  admin: 'Admin / Head of Dept',
}

// Where an approved account belongs, mirroring the login page.
function homeForRole(role: string) {
  return role === 'teacher' || role === 'admin' ? '/admin/classes' : '/student/home'
}

export default function PendingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [requested, setRequested] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, requested_role')
        .eq('id', user.id)
        .single()

      // Approved while they were sitting here — send them on
      if (profile?.status === 'approved') {
        router.replace(homeForRole(profile.role ?? 'user'))
        return
      }

      setStatus(profile?.status ?? 'pending')
      setRequested(profile?.requested_role ?? null)
      setChecking(false)
    }
    load()
  }, [router, refreshKey])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const rejected = status === 'rejected'

  return (
    <main className="min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4 py-10">
      <ThemeToggle className="fixed top-4 right-4 z-10" />
      <div className="flex flex-col items-center w-full max-w-[420px]">
        <div className="mb-4">
          <Image src="/logo.svg" alt="Logo" width={90} height={90} className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 w-full px-8 py-8 text-center">
          <span
            className={`inline-flex w-14 h-14 rounded-full items-center justify-center mb-4 ${
              rejected ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
            }`}
          >
            {rejected ? <XCircle size={26} /> : <Hourglass size={26} />}
          </span>

          <h1 className="text-lg font-bold text-gray-900 mb-2">
            {rejected ? 'Account not approved' : 'Waiting for approval'}
          </h1>

          <p className="text-sm text-gray-500 mb-1">
            {rejected
              ? 'An admin reviewed this request and did not approve it.'
              : 'Your account has been created but an admin or the Head of Department still needs to approve it.'}
          </p>

          {email && <p className="text-sm font-medium text-gray-700 mb-1">{email}</p>}

          {requested && !rejected && (
            <p className="text-sm text-gray-500 mb-6">
              Requested access: <span className="font-medium">{ROLE_LABEL[requested] ?? requested}</span>
            </p>
          )}

          {rejected && (
            <p className="text-sm text-gray-500 mb-6">
              Speak to the Head of Department if you think this is a mistake.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {!rejected && (
              <button
                onClick={() => {
                  setChecking(true)
                  setRefreshKey(k => k + 1)
                }}
                disabled={checking}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Checking…' : 'Check again'}
              </button>
            )}
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
