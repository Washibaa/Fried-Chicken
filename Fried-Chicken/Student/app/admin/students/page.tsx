'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, UserPlus, Trash2, Search, Star, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'

interface ClassRow {
  id: string
  name: string
}

interface StudentRow {
  id: string
  name: string
  student_id: string
  roll_number: string
  email: string | null
  class_id: string | null
  is_monitor: boolean
}

// The readable ID prefix is the class name without the "Class " label
// ("Class M1" -> "M1"), matching the seeded student_id format.
function classPrefix(name: string) {
  return (name.split(' ').pop() ?? name).toUpperCase()
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function StudentsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Add-student form
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [roll, setRoll] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  async function reload() {
    const [{ data: classRows }, { data: studentRows }] = await Promise.all([
      supabase.from('classes').select('id, name').order('name', { ascending: true }),
      supabase
        .from('students')
        .select('id, name, student_id, roll_number, email, class_id, is_monitor')
        .order('student_id', { ascending: true }),
    ])
    setClasses(classRows ?? [])
    setStudents(studentRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }) => setClasses(data ?? []))

    supabase
      .from('students')
      .select('id, name, student_id, roll_number, email, class_id, is_monitor')
      .order('student_id', { ascending: true })
      .then(({ data }) => {
        setStudents(data ?? [])
        setLoading(false)
      })
  }, [])

  const classNameById = useMemo(() => {
    const m = new Map<string, string>()
    classes.forEach(c => m.set(c.id, c.name))
    return m
  }, [classes])

  // Preview of the student_id that will be generated
  const previewId = useMemo(() => {
    const cls = classes.find(c => c.id === classId)
    if (!cls || !year || !roll) return ''
    return `${classPrefix(cls.name)}${year}${roll.padStart(2, '0')}`
  }, [classes, classId, year, roll])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
    )
  }, [students, search])

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!name.trim()) return setFormError('Name is required')
    if (!classId) return setFormError('Please choose a class')
    if (!roll.trim()) return setFormError('Roll number is required')
    if (!previewId) return setFormError('Could not build the student ID — check class, year and roll')

    setSaving(true)
    const { error } = await supabase.from('students').insert({
      name: name.trim(),
      student_id: previewId,
      roll_number: roll.padStart(2, '0'),
      initials: initialsOf(name),
      email: email.trim() || null,
      class_id: classId,
      is_monitor: false,
    })

    if (error) {
      setFormError(
        error.code === '23505'
          ? `Student ID ${previewId} already exists — use a different roll number.`
          : error.message
      )
      setSaving(false)
      return
    }

    logActivity(`[Roster] Student added: ${name.trim()} (${previewId})`)
    setName('')
    setRoll('')
    setEmail('')
    setSaving(false)
    reload()
  }

  async function removeStudent(s: StudentRow) {
    const { error } = await supabase.from('students').delete().eq('id', s.id)
    if (error) {
      setConfirmId(null)
      return
    }
    logActivity(`[Roster] Student removed: ${s.name} (${s.student_id})`)
    setConfirmId(null)
    setStudents(prev => prev.filter(x => x.id !== s.id))
  }

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      {/* Header */}
      <div className="mb-8 pl-10 md:pl-0">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Students</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      {/* Add student */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus size={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Add a student</h2>
        </div>

        <form onSubmit={addStudent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label htmlFor="s-name" className="text-xs font-semibold text-gray-600">Full name</label>
            <input
              id="s-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Sok Dara"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-class" className="text-xs font-semibold text-gray-600">Class</label>
            <select
              id="s-class"
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select…</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-year" className="text-xs font-semibold text-gray-600">Enroll year</label>
            <input
              id="s-year"
              value={year}
              onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2025"
              inputMode="numeric"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-roll" className="text-xs font-semibold text-gray-600">Roll no.</label>
            <input
              id="s-roll"
              value={roll}
              onChange={e => setRoll(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="06"
              inputMode="numeric"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-4">
            <label htmlFor="s-email" className="text-xs font-semibold text-gray-600">
              RUPP email <span className="text-gray-400 font-normal">(optional — links their login)</span>
            </label>
            <input
              id="s-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="dara.sok@rupp.edu.kh"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <span className="text-xs font-semibold text-gray-600">Student ID</span>
            <div className="flex items-center gap-3">
              <code className="text-sm font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-0 truncate">
                {previewId || '—'}
              </code>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </form>

        {formError && <p className="text-sm text-red-500 mt-3">{formError}</p>}
        <p className="text-xs text-gray-400 mt-3">
          The ID is built as <span className="font-mono">class + enroll year + roll</span> — e.g. Class M1, 2025, roll 06 → <span className="font-mono">M1202506</span>.
        </p>
      </div>

      {/* Roster */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Roster ({students.length})</h2>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID or email…"
              className="w-full sm:w-72 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Student ID', 'Name', 'Class', 'Roll', 'Email', ''].map((col, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                  {students.length === 0 ? 'No students yet — add one above.' : 'No students match your search'}
                </td></tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-700 whitespace-nowrap">{s.student_id}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        {s.name}
                        {s.is_monitor && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700">
                            <Star size={10} className="fill-teal-600 text-teal-600" />
                            Monitor
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {s.class_id ? classNameById.get(s.class_id) ?? '—' : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.roll_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[220px]">{s.email ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      {confirmId === s.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => removeStudent(s)}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            aria-label="Cancel"
                            className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={15} />
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(s.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 text-xs font-medium rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Removing a student deletes their roster row and attendance history. Their login account (if any) is not deleted.
      </p>
    </div>
  )
}
