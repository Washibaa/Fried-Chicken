'use client'

import { useEffect, useState } from 'react'
import { BarChart2, CheckCircle, XCircle, QrCode } from 'lucide-react'
import StatCard from '@/app/components/StatCard'
import AttendanceFeed from '@/app/components/AttendanceFeed'
import { supabase } from '@/lib/supabase'

interface Stats {
  attendanceRate: string
  totalPresent: number
  totalAbsent: number
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0]
    supabase
      .from('attendance')
      .select('status')
      .eq('date', date)
      .then(({ data }) => {
        if (!data) return
        const present = data.filter(r => r.status === 'Present').length
        const absent = data.filter(r => r.status === 'Absent').length
        const total = present + absent
        setStats({
          totalPresent: present,
          totalAbsent: absent,
          attendanceRate: total > 0 ? `${((present / total) * 100).toFixed(1)}%` : '—',
        })
      })
  }, [])

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pl-10 md:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors self-start sm:flex-shrink-0 cursor-pointer">
          <QrCode size={18} />
          Generate QR Code
        </button>
      </div>

      {/* Statistics */}
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

      {/* Attendance Feed */}
      <AttendanceFeed />
    </div>
  )
}
