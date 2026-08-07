'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Users } from 'lucide-react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { supabase } from '@/lib/supabase'
import { setSelectedClass } from '@/lib/selectedClass'

interface ClassRow {
  id: string
  name: string
  department: string | null
}

// Department badge colors, keyed by abbreviation
const deptStyles: Record<string, string> = {
  DSE: 'bg-red-900 text-white',
  ITE: 'bg-white text-gray-900 border border-gray-200',
}

export default function ChooseClassPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name, department')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) setUnavailable(true)
        else setClasses(data ?? [])
        setLoading(false)
      })
  }, [])

  function choose(cls: ClassRow | null) {
    setSelectedClass(cls ? { id: cls.id, name: cls.name } : null)
    router.push('/admin/home')
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3] flex items-center justify-center px-4 py-10">
      <ThemeToggle className="fixed top-4 right-4 z-10" />
      <div className="flex flex-col items-center w-full max-w-3xl">
        <div className="mb-4">
          <Image src="/logo.svg" alt="Logo" width={90} height={90} className="object-contain" />
        </div>

        <p className="text-gray-600 text-sm font-medium mb-1 text-center tracking-wide">
          Royal University of Phnom Penh
        </p>

        <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-widest text-gray-800 mb-10 text-center">
          Choose Class
        </h1>

        {loading ? (
          <p className="text-sm text-gray-400">Loading classes…</p>
        ) : unavailable || classes.length === 0 ? (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              {unavailable
                ? 'The classes table is not set up yet — continuing without a class filter.'
                : 'No classes have been created yet — continuing without a class filter.'}
            </p>
            <button
              onClick={() => choose(null)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {classes.map(cls => {
              const dept = (cls.department ?? '').toUpperCase()
              return (
                <button
                  key={cls.id}
                  onClick={() => choose(cls)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-4 w-32 flex flex-col items-center gap-3 transition-shadow cursor-pointer"
                >
                  <span
                    className={`w-16 h-16 rounded-xl flex items-center justify-center text-lg font-extrabold ${
                      deptStyles[dept] ?? 'bg-gray-800 text-white'
                    }`}
                  >
                    {dept || cls.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{cls.name}</span>
                </button>
              )
            })}

            <button
              onClick={() => choose(null)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-4 w-32 flex flex-col items-center gap-3 transition-shadow cursor-pointer"
            >
              <span className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={26} />
              </span>
              <span className="text-sm font-semibold text-gray-800">All Classes</span>
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
