'use client'

import { useState } from 'react'

export interface DailyCounts {
  date: string // ISO yyyy-mm-dd
  present: number
  late: number
  absent: number
}

interface TooltipState {
  x: number
  y: number
  day: DailyCounts
}

// Theme variables defined in globals.css; the status trio is validated
// against both the light and dark chart surfaces.
export const chartColors = {
  present: 'var(--chart-present)',
  late: 'var(--chart-late)',
  absent: 'var(--chart-absent)',
  pending: 'var(--chart-pending)',
} as const

const SURFACE = 'var(--chart-surface)'
const W = 640
const H = 220
const PAD = { top: 12, right: 8, bottom: 28, left: 32 }

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// A bar segment; the topmost segment of each stack gets 4px rounded top corners.
function segmentPath(x: number, y: number, w: number, h: number, roundTop: boolean) {
  if (!roundTop || h < 4) return `M${x},${y} h${w} v${h} h${-w} Z`
  const r = 4
  return `M${x},${y + r} a${r},${r} 0 0 1 ${r},${-r} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h${-w} Z`
}

export default function DailyAttendanceChart({ days }: { days: DailyCounts[] }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const maxTotal = Math.max(1, ...days.map(d => d.present + d.late + d.absent))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const step = innerW / Math.max(1, days.length)
  const barW = Math.min(28, step * 0.55)
  const yScale = (v: number) => (v / maxTotal) * innerH

  // Recessive horizontal gridlines at even intervals.
  //
  // Rounding collapses ticks when maxTotal is small — at maxTotal 2 the four
  // fractions give [1, 1, 2, 2] — so de-duplicate. Without this we stack
  // identical lines and labels on the same y, and React sees repeated keys.
  // 0 is dropped because the axis line below already sits there.
  const gridValues = [...new Set([0.25, 0.5, 0.75, 1].map(f => Math.round(maxTotal * f)))]
    .filter(v => v > 0)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Daily attendance for the last 14 days, stacked by present, late, and absent counts"
      >
        {gridValues.map(v => {
          const y = PAD.top + innerH - yScale(v)
          return (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="var(--chart-label)">
                {v}
              </text>
            </g>
          )
        })}
        <line
          x1={PAD.left} x2={W - PAD.right}
          y1={PAD.top + innerH} y2={PAD.top + innerH}
          stroke="var(--chart-axis)" strokeWidth={1}
        />

        {days.map((d, i) => {
          const x = PAD.left + i * step + (step - barW) / 2
          const segments = [
            { key: 'present', value: d.present, color: chartColors.present },
            { key: 'late', value: d.late, color: chartColors.late },
            { key: 'absent', value: d.absent, color: chartColors.absent },
          ].filter(s => s.value > 0)

          let yCursor = PAD.top + innerH
          const rects = segments.map((s, si) => {
            const h = yScale(s.value)
            yCursor -= h
            const isTop = si === segments.length - 1
            return (
              <path
                key={s.key}
                d={segmentPath(x, yCursor, barW, h, isTop)}
                fill={s.color}
                stroke={SURFACE}
                strokeWidth={2}
              />
            )
          })

          const labelEvery = days.length > 8 ? 2 : 1
          return (
            <g
              key={d.date}
              onMouseEnter={() => setTooltip({ x: x + barW / 2, y: yCursor, day: d })}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Oversized hit target */}
              <rect x={PAD.left + i * step} y={PAD.top} width={step} height={innerH} fill="transparent" />
              {rects}
              {i % labelEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--chart-label)"
                >
                  {shortDate(d.date)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg -translate-x-1/2 -translate-y-full whitespace-nowrap z-10"
          style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100}%` }}
        >
          <p className="font-semibold mb-1">{shortDate(tooltip.day.date)}</p>
          <p>Present: {tooltip.day.present}</p>
          <p>Late: {tooltip.day.late}</p>
          <p>Absent: {tooltip.day.absent}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3">
        {[
          { label: 'Present', color: chartColors.present },
          { label: 'Late', color: chartColors.late },
          { label: 'Absent', color: chartColors.absent },
        ].map(item => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
