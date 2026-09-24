'use client'

import { useEffect, useState } from 'react'
import { QrCode, X, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/logger'
import { useSelectedClass } from '@/lib/selectedClass'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// Decorative QR-style pattern seeded by the code; students actually
// check in by typing the code (the scanner in the app is simulated).
function qrModules(code: string): boolean[][] {
  let seed = 0
  for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0xffffffff
  }
  const n = 21
  const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false))
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) grid[y][x] = rand() > 0.5
  // Finder squares in three corners
  const drawFinder = (cx: number, cy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const border = x === 0 || y === 0 || x === 6 || y === 6
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
        grid[cy + y][cx + x] = border || core
      }
  }
  drawFinder(0, 0)
  drawFinder(n - 7, 0)
  drawFinder(0, n - 7)
  return grid
}

interface SubjectRow {
  id: string
  name: string
}

export default function GenerateQrButton() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  // A code checks a student in to one subject's session, so it needs one
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [subjectId, setSubjectId] = useState('')

  const todayISO = new Date().toISOString().split('T')[0]
  const activeClass = useSelectedClass()

  useEffect(() => {
    if (!open) return
    let q = supabase.from('subjects').select('id, name').order('name')
    if (activeClass) q = q.eq('class_id', activeClass.id)
    q.then(({ data }) => {
      const rows = data ?? []
      setSubjects(rows)
      setSubjectId(prev => (prev && rows.some(r => r.id === prev) ? prev : (rows[0]?.id ?? '')))
    })
  }, [open, activeClass])

  async function generate(forSubject: string) {
    if (!forSubject) {
      setError('Pick a subject first — attendance is recorded per subject.')
      setCode(null)
      return
    }
    setGenerating(true)
    setError('')
    const newCode = randomCode()

    const { error: insertError } = await supabase
      .from('qr_sessions')
      .insert({ code: newCode, date: todayISO, subject_id: forSubject })

    if (insertError) {
      setError(insertError.message)
      setCode(null)
    } else {
      setCode(newCode)
      const name = subjects.find(s => s.id === forSubject)?.name ?? 'a subject'
      logActivity(`[QR] Check-in code ${newCode} generated for ${name} on ${todayISO}`)
    }
    setGenerating(false)
  }

  function openModal() {
    setOpen(true)
    setCode(null)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors self-start sm:flex-shrink-0 cursor-pointer"
      >
        <QrCode size={18} />
        Generate QR Code
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Attendance QR Code</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Which subject's session this code checks students in to */}
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="qr-subject" className="text-sm font-semibold text-gray-700">
                Subject
              </label>
              <select
                id="qr-subject"
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value)
                  setCode(null)
                  setError('')
                }}
                disabled={subjects.length === 0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-60"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects for this class</option>
                ) : (
                  subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))
                )}
              </select>
            </div>

            {error ? (
              <div className="text-center py-6">
                <p className="text-sm text-red-500 mb-2">Could not create a check-in code.</p>
                <p className="text-xs text-gray-400">{error}</p>
              </div>
            ) : !code ? (
              <div className="text-center py-8">
                <button
                  onClick={() => generate(subjectId)}
                  disabled={generating || !subjectId}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating…' : 'Generate code'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg
                  viewBox="0 0 21 21"
                  className="w-44 h-44 mb-4"
                  role="img"
                  aria-label={`QR pattern for check-in code ${code}`}
                >
                  <rect width="21" height="21" fill="#ffffff" />
                  {qrModules(code).map((row, y) =>
                    row.map((filled, x) =>
                      filled ? (
                        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111827" />
                      ) : null
                    )
                  )}
                </svg>

                <p className="text-3xl font-extrabold tracking-[0.3em] text-gray-900 mb-1">{code}</p>
                <p className="text-xs text-gray-400 mb-5">Valid for {todayISO}</p>

                <p className="text-sm text-gray-500 text-center mb-5">
                  Students scan this code — or enter it manually — in
                  <span className="font-semibold"> Scan QR Code</span> to check in.
                </p>

                <button
                  onClick={() => generate(subjectId)}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw size={15} />
                  New code
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
