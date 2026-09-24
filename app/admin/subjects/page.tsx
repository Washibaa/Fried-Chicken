'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'

interface ClassRow {
  id: string
  name: string
}

interface TeacherRow {
  id: string
  full_name: string | null
  email: string | null
}

interface SubjectRow {
  id: string
  name: string
  class_id: string
  teacher_id: string | null
  records: number
}

export default function SubjectsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Add form
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [saving, setSaving] = useState(false)

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
      const [{ data: classRows }, { data: teacherRows }, { data: subjectRows }, { data: counts }] =
        await Promise.all([
          supabase.from('classes').select('id, name').order('name'),
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'teacher')
            .order('full_name'),
          supabase.from('subjects').select('id, name, class_id, teacher_id').order('name'),
          supabase.from('attendance').select('subject_id'),
        ])

      const bySubject = new Map<string, number>()
      for (const row of counts ?? []) {
        if (!row.subject_id) continue
        bySubject.set(row.subject_id, (bySubject.get(row.subject_id) ?? 0) + 1)
      }

      setClasses(classRows ?? [])
      setTeachers(teacherRows ?? [])
      setSubjects((subjectRows ?? []).map(s => ({ ...s, records: bySubject.get(s.id) ?? 0 })))
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const classNameById = useMemo(
    () => new Map(classes.map(c => [c.id, c.name])),
    [classes]
  )
  const teacherNameById = useMemo(
    () => new Map(teachers.map(t => [t.id, t.full_name || t.email || 'Teacher'])),
    [teachers]
  )

  const grouped = useMemo(() => {
    return classes.map(c => ({
      cls: c,
      rows: subjects.filter(s => s.class_id === c.id),
    }))
  }, [classes, subjects])

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Subject name is required')
    if (!classId) return setError('Pick a class')

    setSaving(true)
    const { error: insErr } = await supabase.from('subjects').insert({
      name: name.trim(),
      class_id: classId,
      teacher_id: teacherId || null,
    })

    if (insErr) {
      setError(
        insErr.code === '23505'
          ? `${classNameById.get(classId)} already has a subject called "${name.trim()}".`
          : insErr.message
      )
      setSaving(false)
      return
    }

    logActivity(
      `[Subjects] "${name.trim()}" added to ${classNameById.get(classId)}` +
        (teacherId ? ` (${teacherNameById.get(teacherId)})` : '')
    )
    setName('')
    setTeacherId('')
    setSaving(false)
    reload()
  }

  async function setTeacher(subject: SubjectRow, newTeacher: string) {
    setError('')
    const { error: updErr } = await supabase
      .from('subjects')
      .update({ teacher_id: newTeacher || null })
      .eq('id', subject.id)

    if (updErr) return setError(updErr.message)

    logActivity(
      `[Subjects] ${subject.name} reassigned to ${
        newTeacher ? teacherNameById.get(newTeacher) : 'nobody'
      }`
    )
    setSubjects(prev =>
      prev.map(s => (s.id === subject.id ? { ...s, teacher_id: newTeacher || null } : s))
    )
  }

  async function removeSubject(subject: SubjectRow) {
    setError('')
    const { error: delErr } = await supabase.from('subjects').delete().eq('id', subject.id)
    if (delErr) return setError(delErr.message)

    logActivity(
      `[Subjects] "${subject.name}" deleted from ${classNameById.get(subject.class_id)} ` +
        `(${subject.records} attendance record${subject.records === 1 ? '' : 's'} removed)`
    )
    setConfirmId(null)
    reload()
  }

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="pl-10 md:pl-0 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Subjects</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <span className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Subjects and their teachers</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Attendance is recorded per subject, so a student gets a separate percentage for each
              teacher. Every class needs at least one subject before attendance can be taken.
            </p>
          </div>
        </div>

        <form onSubmit={addSubject} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Subject name"
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Choose class…</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={teacherId}
            onChange={e => setTeacherId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Teacher (optional)</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            {saving ? 'Adding…' : 'Add subject'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-16">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(({ cls, rows }) => (
            <div key={cls.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{cls.name}</h3>

              {rows.length === 0 ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle size={13} />
                  No subjects — attendance can&apos;t be taken for this class yet.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {rows.map(s => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">
                          {s.records} attendance record{s.records === 1 ? '' : 's'}
                        </p>
                      </div>

                      <select
                        value={s.teacher_id ?? ''}
                        onChange={e => setTeacher(s, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                        ))}
                      </select>

                      {confirmId === s.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => removeSubject(s)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            Delete {s.records > 0 ? `+ ${s.records} records` : ''}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(s.id)}
                          aria-label={`Delete ${s.name}`}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
