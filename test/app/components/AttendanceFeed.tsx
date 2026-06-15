'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type AttendanceStatus = 'Present' | 'Absent' | 'Pending'

interface Student {
  id: string
  name: string
  student_id: string
  roll_number: string
  initials: string
  status: AttendanceStatus
  check_in_time: string | null
}

const statusStyles: Record<AttendanceStatus, string> = {
  Present: 'bg-green-100 text-green-700',
  Absent:  'bg-red-100 text-red-700',
  Pending: 'bg-yellow-100 text-yellow-700',
}

function now12h() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function AttendanceFeed() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0]

    Promise.all([
      supabase.from('students').select('*').order('roll_number', { ascending: true }),
      supabase.from('attendance').select('*').eq('date', date),
    ]).then(([{ data: studentRows }, { data: attendanceRows }]) => {
      if (!studentRows) return
      const attendanceMap = new Map(
        (attendanceRows ?? []).map(a => [a.student_id, a])
      )
      setStudents(
        studentRows.map(s => {
          const att = attendanceMap.get(s.id)
          return {
            ...s,
            status: (att?.status as AttendanceStatus) ?? 'Pending',
            check_in_time: att?.check_in_time ?? null,
          }
        })
      )
      setLoading(false)
    })
  }, [])

  async function markStatus(studentId: string, status: 'Present' | 'Absent') {
    const date = new Date().toISOString().split('T')[0]
    const checkIn = status === 'Present' ? now12h() : null

    await supabase.from('attendance').upsert(
      { student_id: studentId, date, status, check_in_time: checkIn },
      { onConflict: 'student_id,date' }
    )

    setStudents(prev =>
      prev.map(s =>
        s.id === studentId ? { ...s, status, check_in_time: checkIn } : s
      )
    )
  }

  function exportList() {
    const csv = [
      'Name,Student ID,Roll Number,Status,Check-In Time',
      ...students.map(s =>
        `"${s.name}",${s.student_id},${s.roll_number},${s.status},${s.check_in_time ?? '—'}`
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendance.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <h2 className="text-lg font-semibold text-gray-900">Live Attendance Feed</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Real-Time attendance tracking for today</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Student', 'Student ID', 'Roll Number', 'Status', 'Check-In Time', 'Actions'].map(col => (
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
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                  No students found
                </td>
              </tr>
            ) : (
              students.map(student => (
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
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => markStatus(student.id, 'Present')}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Present
                      </button>
                      <button
                        onClick={() => markStatus(student.id, 'Absent')}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Absent
                      </button>
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
