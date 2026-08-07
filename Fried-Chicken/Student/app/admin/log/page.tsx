'use client'

import { useEffect, useMemo, useState } from 'react'
import { Share2, Check, Search, Download, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LogEntry {
  id: number
  created_at: string
  message: string
}

// How many rows to pull. The log is append-only and can grow without bound,
// so the query is capped and the UI says so rather than silently truncating.
const MAX_ROWS = 1000

// Compact timestamp like the mockup: 24Mar2026-06:55:02
function formatTimestamp(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour12: false })
  return `${day}${month}${d.getFullYear()}-${time}`
}

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [copied, setCopied] = useState(false)

  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Date bounds are applied in the query so a narrow range can reach further
  // back than MAX_ROWS would otherwise allow.
  useEffect(() => {
    async function load() {
      let q = supabase
        .from('activity_logs')
        .select('id, created_at, message')
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS)

      if (from) q = q.gte('created_at', `${from}T00:00:00`)
      if (to) q = q.lte('created_at', `${to}T23:59:59.999`)

      const { data, error } = await q
      if (error) setUnavailable(true)
      else setEntries(data ?? [])
      setLoading(false)
    }
    load()
  }, [from, to])

  // Emails are embedded in the message text ("[Auth] a@rupp.edu.kh signed in"),
  // so a substring match on the message is what filters by person.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e => e.message.toLowerCase().includes(q))
  }, [entries, search])

  const hasFilters = Boolean(search || from || to)

  function clearFilters() {
    setSearch('')
    setFrom('')
    setTo('')
  }

  async function share() {
    const text = filtered
      .map((e, i) => `${i + 1} [${formatTimestamp(e.created_at)}] ${e.message}`)
      .join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportCsv() {
    const csv = [
      'Timestamp,Message',
      ...filtered.map(e => `${new Date(e.created_at).toISOString()},"${e.message.replace(/"/g, '""')}"`),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log${from ? `-from-${from}` : ''}${to ? `-to-${to}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pl-10 md:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Log</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <div className="flex gap-2 self-start sm:flex-shrink-0">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={share}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-search" className="text-xs font-semibold text-gray-600">
              Search by email or text
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="log-search"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="e.g. admin@rupp.edu.kh, or Attendance"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-from" className="text-xs font-semibold text-gray-600">From</label>
            <input
              id="log-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-to" className="text-xs font-semibold text-gray-600">To</label>
            <input
              id="log-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <button
            onClick={clearFilters}
            disabled={!hasFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-sm font-medium text-gray-600 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <X size={14} />
            Clear
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2.5">
          {loading
            ? 'Loading…'
            : `${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}` +
              (hasFilters ? ` matching, of ${entries.length} loaded` : '') +
              (entries.length === MAX_ROWS ? ` · showing the most recent ${MAX_ROWS} — narrow the dates to reach further back` : '')}
        </p>
      </div>

      <div className="bg-gray-950 rounded-2xl shadow-sm p-5 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-500 font-mono py-6 text-center">Loading…</p>
        ) : unavailable ? (
          <p className="text-sm text-gray-500 font-mono py-6 text-center">
            activity_logs table not set up yet — see README for the schema.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 font-mono py-6 text-center">
            {entries.length === 0 ? 'No activity yet' : 'No entries match these filters'}
          </p>
        ) : (
          <ol className="font-mono text-xs leading-relaxed">
            {filtered.map((entry, i) => (
              <li key={entry.id} className="whitespace-nowrap">
                <span className="text-gray-600 select-none">{String(i + 1).padStart(2, ' ')} </span>
                <span className="text-green-400">[{formatTimestamp(entry.created_at)}]</span>{' '}
                <span className="text-gray-200">{entry.message}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
