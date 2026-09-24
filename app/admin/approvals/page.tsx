'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Check, X, ShieldAlert, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'

interface PendingRow {
  id: string
  full_name: string | null
  email: string | null
  requested_role: string | null
  status: string
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  user: 'Student',
  teacher: 'Teacher',
  admin: 'Admin / Head of Dept',
}

const ROLE_STYLE: Record<string, string> = {
  user: 'bg-green-100 text-green-700',
  teacher: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export default function ApprovalsPage() {
  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  // Role an admin can override to before approving
  const [grant, setGrant] = useState<Record<string, string>>({})

  const [refreshKey, setRefreshKey] = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, email, requested_role, status, created_at')
        .in('status', ['pending', 'rejected'])
        .order('created_at', { ascending: true })

      if (err) setError(err.message)
      else setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [refreshKey])

  async function decide(row: PendingRow, approve: boolean) {
    setError('')
    setBusyId(row.id)

    const who = row.full_name || row.email || 'account'
    // Approving writes the requested role into the effective one. An admin can
    // downgrade first (e.g. someone asked for Admin but should be a Teacher).
    const role = grant[row.id] ?? row.requested_role ?? 'user'

    const { data: { user } } = await supabase.auth.getUser()

    const { error: updErr } = await supabase
      .from('profiles')
      .update(
        approve
          ? { status: 'approved', role, approved_at: new Date().toISOString(), approved_by: user?.id ?? null }
          : { status: 'rejected', approved_at: null, approved_by: user?.id ?? null }
      )
      .eq('id', row.id)

    if (updErr) {
      setError(updErr.message)
      setBusyId(null)
      return
    }

    logActivity(
      approve
        ? `[Approvals] ${who} approved as ${ROLE_LABEL[role] ?? role}`
        : `[Approvals] ${who} rejected`
    )
    setBusyId(null)
    reload()
  }

  const pending = rows.filter(r => r.status === 'pending')
  const rejected = rows.filter(r => r.status === 'rejected')

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="pl-10 md:pl-0 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <UserCheck size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">New account requests</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Anyone can register, but nobody can use the app until you approve them. The role
              they picked on the form is only a <em>request</em> — check it before approving, and
              change it here if it&apos;s wrong.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-16">Loading…</p>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-1">Nothing waiting</p>
          <p className="text-sm text-gray-500">
            New registrations will appear here for you to approve.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map(row => {
            const requested = row.requested_role ?? 'user'
            const chosen = grant[row.id] ?? requested
            const wantsAdmin = requested === 'admin'

            return (
              <div key={row.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold select-none flex-shrink-0">
                    {initialsOf(row.full_name || row.email || '?')}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {row.full_name || 'No name given'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{row.email ?? '—'}</p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    {ago(row.created_at)}
                  </span>

                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ROLE_STYLE[requested] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    asked for {ROLE_LABEL[requested] ?? requested}
                  </span>

                  <select
                    value={chosen}
                    onChange={e => setGrant(g => ({ ...g, [row.id]: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="user">Grant: Student</option>
                    <option value="teacher">Grant: Teacher</option>
                    <option value="admin">Grant: Admin / HOD</option>
                  </select>

                  <button
                    onClick={() => decide(row, true)}
                    disabled={busyId === row.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Check size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => decide(row, false)}
                    disabled={busyId === row.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-red-300 hover:text-red-600 disabled:opacity-60 text-gray-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>

                {wantsAdmin && (
                  <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    <ShieldAlert size={13} className="mt-0.5 flex-shrink-0" />
                    This request asks for full admin access, including the activity log and the
                    ability to approve other accounts. Only approve it if you know who this is.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            Previously rejected
          </h2>
          <div className="flex flex-col gap-2">
            {rejected.map(row => (
              <div
                key={row.id}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600 truncate">
                    {row.full_name || row.email}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{row.email ?? '—'}</p>
                </div>
                <button
                  onClick={() => decide(row, true)}
                  disabled={busyId === row.id}
                  className="px-3 py-1.5 border border-gray-200 hover:border-green-400 hover:text-green-700 disabled:opacity-60 text-xs font-semibold text-gray-600 rounded-lg transition-colors cursor-pointer"
                >
                  Approve after all
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
