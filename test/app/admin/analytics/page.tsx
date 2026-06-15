'use client'

import { useEffect, useState } from 'react'
import { BarChart2, CheckCircle, XCircle, QrCode } from 'lucide-react'
import StatCard from '@/app/components/StatCard'
import { supabase } from '@/lib/supabase'

interface StudentPerformance {
  id: string
  name: string
  student_id: string
  present: number
  absent: number
  attendancePct: number
}

interface Stats {
  attendanceRate: string
  totalPresent: number
  totalAbsent: number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [students, setStudents] = useState<StudentPerformance[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('id, name, student_id').order('student_id', { ascending: true }),
      supabase.from('attendance').select('student_id, status'),
    ]).then(([{ data: studentRows }, { data: attendanceRows }]) => {
      if (!studentRows) return

      const attendanceByStudent = new Map<string, { present: number; absent: number }>()
      for (const row of attendanceRows ?? []) {
        const entry = attendanceByStudent.get(row.student_id) ?? { present: 0, absent: 0 }
        if (row.status === 'Present') entry.present++
        if (row.status === 'Absent') entry.absent++
        attendanceByStudent.set(row.student_id, entry)
      }

      const performances: StudentPerformance[] = studentRows.map(s => {
        const att = attendanceByStudent.get(s.id) ?? { present: 0, absent: 0 }
        const total = att.present + att.absent
        return {
          id: s.id,
          name: s.name,
          student_id: s.student_id,
          present: att.present,
          absent: att.absent,
          attendancePct: total > 0 ? (att.present / total) * 100 : 0,
        }
      })

      performances.sort((a, b) => b.attendancePct - a.attendancePct || b.present - a.present)

      const totalPresent = performances.reduce((sum, s) => sum + s.present, 0)
      const totalAbsent = performances.reduce((sum, s) => sum + s.absent, 0)
      const total = totalPresent + totalAbsent

      setStats({
        totalPresent,
        totalAbsent,
        attendanceRate: total > 0 ? `${((totalPresent / total) * 100).toFixed(2)}%` : '—',
      })
      setStudents(performances)
      setLoading(false)
    })
  }, [])

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pl-10 md:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors self-start sm:flex-shrink-0 cursor-pointer">
          <QrCode size={18} />
          Generate QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
          title="Total Absent"
          value={stats ? String(stats.totalAbsent) : '—'}
          icon={<XCircle size={22} className="text-red-600" />}
          iconBg="bg-red-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Individual Student Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Rank', 'Student', 'Present', 'Absent', 'Attendance %'].map(col => (
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
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">#{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{student.student_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">{student.present}</td>
                    <td className="px-6 py-4 text-sm text-red-500 font-medium">{student.absent}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[140px] bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${student.attendancePct}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 whitespace-nowrap w-10 text-right">
                          {Math.round(student.attendancePct)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
