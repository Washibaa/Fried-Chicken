'use client'

import { useEffect, useState } from 'react'
import { Clock, FileText } from 'lucide-react'
import GenerateQrButton from '@/app/components/GenerateQr'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'
import { leaveScopeFor } from '@/lib/leaveScope'

interface LeaveRequest {
  id: number
  name: string
  reason: string
  start_date: string | null
  end_date: string | null
  routed_to: string | null
  document_url: string | null
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Student notifications on approve/decline are sent by the on_leave_decided
// database trigger (SRS 3.1.5), which also respects each student's
// email_notifications preference — so no client-side insert is needed here.

function routeLabel(routedTo: string | null) {
  if (routedTo === 'admin') return 'Head of Dept'
  if (routedTo === 'monitor') return 'Class Monitor'
  return 'Teacher'
}

export default function LeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    // Teachers only see requests routed to them; the Head of Dept sees everything (SRS 3.1.2)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      let role = 'teacher'
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        role = profile?.role ?? (user.user_metadata?.role as string) ?? 'teacher'
      }

      let query = supabase
        .from('leave_requests')
        .select('id, name, reason, start_date, end_date, routed_to, document_url')
        .eq('status', 'pending')
      const scope = leaveScopeFor(role)
      if (scope) query = query.or(scope)

      const { data } = await query.order('created_at', { ascending: true })
      if (data) setLeaves(data)
      setLoading(false)
    })
  }, [])

  async function approve(id: number) {
    await supabase.from('leave_requests').update({ status: 'approved' }).eq('id', id)
    const leave = leaves.find(l => l.id === id)
    logActivity(`[Leave] ${leave?.name ?? `#${id}`}'s leave request approved`)
    setLeaves(prev => prev.filter(l => l.id !== id))
  }

  async function reject(id: number) {
    await supabase.from('leave_requests').update({ status: 'rejected' }).eq('id', id)
    const leave = leaves.find(l => l.id === id)
    logActivity(`[Leave] ${leave?.name ?? `#${id}`}'s leave request rejected`)
    setLeaves(prev => prev.filter(l => l.id !== id))
  }

  async function approveAll() {
    const ids = leaves.map(l => l.id)
    await supabase.from('leave_requests').update({ status: 'approved' }).in('id', ids)
    logActivity(`[Leave] ${ids.length} pending leave request${ids.length > 1 ? 's' : ''} approved in bulk`)
    setLeaves([])
  }

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pl-10 md:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Leave Request</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <GenerateQrButton />
      </div>

      {/* Pending Approval Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center">
              <Clock size={20} className="text-white" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Pending Approval ({leaves.length})
            </h2>
          </div>
          {leaves.length > 0 && (
            <button
              onClick={approveAll}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Approve All
            </button>
          )}
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[1.5fr_1fr_2fr_0.5fr_auto] gap-4 px-4 pb-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Name</span>
          <span className="text-sm font-semibold text-gray-700">Dates</span>
          <span className="text-sm font-semibold text-gray-700">Reason</span>
          <span className="text-sm font-semibold text-gray-700">Document</span>
          <span />
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">Loading…</p>
          ) : leaves.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No pending approvals</p>
          ) : (
            leaves.map(leave => (
              <div
                key={leave.id}
                className="grid grid-cols-[1.5fr_1fr_2fr_0.5fr_auto] gap-4 items-center px-4 py-4"
              >
                {/* Name */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900">{leave.name}</span>
                    <p className="text-xs text-gray-400">
                      → {routeLabel(leave.routed_to)}
                    </p>
                  </div>
                </div>

                {/* Leave Dates */}
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {leave.start_date && leave.end_date
                    ? leave.start_date === leave.end_date
                      ? formatDate(leave.start_date)
                      : `${formatDate(leave.start_date)} – ${formatDate(leave.end_date)}`
                    : '—'}
                </span>

                {/* Reason */}
                <p className="text-sm text-gray-400 truncate">{leave.reason}</p>

                {/* Document */}
                {leave.document_url ? (
                  <a
                    href={leave.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FileText size={18} />
                  </a>
                ) : (
                  <span className="text-gray-200">
                    <FileText size={18} />
                  </span>
                )}

                {/* Approve / Reject */}
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(leave.id)}
                    className="px-5 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(leave.id)}
                    className="px-5 py-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
