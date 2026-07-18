'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle } from 'lucide-react'
import StatCard from '@/app/components/StatCard'
import { supabase } from '@/lib/supabase'

interface Stats {
  pending: number
  approved: number
  rejected: number
}

export default function UserHomePage() {
  const [userName, setUserName] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Student'
      setUserName(name)

      supabase
        .from('leave_requests')
        .select('status')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (!data) return
          setStats({
            pending: data.filter(r => r.status === 'pending').length,
            approved: data.filter(r => r.status === 'approved').length,
            rejected: data.filter(r => r.status === 'rejected').length,
          })
        })
    })
  }, [])

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="pl-10 md:pl-0 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          Welcome{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Pending"
          value={stats ? String(stats.pending) : '—'}
          icon={<Clock size={22} className="text-yellow-600" />}
          iconBg="bg-yellow-50"
        />
        <StatCard
          title="Approved"
          value={stats ? String(stats.approved) : '—'}
          icon={<CheckCircle size={22} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Rejected"
          value={stats ? String(stats.rejected) : '—'}
          icon={<XCircle size={22} className="text-red-600" />}
          iconBg="bg-red-50"
        />
      </div>
    </div>
  )
}
