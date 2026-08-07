'use client'

import { useEffect, useState } from 'react'
import { CalendarRange, Play, Trash2, AlertTriangle, Archive } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'

interface SemesterRow {
  id: string
  name: string
  start_date: string
  end_date: string | null
  is_active: boolean
  records: number
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function SemestersPage() {
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // New-semester form
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayISO())

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Bumped after every write to re-run the loader below
  const [refreshKey, setRefreshKey] = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    async function load() {
      const [{ data: rows }, { data: counts }] = await Promise.all([
        supabase
          .from('semesters')
          .select('id, name, start_date, end_date, is_active')
          .order('start_date', { ascending: false }),
        supabase.from('attendance').select('semester_id'),
      ])

      const bySemester = new Map<string, number>()
      for (const r of counts ?? []) {
        if (!r.semester_id) continue
        bySemester.set(r.semester_id, (bySemester.get(r.semester_id) ?? 0) + 1)
      }

      setSemesters((rows ?? []).map(s => ({ ...s, records: bySemester.get(s.id) ?? 0 })))
      setLoading(false)
    }
    load()
  }, [refreshKey])

  // Starting a term closes the previous one and makes the new one active.
  // Nothing is deleted — old attendance stays tagged to its own semester, which
  // is what lets students still open last term's record.
  async function startSemester(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Give the semester a name')

    setBusy(true)
    const current = semesters.find(s => s.is_active)

    // Deactivate first: a partial unique index allows only one active row.
    if (current) {
      const { error: closeErr } = await supabase
        .from('semesters')
        .update({ is_active: false, end_date: todayISO() })
        .eq('id', current.id)
      if (closeErr) {
        setError(closeErr.message)
        setBusy(false)
        return
      }
    }

    const { error: insErr } = await supabase
      .from('semesters')
      .insert({ name: name.trim(), start_date: startDate, is_active: true })

    if (insErr) {
      // Put the old one back so we don't leave the system with no active term
      if (current) {
        await supabase.from('semesters').update({ is_active: true, end_date: null }).eq('id', current.id)
      }
      setError(insErr.code === '23505' ? `A semester called "${name.trim()}" already exists.` : insErr.message)
      setBusy(false)
      return
    }

    logActivity(
      `[Semester] Started "${name.trim()}"` +
        (current ? ` — "${current.name}" archived with ${current.records} records` : '')
    )
    setName('')
    setBusy(false)
    reload()
  }

  async function activate(sem: SemesterRow) {
    setError('')
    setBusy(true)
    const current = semesters.find(s => s.is_active)
    if (current && current.id !== sem.id) {
      await supabase.from('semesters').update({ is_active: false }).eq('id', current.id)
    }
    const { error: updErr } = await supabase
      .from('semesters')
      .update({ is_active: true, end_date: null })
      .eq('id', sem.id)
    if (updErr) setError(updErr.message)
    else logActivity(`[Semester] "${sem.name}" set as the current semester`)
    setBusy(false)
    reload()
  }

  async function remove(sem: SemesterRow) {
    setError('')
    setBusy(true)
    // attendance.semester_id is ON DELETE CASCADE, so this drops that term's
    // records too — which is the point of the button, hence the confirmation.
    const { error: delErr } = await supabase.from('semesters').delete().eq('id', sem.id)
    if (delErr) setError(delErr.message)
    else logActivity(`[Semester] "${sem.name}" deleted along with ${sem.records} attendance records`)
    setConfirmDelete(null)
    setBusy(false)
    reload()
  }

  const active = semesters.find(s => s.is_active)

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="pl-10 md:pl-0 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Semesters</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      {/* Start a new term */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <span className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <CalendarRange size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Start a new semester</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Attendance counters go back to zero for everyone. Nothing is erased — the current
              term is archived and students can still open it from their own page.
            </p>
          </div>
        </div>

        <form onSubmit={startSemester} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Semester 2 · 2026"
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Play size={15} />
            {busy ? 'Working…' : 'Start semester'}
          </button>
        </form>

        {active && (
          <p className="mt-3 text-xs text-gray-500">
            Current term is <span className="font-semibold text-gray-700">{active.name}</span> with{' '}
            {active.records} attendance record{active.records === 1 ? '' : 's'}. It will be archived,
            not deleted.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {/* All terms */}
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-16">Loading…</p>
      ) : semesters.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-500">
            No semesters yet. Start one above — attendance can&apos;t be tagged without it.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {semesters.map(s => (
            <div
              key={s.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 ${
                s.is_active ? 'border-green-300' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {s.is_active ? <CalendarRange size={17} /> : <Archive size={17} />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {s.name}
                    {s.is_active && (
                      <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 align-middle">
                        CURRENT
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {fmt(s.start_date)} – {fmt(s.end_date)} · {s.records} record
                    {s.records === 1 ? '' : 's'}
                  </p>
                </div>

                {!s.is_active && (
                  <button
                    onClick={() => activate(s)}
                    disabled={busy}
                    className="px-3 py-1.5 border border-gray-200 hover:border-green-400 hover:text-green-700 text-xs font-semibold text-gray-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Make current
                  </button>
                )}

                {confirmDelete === s.id ? (
                  <span className="inline-flex items-center gap-2">
                    <button
                      onClick={() => remove(s)}
                      disabled={busy}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Delete {s.records} record{s.records === 1 ? '' : 's'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(s.id)}
                    aria-label={`Delete ${s.name}`}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {confirmDelete === s.id && (
                <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2">
                  <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                  This permanently removes {s.name} and all {s.records} of its attendance records.
                  Students will lose that term from their history. This cannot be undone.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
