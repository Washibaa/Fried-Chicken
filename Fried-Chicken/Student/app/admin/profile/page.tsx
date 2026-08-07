'use client'

import ProfileForm from '@/app/components/ProfileForm'

export default function AdminProfilePage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="px-6 py-8 md:px-8 lg:px-10 max-w-screen-xl">
      <div className="pl-10 md:pl-0 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      <ProfileForm />
    </div>
  )
}
