'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ClipboardList,
  CalendarDays,
  Users,
  ArrowRight,
  PartyPopper,
} from 'lucide-react'
import StatCard from '@/app/components/StatCard'
import GenerateQrButton from '@/app/components/GenerateQr'
import { supabase } from '@/lib/supabase'
import { getSelectedClass, useSelectedClass } from '@/lib/selectedClass'

// Students whose attendance falls below this percentage are flagged (SRS 3.1.4)
const ATTENDANCE_THRESHOLD = 80

interface Stats {
  attendanceRate: string
  totalPresent: number
  totalLate: number
  totalAbsent: number
  marked: number
  roster: number
}

interface LowAttendanceStudent {
  id: string
  name: string
  student_id: string
  attendancePct: number
}

interface PendingLeave {
  id: number
  name: string | null
  reason: string
  start_date: string
  end_date: string
}

interface ClassSnapshot {
  id: string
  name: string
  roster: number
  marked: number
  present: number
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [lowAttendance, setLowAttendance] = useState<LowAttendanceStudent[]>([])
  const [pendingLeave, setPendingLeave] = useState<PendingLeave[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [classSnapshots, setClassSnapshots] = useState<ClassSnapshot[]>([])
  const activeClass = useSelectedClass()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0]
    const cls = getSelectedClass()

    // RLS already limits a teacher to their own classes, so an unfiltered
    // query returns exactly what this user is allowed to see.
    let studentsQuery = supabase.from('students').select('id, name, student_id, class_id')
    if (cls) studentsQuery = studentsQuery.eq('class_id', cls.id)

