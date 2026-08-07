'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IdCard,
  QrCode,
  CalendarX,
  Clock,
  LogOut,
  Settings,
  X,
  Camera,
  CheckCircle2,
  Upload,
  FileText,
  Bell,
  ClipboardCheck,
  BookOpen,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import ThemeToggle from '@/app/components/ThemeToggle'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'

interface StudentRow {
  id: string
  name: string
  student_id: string
  roll_number: string
  is_monitor: boolean
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  check_in_time: string | null
  method: string | null
  subject_id: string | null
  semester_id: string | null
}

interface SemesterRow {
  id: string
  name: string
  start_date: string
  is_active: boolean
}

interface SubjectRow {
  id: string
  name: string
  teacher_id: string | null
}

// Attendance rolled up per subject, so a student sees a separate figure for
// each teacher rather than one blended number.
interface SubjectSummary {
  id: string
  name: string
  teacher: string
  present: number
  late: number
  absent: number
  rate: number | null
}

interface Notification {
  id: number
  message: string
  created_at: string
}

interface LeaveRequest {
  id: number
  reason: string
  status: string
  start_date: string | null
  end_date: string | null
  routed_to: string | null
}

// RUPP routing by leave length (SRS 3.1.2): 1 day → Class Monitor,
// up to 2 days → Teacher, longer → Head of Dept
const ROUTE_MONITOR_MAX_DAYS = 1
const ROUTE_TEACHER_MAX_DAYS = 2

function leaveDays(start: string, end: string) {
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()
  return Math.round(ms / 86_400_000) + 1
}

function routeLabel(routedTo: string | null) {
  if (routedTo === 'admin') return 'Head of Dept'
  if (routedTo === 'monitor') return 'Class Monitor'
  return 'Teacher'
}

const attendanceBadge: Record<string, string> = {
  Present: 'bg-green-100 text-green-700',
  Late:    'bg-orange-100 text-orange-700',
  Absent:  'bg-red-100 text-red-700',
}

