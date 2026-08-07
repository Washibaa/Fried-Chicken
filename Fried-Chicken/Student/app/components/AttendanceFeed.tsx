'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'
import { useSelectedClass } from '@/lib/selectedClass'

type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Approved Leave' | 'Pending'

interface SubjectRow {
  id: string
  name: string
  class_id: string
  teacher_id: string | null
}

interface Student {
  id: string
  name: string
  student_id: string
  roll_number: string
  initials: string
  user_id?: string | null
  email?: string | null
  status: AttendanceStatus
  check_in_time: string | null
  check_out_time: string | null
}

const statusStyles: Record<AttendanceStatus, string> = {
  Present:          'bg-green-100 text-green-700',
  Late:             'bg-orange-100 text-orange-700',
  Absent:           'bg-red-100 text-red-700',
  'Approved Leave': 'bg-blue-100 text-blue-700',
  Pending:          'bg-yellow-100 text-yellow-700',
}

const statusFilters: Array<'All' | AttendanceStatus> = [
  'All',
  'Present',
  'Late',
  'Absent',
  'Approved Leave',
  'Pending',
]

function now12h() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function AttendanceFeed() {
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [subjectId, setSubjectId] = useState<string>('')
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [date, setDate] = useState(todayISO())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | AttendanceStatus>('All')
  const activeClass = useSelectedClass()

  const isToday = date === todayISO()
  // Attendance is per subject, so the roster is only meaningful once one is picked
  const loading = loadedKey !== `${date}|${subjectId}`

  // Subjects for the chosen class (RLS already limits these to classes the
  // signed-in staff member can access).
  useEffect(() => {
    let q = supabase.from('subjects').select('id, name, class_id, teacher_id').order('name')
    if (activeClass) q = q.eq('class_id', activeClass.id)
    q.then(({ data }) => {
      const rows = data ?? []
      setSubjects(rows)
      setSubjectId(prev => (prev && rows.some(r => r.id === prev) ? prev : (rows[0]?.id ?? '')))
    })
  }, [activeClass])

  useEffect(() => {
    if (!subjectId) return

    const subject = subjects.find(s => s.id === subjectId)
    let studentsQuery = supabase.from('students').select('*')
    // A subject belongs to one class, so the roster follows the subject
    if (subject) studentsQuery = studentsQuery.eq('class_id', subject.class_id)
    else if (activeClass) studentsQuery = studentsQuery.eq('class_id', activeClass.id)

    Promise.all([
      studentsQuery.order('roll_number', { ascending: true }),
      supabase.from('attendance').select('*').eq('date', date).eq('subject_id', subjectId),
      // Approved leave covering this date — shown instead of Absent/Pending (SRS 3.1.1)
      supabase
        .from('leave_requests')
        .select('user_id')
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date),
    ]).then(([{ data: studentRows }, { data: attendanceRows }, { data: leaveRows }]) => {
      if (!studentRows) return
      const attendanceMap = new Map(
        (attendanceRows ?? []).map(a => [a.student_id, a])
      )
      const onApprovedLeave = new Set((leaveRows ?? []).map(l => l.user_id))
      setStudents(
        studentRows.map(s => {
          const att = attendanceMap.get(s.id)
          const fallback: AttendanceStatus =
            s.user_id && onApprovedLeave.has(s.user_id) ? 'Approved Leave' : 'Pending'
          return {
            ...s,
            status: (att?.status as AttendanceStatus) ?? fallback,
            check_in_time: att?.check_in_time ?? null,
            check_out_time: att?.check_out_time ?? null,
          }
        })
      )
      setLoadedKey(`${date}|${subjectId}`)
    })
  }, [date, subjectId, subjects, activeClass])

  const subjectName = subjects.find(s => s.id === subjectId)?.name ?? 'Attendance'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter(s => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [students, search, statusFilter])

  async function markStatus(studentId: string, status: 'Present' | 'Late' | 'Absent') {
    if (!subjectId) return
    const checkIn = status === 'Absent' ? null : now12h()

    // semester_id is stamped by the attendance_set_semester trigger
    await supabase.from('attendance').upsert(
      {
        student_id: studentId,
        subject_id: subjectId,
        date,
        status,
        check_in_time: checkIn,
        check_out_time: null,
        method: 'Manual',
      },
      { onConflict: 'student_id,date,subject_id' }
    )

    const name = students.find(s => s.id === studentId)?.name ?? studentId
    logActivity(`[Attendance] ${name} marked ${status} (Manual) for ${subjectName} on ${date}`)

    setStudents(prev =>
      prev.map(s =>
        s.id === studentId ? { ...s, status, check_in_time: checkIn, check_out_time: null } : s
      )
    )
  }

  async function checkOut(studentId: string) {
    const checkOutTime = now12h()

    await supabase
      .from('attendance')
      .update({ check_out_time: checkOutTime })
      .eq('student_id', studentId)
      .eq('date', date)
      .eq('subject_id', subjectId)

    const name = students.find(s => s.id === studentId)?.name ?? studentId
    logActivity(`[Attendance] ${name} checked out at ${checkOutTime}`)

    setStudents(prev =>
      prev.map(s =>
        s.id === studentId ? { ...s, check_out_time: checkOutTime } : s
      )
    )
  }

  function exportList() {
    const csv = [
      'Subject,Name,Student ID,Roll Number,Status,Check-In Time,Check-Out Time',
      ...filtered.map(s =>
        `"${subjectName}","${s.name}",${s.student_id},${s.roll_number},${s.status},${s.check_in_time ?? '—'},${s.check_out_time ?? '—'}`
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${subjectName.toLowerCase().replace(/\s+/g, '-')}-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    logActivity(`[Report] Attendance CSV exported for ${subjectName} on ${date}`)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              {isToday && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {isToday ? 'Live Attendance Feed' : 'Attendance Log'}
              </h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {isToday ? 'Real-Time attendance tracking for today' : `Attendance records for ${date}`}
              {activeClass ? ` · ${activeClass.name}` : ''}
              {subjectId ? ` · ${subjectName}` : ''}
            </p>
          </div>

          {/* Search & filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Attendance is recorded per subject, so this picks which one */}
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              disabled={subjects.length === 0}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {subjects.length === 0 ? (
                <option value="">No subjects</option>
              ) : (
                subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              )}
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, ID, or email…"
                className="w-full sm:w-52 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'All' | AttendanceStatus)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              {statusFilters.map(s => (
                <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={e => setDate(e.target.value || todayISO())}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Student', 'Student ID', 'Roll Number', 'Status', 'Check-In', 'Check-Out', 'Actions'].map(col => (
                <th
                  key={col}
                  className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                  No subjects exist for this class yet. Attendance is recorded per subject —
                  an admin can add one on the Subjects page.
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                  {students.length === 0 ? 'No students found' : 'No students match your search'}
                </td>
              </tr>
            ) : (
              filtered.map(student => (
                <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0 select-none">
                        {student.initials}
                      </div>
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{student.student_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{student.roll_number}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[student.status]}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {student.check_in_time ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {student.check_out_time ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => markStatus(student.id, 'Present')}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Present
                      </button>
                      <button
                        onClick={() => markStatus(student.id, 'Late')}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Late
                      </button>
                      <button
                        onClick={() => markStatus(student.id, 'Absent')}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Absent
                      </button>
                      {(student.status === 'Present' || student.status === 'Late') && !student.check_out_time && (
                        <button
                          onClick={() => checkOut(student.id)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 active:bg-gray-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={exportList}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 active:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Download size={16} />
          Export List
        </button>
      </div>
    </div>
  )
}