    Promise.all([
      studentsQuery,
      supabase.from('attendance').select('student_id, subject_id, status, date'),
      supabase
        .from('leave_requests')
        .select('id, name, reason, start_date, end_date')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase.from('students').select('id, class_id'),
      supabase.from('classes').select('id, name').order('name'),
      supabase.from('subjects').select('id, class_id'),
    ]).then(
      ([
        { data: studentRows },
        { data: attendanceRows },
        { data: leaveRows },
        { data: allStudents },
        { data: classRows },
        { data: subjectRows },
      ]) => {
        setPendingLeave((leaveRows ?? []).slice(0, 4))
        setPendingCount(leaveRows?.length ?? 0)

        if (!studentRows) return
        const classIds = new Set(studentRows.map(s => s.id))
        const rows = (attendanceRows ?? []).filter(r => classIds.has(r.student_id))

        // Attendance is per subject, so a "session" is one student in one
        // subject. Expected sessions = each student × the subjects of their class.
        const subjectsPerClass = new Map<string, number>()
        for (const sub of subjectRows ?? []) {
          subjectsPerClass.set(sub.class_id, (subjectsPerClass.get(sub.class_id) ?? 0) + 1)
        }
        const expectedSessions = studentRows.reduce(
          (sum, s) => sum + (s.class_id ? subjectsPerClass.get(s.class_id) ?? 0 : 0),
          0
        )

        // Today's stats for the selected class
        const todayRows = rows.filter(r => r.date === date)
        const present = todayRows.filter(r => r.status === 'Present').length
        const late = todayRows.filter(r => r.status === 'Late').length
        const absent = todayRows.filter(r => r.status === 'Absent').length
        const total = present + late + absent
        setStats({
          totalPresent: present,
          totalLate: late,
          totalAbsent: absent,
          attendanceRate: total > 0 ? `${(((present + late) / total) * 100).toFixed(1)}%` : '—',
          marked: total,
          roster: expectedSessions,
        })

        // Per-class snapshot, so staff with more than one class can see at a
        // glance which still needs marking. Ignores the class filter on purpose.
        const todayAll = (attendanceRows ?? []).filter(r => r.date === date)
        const classOfStudent = new Map((allStudents ?? []).map(s => [s.id, s.class_id]))
        setClassSnapshots(
          (classRows ?? []).map(c => {
            const inClass = (allStudents ?? []).filter(s => s.class_id === c.id)
            const sessions = todayAll.filter(r => classOfStudent.get(r.student_id) === c.id)
            return {
              id: c.id,
              name: c.name,
              // Sessions expected today: every student × every subject taught
              roster: inClass.length * (subjectsPerClass.get(c.id) ?? 0),
              marked: sessions.length,
              present: sessions.filter(r => r.status === 'Present').length,
            }
          })
        )

        // Alert teachers when attendance drops over a one-week period (SRS 3.1.5)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const weekAgoISO = weekAgo.toISOString().split('T')[0]

        const byStudent = new Map<string, { attended: number; total: number }>()
        for (const row of rows) {
          if (row.date < weekAgoISO) continue
          const entry = byStudent.get(row.student_id) ?? { attended: 0, total: 0 }
          if (row.status === 'Present' || row.status === 'Late') entry.attended++
          entry.total++
          byStudent.set(row.student_id, entry)
        }
        setLowAttendance(
          studentRows
            .map(s => {
              const att = byStudent.get(s.id)
              return {
                id: s.id,
                name: s.name,
                student_id: s.student_id,
                attendancePct: att && att.total > 0 ? (att.attended / att.total) * 100 : 100,
              }
            })
            .filter(s => s.attendancePct < ATTENDANCE_THRESHOLD)
            .sort((a, b) => a.attendancePct - b.attendancePct)
        )
      }
    )
  }, [])

  const remaining = stats ? Math.max(stats.roster - stats.marked, 0) : 0
  const progress = stats && stats.roster > 0 ? (stats.marked / stats.roster) * 100 : 0

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pl-10 md:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            {today}
            {activeClass ? ` · ${activeClass.name}` : ' · All Classes'}
          </p>
        </div>
        <GenerateQrButton />
      </div>

      {/* Low attendance alert (SRS 3.1.5) */}
      {lowAttendance.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-8">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {lowAttendance.length} student{lowAttendance.length > 1 ? 's' : ''} dropped below the{' '}
              {ATTENDANCE_THRESHOLD}% attendance threshold this week
            </p>
            <p className="text-sm text-red-700 mt-0.5">
              {lowAttendance
                .slice(0, 5)
                .map(s => `${s.name} (${Math.round(s.attendancePct)}%)`)
                .join(', ')}
              {lowAttendance.length > 5 ? ` and ${lowAttendance.length - 5} more` : ''}
              {' — see Analytics for details.'}
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Today's progress — the "am I done taking attendance?" question */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Today&apos;s roll call</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {stats
                  ? `${stats.marked} of ${stats.roster} subject session${stats.roster === 1 ? '' : 's'} marked`
                  : 'Loading…'}
              </p>
            </div>
            <Link
              href="/admin/attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Take attendance
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all ${
                remaining === 0 && stats && stats.roster > 0 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-3 text-sm">
            {!stats ? (
              <span className="text-gray-400">—</span>
            ) : stats.roster === 0 ? (
              <span className="text-gray-500">No students in this class yet.</span>
            ) : remaining === 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-green-700">
                <PartyPopper size={15} />
                Everyone is accounted for today.
              </span>
            ) : (
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{remaining}</span> still waiting to be
                marked.
              </span>
            )}
          </p>
        </div>

        {/* Pending leave — the other thing that needs a decision */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Leave requests</h2>
              <p className="text-xs text-gray-500">
                {pendingCount === 0 ? 'Nothing to review' : `${pendingCount} awaiting a decision`}
              </p>
            </div>
          </div>

          <div className="flex-1 mt-3">
            {pendingLeave.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">You&apos;re all caught up.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-gray-100">
                {pendingLeave.map(l => (
                  <li key={l.id} className="py-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {l.name ?? 'Student'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {shortDate(l.start_date)}
                      {l.end_date !== l.start_date ? ` – ${shortDate(l.end_date)}` : ''} · {l.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/admin/leave"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Review all
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Per-class snapshot, only worth showing when there's more than one */}
      {classSnapshots.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Your classes today</h2>
              <p className="text-xs text-gray-500">
                Every class you have access to, regardless of the filter above
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {classSnapshots.map(c => {
              const pct = c.roster > 0 ? (c.marked / c.roster) * 100 : 0
              const done = c.roster > 0 && c.marked === c.roster
              return (
                <div key={c.id} className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-800 w-24 flex-shrink-0 truncate">
                    {c.name}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                    <div
                      className={`h-2 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-28 text-right flex-shrink-0 tabular-nums">
                    {c.marked}/{c.roster} sessions
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {[
          { href: '/admin/attendance', label: 'Attendance', icon: ClipboardList },
          { href: '/admin/leave', label: 'Leave', icon: CalendarDays },
          { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
          { href: '/admin/classes', label: 'Change class', icon: Users },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
          >
            <Icon size={17} className="flex-shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
