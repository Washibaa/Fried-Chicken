'use client'

import { useState } from 'react'
import { chartColors } from './DailyAttendanceChart'

export interface StatusCounts {
  present: number
  late: number
  absent: number
  pending: number
}

const SIZE = 180
const RADIUS = 74
const STROKE = 26

const slices = [
  { key: 'present', label: 'Present', color: chartColors.present },
  { key: 'late', label: 'Late', color: chartColors.late },
  { key: 'absent', label: 'Absent', color: chartColors.absent },
  { key: 'pending', label: 'Pending', color: chartColors.pending },
] as const

export default function StatusDonut({ counts }: { counts: StatusCounts }) {
  const [hovered, setHovered] = useState<string | null>(null)

  const total = counts.present + counts.late + counts.absent + counts.pending
  const attended = counts.present + counts.late
  const marked = counts.present + counts.late + counts.absent
  const rate = marked > 0 ? Math.round((attended / marked) * 100) : null

  const c = SIZE / 2
  const circumference = 2 * Math.PI * RADIUS

  let offset = 0
  const arcs = slices
    .map(s => {
      const value = counts[s.key]
      const fraction = total > 0 ? value / total : 0
      const arc = { ...s, value, fraction, start: offset }
      offset += fraction
      return arc
    })
    .filter(a => a.value > 0)

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Today's attendance split by status"
        >
          {total === 0 ? (
            <circle cx={c} cy={c} r={RADIUS} fill="none" stroke="var(--chart-grid)" strokeWidth={STROKE} />
          ) : (
            arcs.map(a => (
              <circle
                key={a.key}
                cx={c}
                cy={c}
                r={RADIUS}
                fill="none"
                stroke={a.color}
                strokeWidth={hovered === a.key ? STROKE + 4 : STROKE}
                strokeDasharray={`${Math.max(0, a.fraction * circumference - 2)} ${circumference}`}
                strokeDashoffset={-a.start * circumference}
                transform={`rotate(-90 ${c} ${c})`}
                className="transition-all duration-150"
                onMouseEnter={() => setHovered(a.key)}
                onMouseLeave={() => setHovered(null)}
              />
            ))
          )}
        </svg>
        {/* Hero number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-bold text-gray-900">{rate !== null ? `${rate}%` : '—'}</p>
          <p className="text-xs text-gray-400">attended</p>
        </div>
      </div>

      {/* Legend with counts */}
      <div className="flex flex-col gap-2">
        {slices.map(s => (
          <div
            key={s.key}
            className={`flex items-center gap-2.5 text-sm rounded-md px-1.5 py-0.5 transition-colors ${
              hovered === s.key ? 'bg-gray-50' : ''
            }`}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 w-16">{s.label}</span>
            <span className="font-semibold text-gray-900">{counts[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
