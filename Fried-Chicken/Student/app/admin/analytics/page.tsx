'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart2, CheckCircle, XCircle, Clock, Search, AlertTriangle, Star } from 'lucide-react'
import StatCard from '@/app/components/StatCard'
import DailyAttendanceChart, { DailyCounts } from '@/app/components/charts/DailyAttendanceChart'
import StatusDonut, { StatusCounts } from '@/app/components/charts/StatusDonut'
import GenerateQrButton from '@/app/components/GenerateQr'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'
import { getSelectedClass } from '@/lib/selectedClass'

// Students whose attendance falls below this percentage are flagged (SRS 3.1.4)
const ATTENDANCE_THRESHOLD = 80

interface StudentPerformance {
  id: string
  name: string
  student_id: string
  classId: string | null
  isMonitor: boolean
  present: number
  late: number
  absent: number
  attendancePct: number
}

interface Stats {
  attendanceRate: string
  totalPresent: number
  totalLate: number
  totalAbsent: number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [students, setStudents] = useState<StudentPerformance[]>([])
  const [dailyCounts, setDailyCounts] = useState<DailyCounts[]>([])
  const [todayCounts, setTodayCounts] = useState<StatusCounts | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    const cls = getSelectedClass()
    let studentsQuery = supabase.from('students').select('id, name, student_id, class_id, is_monitor')
    if (cls) studentsQuery = studentsQuery.eq('class_id', cls.id)

