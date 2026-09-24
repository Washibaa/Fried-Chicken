'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarCheck, FileText, LogOut, CheckCircle2, Clock, ArrowLeft } from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'

interface LeaveRequest {
  id: number
  name: string | null
  reason: string
  start_date: string | null
  end_date: string | null
  document_url: string | null
}

function formatDate(value: string) {
  return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function requestDates(leave: LeaveRequest) {
  if (!leave.start_date || !leave.end_date) return '—'
  return leave.start_date === leave.end_date
    ? formatDate(leave.start_date)
    : `${formatDate(leave.start_date)} – ${formatDate(leave.end_date)}`
}

export default function MonitorLeavePage() {
  const router = useRouter()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [className, setClassName] = useState<string | null>(null)
  const [monitorName, setMonitorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  async function loadLeaves() {
    // RLS limits monitors to the requests routed to them for their own class
    const { data } = await supabase
      .from('leave_requests')
      .select('id, name, reason, start_date, end_date, document_url')
      .eq('status', 'pending')
      .eq('routed_to', 'monitor')
      .order('created_at', { ascending: true })
    setLeaves(data ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setMonitorName(
        (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Monitor'
      )

      // The monitor is a student flagged is_monitor; their class comes from
      // their own roster row
      const { data: studentRow } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('is_monitor', true)
        .maybeSingle()

      if (studentRow?.class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('name')
          .eq('id', studentRow.class_id)
          .maybeSingle()
        setClassName(cls?.name ?? null)
      }

      await loadLeaves()
      setLoading(false)
    })
  }, [])

  async function decide(id: number, status: 'approved' | 'rejected') {
    setBusyId(id)
    const leave = leaves.find(l => l.id === id)
    const { error } = await supabase.from('leave_requests').update({ status }).eq('id', id)
    if (error) {
      setBusyId(null)
      return
    }
    // The student notification is sent by the database trigger (SRS 3.1.5)
    logActivity(
      `[Leave] ${leave?.name ?? `#${id}`}'s leave request ${status} by class monitor`
    )
    setLeaves(prev => prev.filter(l => l.id !== id))
    setBusyId(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3] px-4 py-8">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck size={20} className="text-teal-600" />
              <h1 className="text-sm font-bold text-gray-900">Class Monitor</h1>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/student/home"
                aria-label="Back to my home"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft size={14} />
                My home
              </Link>
            </div>
          </div>

          <div className="bg-teal-600 rounded-xl px-5 py-4 text-white">
            <p className="text-[11px] uppercase tracking-wide text-teal-100">Signed in as</p>
            <p className="text-lg font-bold mb-2">{monitorName}</p>
            <p className="text-[11px] uppercase tracking-wide text-teal-100">Class</p>
            <p className="text-lg font-bold">{className ?? 'Not assigned'}</p>
          </div>

          {!loading && !className && (
            <p className="text-xs text-gray-400 mt-2">
              No class is assigned to your monitor account yet — contact an administrator.
            </p>
          )}
        </div>

        {/* Pending approvals */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
            <Clock size={16} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-700">
              Pending Approval ({leaves.length})
            </span>
          </div>
          <p className="px-5 pt-2 text-xs text-gray-400">{today}</p>

          <div className="divide-y divide-gray-50">
            {loading ? (
              <p className="text-center text-sm text-gray-400 py-10">Loading…</p>
            ) : leaves.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 size={36} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No pending requests</p>
              </div>
            ) : (
              leaves.map(leave => (
                <div key={leave.id} className="px-5 py-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">{leave.name ?? 'Student'}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {requestDates(leave)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{leave.reason}</p>
                  {leave.document_url && (
                    <a
                      href={leave.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <FileText size={13} />
                      View document
                    </a>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => decide(leave.id, 'approved')}
                      disabled={busyId === leave.id}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => decide(leave.id, 'rejected')}
                      disabled={busyId === leave.id}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-2xl transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </main>
  )
}
