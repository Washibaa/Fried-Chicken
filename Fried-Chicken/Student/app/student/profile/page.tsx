'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ProfileForm from '@/app/components/ProfileForm'

export default function UserProfilePage() {
  return (
    <main className="min-h-screen bg-[#f3f3f3] px-4 py-8">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/student/home"
            aria-label="Back to home"
            className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        </div>

        <ProfileForm />
      </div>
    </main>
  )
}