    Promise.all([
      studentsQuery.order('student_id', { ascending: true }),
      supabase.from('attendance').select('student_id, status, date'),
    ]).then(([{ data: studentRows }, { data: rawAttendanceRows }]) => {
      if (!studentRows) return
      const classIds = new Set(studentRows.map(s => s.id))
      const attendanceRows = (rawAttendanceRows ?? []).filter(r => classIds.has(r.student_id))

      const attendanceByStudent = new Map<string, { present: number; late: number; absent: number }>()
      for (const row of attendanceRows ?? []) {
        const entry = attendanceByStudent.get(row.student_id) ?? { present: 0, late: 0, absent: 0 }
        if (row.status === 'Present') entry.present++
        if (row.status === 'Late') entry.late++
        if (row.status === 'Absent') entry.absent++
        attendanceByStudent.set(row.student_id, entry)
      }

      const performances: StudentPerformance[] = studentRows.map(s => {
        const att = attendanceByStudent.get(s.id) ?? { present: 0, late: 0, absent: 0 }
        const total = att.present + att.late + att.absent
        return {
          id: s.id,
          name: s.name,
          student_id: s.student_id,
          classId: s.class_id ?? null,
          isMonitor: s.is_monitor ?? false,
          present: att.present,
          late: att.late,
          absent: att.absent,
          attendancePct: total > 0 ? ((att.present + att.late) / total) * 100 : 0,
        }
      })

      performances.sort((a, b) => b.attendancePct - a.attendancePct || b.present - a.present)

      const totalPresent = performances.reduce((sum, s) => sum + s.present, 0)
      const totalLate = performances.reduce((sum, s) => sum + s.late, 0)
      const totalAbsent = performances.reduce((sum, s) => sum + s.absent, 0)
      const total = totalPresent + totalLate + totalAbsent

      setStats({
        totalPresent,
        totalLate,
        totalAbsent,
        attendanceRate: total > 0 ? `${(((totalPresent + totalLate) / total) * 100).toFixed(2)}%` : '—',
      })
      setStudents(performances)

      // Daily stacked counts for the last 14 days
      const days: DailyCounts[] = []
      const byDate = new Map<string, { present: number; late: number; absent: number }>()
      for (const row of attendanceRows ?? []) {
        const entry = byDate.get(row.date) ?? { present: 0, late: 0, absent: 0 }
        if (row.status === 'Present') entry.present++
        if (row.status === 'Late') entry.late++
        if (row.status === 'Absent') entry.absent++
        byDate.set(row.date, entry)
      }
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const iso = d.toISOString().split('T')[0]
        const entry = byDate.get(iso) ?? { present: 0, late: 0, absent: 0 }
        days.push({ date: iso, ...entry })
      }
      setDailyCounts(days)

      // Today's split, counting unmarked students as Pending
      const todayISO = new Date().toISOString().split('T')[0]
      const todayEntry = byDate.get(todayISO) ?? { present: 0, late: 0, absent: 0 }
      const marked = todayEntry.present + todayEntry.late + todayEntry.absent
      setTodayCounts({
        ...todayEntry,
        pending: Math.max(0, studentRows.length - marked),
      })

      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      s => s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q)
    )
  }, [students, search])

  // Appoint a student as their class's monitor (staff only). One monitor per
  // class, so clear any existing monitor in the same class first.
  async function appointMonitor(target: StudentPerformance) {
    const { error } = await supabase
      .from('students')
      .update({ is_monitor: true })
      .eq('id', target.id)
    if (error) return

    if (target.classId) {
      await supabase
        .from('students')
        .update({ is_monitor: false })
        .eq('class_id', target.classId)
        .neq('id', target.id)
    }

    logActivity(`[Monitor] ${target.name} (${target.student_id}) set as class monitor`)
    setStudents(prev =>
      prev.map(s => ({
        ...s,
        isMonitor:
          s.id === target.id
            ? true
            : target.classId && s.classId === target.classId
              ? false
              : s.isMonitor,
      }))
    )
  }

  async function removeMonitor(target: StudentPerformance) {
    const { error } = await supabase
      .from('students')
      .update({ is_monitor: false })
      .eq('id', target.id)
    if (error) return

    logActivity(`[Monitor] ${target.name} (${target.student_id}) removed as class monitor`)
    setStudents(prev => prev.map(s => (s.id === target.id ? { ...s, isMonitor: false } : s)))
  }

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pl-10 md:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <GenerateQrButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Overall Attendance"
          value={stats?.attendanceRate ?? '—'}
          icon={<BarChart2 size={22} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Total Present"
          value={stats ? String(stats.totalPresent) : '—'}
          icon={<CheckCircle size={22} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Total Late"
          value={stats ? String(stats.totalLate) : '—'}
          icon={<Clock size={22} className="text-orange-600" />}
          iconBg="bg-orange-50"
        />
        <StatCard
          title="Total Absent"
          value={stats ? String(stats.totalAbsent) : '—'}
          icon={<XCircle size={22} className="text-red-600" />}
          iconBg="bg-red-50"
        />
      </div>

      {/* Charts (SRS 3.1.4: visual formats such as bar charts or pie graphs) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Daily Attendance</h2>
          <p className="text-sm text-gray-500 mb-4">Last 14 days</p>
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-16">Loading…</p>
          ) : (
            <DailyAttendanceChart days={dailyCounts} />
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Today&apos;s Status</h2>
          <p className="text-sm text-gray-500 mb-4">All students</p>
          {loading || !todayCounts ? (
            <p className="text-center text-sm text-gray-400 py-16">Loading…</p>
          ) : (
            <StatusDonut counts={todayCounts} />
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Individual Student Performance</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or student ID…"
              className="w-full sm:w-64 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Rank', 'Student', 'Present', 'Late', 'Absent', 'Attendance %', 'Monitor'].map(col => (
                  <th
                    key={col}
                    className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
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
                filtered.map((student, index) => {
                  const belowThreshold = student.attendancePct < ATTENDANCE_THRESHOLD
                  return (
                    <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium">#{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{student.student_id}</p>
                          </div>
                          {belowThreshold && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
                              <AlertTriangle size={12} />
                              Below {ATTENDANCE_THRESHOLD}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600 font-medium">{student.present}</td>
                      <td className="px-6 py-4 text-sm text-orange-600 font-medium">{student.late}</td>
                      <td className="px-6 py-4 text-sm text-red-500 font-medium">{student.absent}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[140px] bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${belowThreshold ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${student.attendancePct}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 whitespace-nowrap w-10 text-right">
                            {Math.round(student.attendancePct)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {student.isMonitor ? (
                          <button
                            onClick={() => removeMonitor(student)}
                            title="Remove as class monitor"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors cursor-pointer"
                          >
                            <Star size={12} className="fill-teal-600 text-teal-600" />
                            Monitor
                          </button>
                        ) : student.classId ? (
                          <button
                            onClick={() => appointMonitor(student)}
                            title="Make class monitor"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Star size={12} />
                            Make monitor
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">No class</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