const leaveBadge: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const MAX_FILE_MB = 5

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function now12h() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function StudentHomePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [student, setStudent] = useState<StudentRow | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const [showHistory, setShowHistory] = useState(false)
  const [showLeaves, setShowLeaves] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  // Semester + subject context
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [semesterId, setSemesterId] = useState('')
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({})

  async function loadAttendance(studentId: string) {
    const { data } = await supabase
      .from('attendance')
      .select('id, date, status, check_in_time, method, subject_id, semester_id')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
    setRecords(data ?? [])
  }

  async function loadLeaves(uid: string) {
    const { data } = await supabase
      .from('leave_requests')
      .select('id, reason, status, start_date, end_date, routed_to')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setLeaves(data ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserName((user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Student')

      const { data: studentRow } = await supabase
        .from('students')
        .select('id, name, student_id, roll_number, is_monitor')
        .eq('user_id', user.id)
        .maybeSingle()

      if (studentRow) {
        setStudent(studentRow)
        await loadAttendance(studentRow.id)
      }
      await loadLeaves(user.id)

      // Semesters, newest first, defaulting to whichever is active
      const { data: semesterRows } = await supabase
        .from('semesters')
        .select('id, name, start_date, is_active')
        .order('start_date', { ascending: false })
      setSemesters(semesterRows ?? [])
      setSemesterId(
        (semesterRows ?? []).find(s => s.is_active)?.id ?? (semesterRows ?? [])[0]?.id ?? ''
      )

      // Subjects of this student's class with their teacher's name. Read from
      // the subject_teachers view — profiles itself isn't student-readable.
      const { data: subjectRows } = await supabase
        .from('subject_teachers')
        .select('subject_id, subject_name, teacher_id, teacher_name')
        .order('subject_name')
      setSubjects(
        (subjectRows ?? []).map(s => ({
          id: s.subject_id,
          name: s.subject_name,
          teacher_id: s.teacher_id,
        }))
      )
      setTeacherNames(
        Object.fromEntries(
          (subjectRows ?? [])
            .filter(s => s.teacher_id)
            .map(s => [s.teacher_id as string, s.teacher_name ?? 'Teacher'])
        )
      )

      // Unread leave-status notifications (SRS 3.1.5)
      const { data: notifRows } = await supabase
        .from('notifications')
        .select('id, message, created_at')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
      setNotifications(notifRows ?? [])

      setLoading(false)
    })
  }, [])

  // Everything below the semester picker works off this slice, so switching
  // term re-scopes the totals, the per-subject breakdown and the export at once.
  const termRecords = useMemo(
    () => (semesterId ? records.filter(r => r.semester_id === semesterId) : records),
    [records, semesterId]
  )

  const subjectSummaries = useMemo<SubjectSummary[]>(() => {
    const byId = new Map<string, SubjectSummary>()
    for (const sub of subjects) {
      byId.set(sub.id, {
        id: sub.id,
        name: sub.name,
        teacher: (sub.teacher_id && teacherNames[sub.teacher_id]) || 'Unassigned',
        present: 0,
        late: 0,
        absent: 0,
        rate: null,
      })
    }
    for (const rec of termRecords) {
      if (!rec.subject_id) continue
      const row = byId.get(rec.subject_id)
      if (!row) continue
      if (rec.status === 'Present') row.present++
      else if (rec.status === 'Late') row.late++
      else if (rec.status === 'Absent') row.absent++
    }
    return [...byId.values()]
      .map(r => {
        const marked = r.present + r.late + r.absent
        // Late still counts as attending, matching the staff-side calculation
        return { ...r, rate: marked > 0 ? ((r.present + r.late) / marked) * 100 : null }
      })
      .filter(r => r.present + r.late + r.absent > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [subjects, teacherNames, termRecords])

  const subjectNameById = useMemo(
    () => new Map(subjects.map(s => [s.id, s.name])),
    [subjects]
  )

  function exportHistory() {
    const term = semesters.find(s => s.id === semesterId)
    const rows = [...termRecords].sort((a, b) => a.date.localeCompare(b.date))
    const csv = [
      'Semester,Subject,Teacher,Date,Status,Check-In,Method',
      ...rows.map(r => {
        const sub = subjects.find(s => s.id === r.subject_id)
        const teacher = (sub?.teacher_id && teacherNames[sub.teacher_id]) || ''
        return [
          `"${term?.name ?? ''}"`,
          `"${sub?.name ?? 'Unknown'}"`,
          `"${teacher}"`,
          r.date,
          r.status,
          r.check_in_time ?? '',
          r.method ?? '',
        ].join(',')
      }),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = (term?.name ?? 'attendance').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    a.download = `${student?.student_id ?? 'my'}-attendance-${slug}.csv`
    a.click()
    URL.revokeObjectURL(url)
    logActivity(`[Report] ${student?.name ?? userName} exported their attendance for ${term?.name ?? 'all terms'}`)
  }

  async function dismissNotification(id: number) {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const present = termRecords.filter(r => r.status === 'Present').length
  const late = termRecords.filter(r => r.status === 'Late').length
  const absent = termRecords.filter(r => r.status === 'Absent').length
  const marked = present + late + absent
  const rate = marked > 0 ? Math.round(((present + late) / marked) * 100) : null

  return (
    <main className="min-h-screen bg-[#f3f3f3] px-4 py-8">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        {/* Notifications (SRS 3.1.5) */}
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
              n.message.includes('approved')
                ? 'bg-green-50 border-green-200'
                : n.message.includes('declined')
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
            }`}
          >
            <Bell size={16} className="mt-0.5 flex-shrink-0 text-gray-500" />
            <p className="text-sm text-gray-700 flex-1">{n.message}</p>
            <button
              onClick={() => dismissNotification(n.id)}
              aria-label="Dismiss notification"
              className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        ))}

        {/* Student ID card */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IdCard size={20} className="text-teal-600" />
              <h1 className="text-sm font-bold text-gray-900">Student ID card</h1>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/student/profile"
                aria-label="Profile settings"
                className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <Settings size={18} />
              </Link>
            </div>
          </div>

          <div className="bg-teal-600 rounded-xl px-5 py-4 text-white">
            <p className="text-[11px] uppercase tracking-wide text-teal-100">Student ID</p>
            <p className="text-lg font-bold mb-2">
              {loading ? '…' : student?.student_id ?? 'Not linked'}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-teal-100">Roll Number</p>
            <p className="text-lg font-bold">
              {loading ? '…' : student?.roll_number ?? '—'}
            </p>
          </div>

          {!loading && !student && (
            <p className="text-xs text-gray-400 mt-2">
              Your account isn&apos;t linked to a student record yet — contact your teacher.
            </p>
          )}
        </div>

        {/* Attendance rate */}
        <div className="bg-blue-600 rounded-2xl shadow-sm px-5 py-6 text-center text-white">
          <p className="text-4xl font-extrabold mb-1">{rate !== null ? `${rate}%` : '—'}</p>
          <p className="text-sm text-blue-100 mb-4">Attendance Rate</p>
          <div className="flex justify-center gap-3">
            <div className="bg-blue-500/60 rounded-lg px-5 py-2 min-w-[84px]">
              <p className="text-lg font-bold leading-tight">{present + late}</p>
              <p className="text-xs text-blue-100">Present</p>
            </div>
            {late > 0 && (
              <div className="bg-blue-500/60 rounded-lg px-5 py-2 min-w-[84px]">
                <p className="text-lg font-bold leading-tight">{late}</p>
                <p className="text-xs text-blue-100">Late</p>
              </div>
            )}
            <div className="bg-blue-500/60 rounded-lg px-5 py-2 min-w-[84px]">
              <p className="text-lg font-bold leading-tight">{absent}</p>
              <p className="text-xs text-blue-100">Absent</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setQrOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <QrCode size={17} />
            Scan QR Code
          </button>
          <button
            onClick={() => setLeaveOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <CalendarX size={17} />
            Leave Request
          </button>
        </div>

        {/* Class Monitor entry — only for students who monitor their class */}
        {student?.is_monitor && (
          <Link
            href="/monitor/leave"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <ClipboardCheck size={17} />
            Approve Class Leave Requests
          </Link>
        )}

        {/* Semester picker — everything below is scoped to the chosen term */}
        {semesters.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <label htmlFor="semester" className="block text-sm font-semibold text-gray-700 mb-2">
              Semester
            </label>
            <select
              id="semester"
              value={semesterId}
              onChange={e => setSemesterId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              {semesters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.is_active ? ' (current)' : ''}
                </option>
              ))}
            </select>
            {semesters.length > 1 && (
              <p className="text-xs text-gray-400 mt-2">
                Past semesters stay available — switch to see that term&apos;s record.
              </p>
            )}
          </div>
        )}

        {/* Per-subject breakdown, one row per teacher */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <BookOpen size={16} className="text-gray-400" />
              By subject
            </span>
            <button
              onClick={exportHistory}
              disabled={termRecords.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          {loading ? (
            <p className="text-center text-sm text-gray-400 py-6">Loading…</p>
          ) : subjectSummaries.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">
              No attendance recorded for this semester yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {subjectSummaries.map(s => (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.teacher}</p>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums flex-shrink-0 ${
                        s.rate === null
                          ? 'text-gray-400'
                          : s.rate < 80
                            ? 'text-red-600'
                            : 'text-green-600'
                      }`}
                    >
                      {s.rate === null ? '—' : `${Math.round(s.rate)}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        s.rate !== null && s.rate < 80 ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${s.rate ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {s.present} present · {s.late} late · {s.absent} absent
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-2xl shadow-sm">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Clock size={16} className="text-gray-400" />
              Attendance History
            </span>
            <span className="text-xs font-semibold text-blue-600">
              {showHistory ? 'Hide' : 'Show'}
            </span>
          </button>

          {showHistory && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {loading ? (
                <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
              ) : !student ? (
                <p className="text-center text-sm text-gray-400 py-8 px-4">
                  No student record linked to this account.
                </p>
              ) : termRecords.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No attendance records yet</p>
              ) : (
                termRecords.map(rec => (
                  <div key={rec.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{formatDate(rec.date)}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {rec.subject_id ? subjectNameById.get(rec.subject_id) ?? 'Unknown subject' : '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {rec.check_in_time ? `${rec.check_in_time} • ${rec.method ?? 'Manual'}` : '—'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        attendanceBadge[rec.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-2xl shadow-sm">
          <button
            onClick={() => setShowLeaves(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText size={16} className="text-gray-400" />
              Leave Requests
            </span>
            <span className="text-xs font-semibold text-blue-600">
              {showLeaves ? 'Hide' : 'Show'}
            </span>
          </button>

          {showLeaves && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {loading ? (
                <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
              ) : leaves.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No leave requests yet</p>
              ) : (
                leaves.map(req => (
                  <div key={req.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {req.start_date ? formatDate(req.start_date) : '—'}
                        {req.end_date && req.end_date !== req.start_date
                          ? ` – ${formatDate(req.end_date)}`
                          : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{req.reason}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {req.status === 'pending' ? 'Awaiting' : 'Reviewed by'} {routeLabel(req.routed_to)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${
                        leaveBadge[req.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-2xl transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {qrOpen && (
        <ScanQrModal
          student={student}
          userName={userName}
          onClose={() => setQrOpen(false)}
          onCheckedIn={() => student && loadAttendance(student.id)}
        />
      )}

      {leaveOpen && userId && (
        <LeaveRequestModal
          userId={userId}
          userName={userName}
          onClose={() => setLeaveOpen(false)}
          onSubmitted={() => loadLeaves(userId)}
        />
      )}
    </main>
  )
}

function ScanQrModal({
  student,
  userName,
  onClose,
  onCheckedIn,
}: {
  student: StudentRow | null
  userName: string
  onClose: () => void
  onCheckedIn: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null)

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!student) {
      setError('Your account is not linked to a student record yet.')
      return
    }

    setSubmitting(true)
    const date = todayISO()
    const cleaned = code.trim().toUpperCase()

    // The code carries the subject, so scanning marks attendance for that
    // teacher's session rather than for the day as a whole.
    const { data: session } = await supabase
      .from('qr_sessions')
      .select('id, subject_id, subjects(name)')
      .eq('code', cleaned)
      .eq('date', date)
      .maybeSingle()

    if (!session) {
      setError('Invalid or expired code. Ask your teacher for today’s QR code.')
      setSubmitting(false)
      return
    }

    if (!session.subject_id) {
      setError('That code is not linked to a subject. Ask your teacher to generate a new one.')
      setSubmitting(false)
      return
    }

    const time = now12h()
    const { error: upsertError } = await supabase.from('attendance').upsert(
      {
        student_id: student.id,
        subject_id: session.subject_id,
        date,
        status: 'Present',
        check_in_time: time,
        method: 'QR',
      },
      { onConflict: 'student_id,date,subject_id' }
    )

    if (upsertError) {
      setError(upsertError.message)
      setSubmitting(false)
      return
    }

    const subjectName =
      (session.subjects as unknown as { name: string } | null)?.name ?? 'class'
    logActivity(
      `[Attendance] ${student.name || userName} checked in via QR for ${subjectName} at ${time}`
    )
    setCheckedInAt(time)
    onCheckedIn()
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Scan QR Code</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {checkedInAt ? (
          <div className="text-center py-6">
            <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-900 mb-1">Checked in</p>
            <p className="text-sm text-gray-500 mb-6">Marked Present at {checkedInAt}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Camera simulation */}
            <div className="bg-gray-950 rounded-xl aspect-[4/3] flex flex-col items-center justify-center mb-5 relative overflow-hidden">
              <span className="absolute inset-4 border-2 border-white/20 rounded-lg pointer-events-none" />
              <Camera size={36} className="text-gray-500 mb-2" />
              <p className="text-[11px] text-gray-400">Camera simulation — Use manual code below</p>
            </div>

            <form onSubmit={handleCheckIn} className="flex flex-col gap-3">
              <label htmlFor="qr-code" className="text-sm font-semibold text-gray-700 -mb-1">
                Or Enter Code Manually
              </label>
              <input
                id="qr-code"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Enter QR code"
                required
                autoFocus
                maxLength={12}
                className="w-full border border-gray-200 rounded-full px-4 py-2.5 text-sm text-center tracking-[0.2em] uppercase text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
              />

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full border border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 text-gray-800 text-sm font-semibold py-2.5 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? 'Checking in…' : 'Submit Check-in'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function LeaveRequestModal({
  userId,
  userName,
  onClose,
  onSubmitted,
}: {
  userId: string
  userName: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [date, setDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [routedTo, setRoutedTo] = useState<'teacher' | 'admin' | 'monitor'>('teacher')
  const fileRef = useRef<HTMLInputElement>(null)

  function acceptFile(f: File | undefined | null) {
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be ${MAX_FILE_MB}MB or smaller`)
      return
    }
    setError('')
    setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const lastDay = endDate || date
    if (lastDay < date) {
      setError('The last day cannot be before the absence date')
      return
    }

    setSubmitting(true)

    let document_url: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('leave-documents')
        .upload(path, file)
      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
      const { data: urlData } = supabase.storage.from('leave-documents').getPublicUrl(path)
      document_url = urlData.publicUrl
    }

    // Route to the correct authority based on leave length (SRS 3.1.2)
    const days = leaveDays(date, lastDay)
    const route =
      days <= ROUTE_MONITOR_MAX_DAYS ? 'monitor' : days <= ROUTE_TEACHER_MAX_DAYS ? 'teacher' : 'admin'

    const { error: insertError } = await supabase.from('leave_requests').insert({
      user_id: userId,
      name: userName,
      reason,
      status: 'pending',
      start_date: date,
      end_date: lastDay,
      routed_to: route,
      document_url,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    logActivity(
      `[Leave] ${userName} submitted a leave request for ${date}${lastDay !== date ? ` – ${lastDay}` : ''} (routed to ${routeLabel(route)})`
    )
    setRoutedTo(route)
    setSubmitted(true)
    onSubmitted()
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Leave Request</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-900 mb-1">Request submitted</p>
            <p className="text-sm text-gray-500 mb-6">
              Your leave request was routed to the{' '}
              <span className="font-semibold">{routeLabel(routedTo)}</span> for approval.
              Track its status under Leave Requests.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="absence-date" className="text-sm font-semibold text-gray-700">
                  Absence Date
                </label>
                <input
                  id="absence-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-shadow"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="absence-end" className="text-sm font-semibold text-gray-700">
                  Until <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="absence-end"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={date || undefined}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-shadow"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              1 day is reviewed by your Class Monitor, up to {ROUTE_TEACHER_MAX_DAYS} days by your Teacher; longer
              requests go to the Head of Department.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="absence-reason" className="text-sm font-semibold text-gray-700">
                Reason for Absence
              </label>
              <textarea
                id="absence-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="please provide a detail reason for your absence"
                required
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-shadow resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-gray-700">
                Supporting Document <span className="text-gray-400 font-normal">(Optional)</span>
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragging(false)
                  acceptFile(e.dataTransfer.files?.[0])
                }}
                className={[
                  'w-full border-2 border-dashed rounded-lg px-4 py-6 text-center transition-colors cursor-pointer',
                  dragging ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                {file ? (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <FileText size={16} className="text-gray-400" />
                    {file.name}
                  </span>
                ) : (
                  <>
                    <Upload size={18} className="text-gray-300 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500">Click to upload or drag file here</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">PDF, JPG, PNG up to {MAX_FILE_MB}MB</p>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => acceptFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 mt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
