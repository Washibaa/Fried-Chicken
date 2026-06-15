import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string
  icon: ReactNode
  iconBg: string
}

export default function StatCard({ title, value, icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{title}</p>
      </div>
    </div>
  )
}
