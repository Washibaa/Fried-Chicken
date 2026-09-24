'use client'

import AttendanceFeed from '@/app/components/AttendanceFeed'
import GenerateQrButton from '@/app/components/GenerateQr'

// The live roster used to sit on the dashboard. It's the screen staff keep open
// while a class starts, so it gets its own tab instead of competing with the
// at-a-glance summary.
export default function AttendancePage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 pl-10 md:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <GenerateQrButton />
      </div>

      <AttendanceFeed />
    </div>
  )
}
