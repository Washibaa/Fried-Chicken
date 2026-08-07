'use client'

import { useEffect, useMemo, useState } from 'react'
import { GraduationCap, AlertTriangle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'

interface ClassRow {
  id: string
  name: string
  department: string | null
}

interface TeacherRow {
  id: string
  full_name: string | null
  email: string | null
}

// class ids per teacher id
type Assignments = Record<string, Set<string>>

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function TeachersPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [assigned, setAssigned] = useState<Assignments>({})
  // Snapshot of what's in the database, so we can diff on save
  const [saved, setSaved] = useState<Assignments>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    async function load() {
      const [{ data: classRows }, { data: teacherRows }, { data: links, error: linkError }] =
        await Promise.all([
          supabase.from('classes').select('id, name, department').order('name'),
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'teacher')
            .order('full_name'),
          supabase.from('teacher_classes').select('teacher_id, class_id'),
        ])

      if (linkError) setError(linkError.message)

      const map: Assignments = {}
      for (const t of teacherRows ?? []) map[t.id] = new Set()
      for (const l of links ?? []) {
        if (!map[l.teacher_id]) map[l.teacher_id] = new Set()
        map[l.teacher_id].add(l.class_id)
      }

      setClasses(classRows ?? [])
      setTeachers(teacherRows ?? [])
      setAssigned(map)
      setSaved(cloneAssignments(map))
      setLoading(false)
    }
    load()
  }, [])

  function cloneAssignments(a: Assignments): Assignments {
    return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, new Set(v)]))
  }

  function toggle(teacherId: string, classId: string) {
    setDoneId(null)
    setAssigned(prev => {
      const next = cloneAssignments(prev)
      const set = next[teacherId] ?? new Set<string>()
      if (set.has(classId)) set.delete(classId)
      else set.add(classId)
      next[teacherId] = set
      return next
    })
  }

  const dirty = useMemo(() => {
    const out = new Set<string>()
    for (const t of teachers) {
      const a = assigned[t.id] ?? new Set<string>()
      const b = saved[t.id] ?? new Set<string>()
      if (a.size !== b.size || [...a].some(id => !b.has(id))) out.add(t.id)
    }
    return out
  }, [teachers, assigned, saved])

  async function save(teacher: TeacherRow) {
    setError('')
    setDoneId(null)
    setSavingId(teacher.id)

    const want = assigned[teacher.id] ?? new Set<string>()
    const have = saved[teacher.id] ?? new Set<string>()

    const toAdd = [...want].filter(id => !have.has(id))
    const toRemove = [...have].filter(id => !want.has(id))

    if (toRemove.length) {
      const { error: delError } = await supabase
        .from('teacher_classes')
        .delete()
        .eq('teacher_id', teacher.id)
        .in('class_id', toRemove)
      if (delError) {
        setError(delError.message)
        setSavingId(null)
        return
      }
    }

    if (toAdd.length) {
      const { error: insError } = await supabase
        .from('teacher_classes')
        .insert(toAdd.map(class_id => ({ teacher_id: teacher.id, class_id })))
      if (insError) {
        setError(insError.message)
        setSavingId(null)
        return
      }
    }

    const names = classes.filter(c => want.has(c.id)).map(c => c.name)
    logActivity(
      `[Classes] ${teacher.full_name ?? teacher.email} now teaches: ${
        names.length ? names.join(', ') : 'no classes'
      }`
    )

    setSaved(prev => ({ ...cloneAssignments(prev), [teacher.id]: new Set(want) }))
    setSavingId(null)
    setDoneId(teacher.id)
  }

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="pl-10 md:pl-0 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Teachers</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Class assignments</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose which classes each teacher is responsible for. A teacher only sees the
              students, attendance and leave requests of the classes ticked here — everything
              else is hidden from them. Admins and the Head of Department always see every class.
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
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-500">
            No teacher accounts yet. Once someone registers with the Teacher role they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {teachers.map(teacher => {
            const set = assigned[teacher.id] ?? new Set<string>()
            const isDirty = dirty.has(teacher.id)
            const isSaving = savingId === teacher.id
            const name = teacher.full_name || teacher.email || 'Unnamed teacher'

            return (
              <div
                key={teacher.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold select-none flex-shrink-0">
                    {initialsOf(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{teacher.email ?? '—'}</p>
                  </div>

                  {doneId === teacher.id && !isDirty && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                      <Check size={14} /> Saved
                    </span>
                  )}

                  <button
                    onClick={() => save(teacher)}
                    disabled={!isDirty || isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>

                {classes.length === 0 ? (
                  <p className="text-sm text-gray-400">No classes exist yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes.map(cls => {
                      const on = set.has(cls.id)
                      return (
                        <label
                          key={cls.id}
                          className={[
                            'flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition-colors select-none',
                            on
                              ? 'border-blue-500 bg-blue-50/60 text-blue-800'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(teacher.id, cls.id)}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-medium">{cls.name}</span>
                          {cls.department && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              {cls.department}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}

                {set.size === 0 && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle size={13} />
                    No classes assigned — this teacher sees an empty dashboard until you tick one.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
