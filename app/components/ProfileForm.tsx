'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  AVATAR_BUCKET,
  MAX_AVATAR_MB,
  avatarStoragePath,
  resolveAvatar,
  squareThumbnail,
} from '@/lib/avatar'

export default function ProfileForm() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Profile picture
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Change-password section
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setFullName((user.user_metadata?.full_name as string) ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, phone, avatar_url, email_notifications')
        .eq('id', user.id)
        .single()

      if (profile) {
        setRole(profile.role ?? 'user')
        if (profile.full_name) setFullName(profile.full_name)
        setPhone(profile.phone ?? '')
        setAvatarUrl(profile.avatar_url ?? null)
        setEmailNotifications(profile.email_notifications ?? true)
      }
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }

    // Only the editable fields — never touch `role` here so a profile save can't
    // change the account's access level.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, email_notifications: emailNotifications })
      .eq('id', user.id)

    if (profileError) { setError(profileError.message); setSaving(false); return }

    // Keep auth metadata in sync so sidebars and greetings show the new name
    await supabase.auth.updateUser({ data: { full_name: fullName } })

    setSaved(true)
    setSaving(false)
    // The sidebar caches the name for the session — reload so the new name
    // shows in the top-left and everywhere else immediately.
    setTimeout(() => window.location.reload(), 700)
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Clear the input so picking the same file again after an error still fires
    e.target.value = ''
    if (!file) return

    setAvatarError('')

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file')
      return
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setAvatarError(`Image must be ${MAX_AVATAR_MB}MB or smaller`)
      return
    }

    setAvatarBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const thumbnail = await squareThumbnail(file)

      // Timestamped filename so the public CDN URL changes on every upload —
      // reusing one path would keep serving the previous cached picture.
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, thumbnail, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { error: saveError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
      if (saveError) throw saveError

      // Drop the picture this one replaces. Best effort — a leftover file is
      // harmless, and the new avatar is already saved either way.
      const previous = avatarStoragePath(avatarUrl)
      if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous])

      setAvatarUrl(publicUrl)
      // The sidebar caches identity for the session — reload so the new
      // picture appears there too.
      setTimeout(() => window.location.reload(), 700)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not upload that image')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleAvatarRemove() {
    setAvatarError('')
    setAvatarBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const previous = avatarStoragePath(avatarUrl)

      const { error: saveError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
      if (saveError) throw saveError

      if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous])

      setAvatarUrl(null)
      setTimeout(() => window.location.reload(), 700)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not remove the picture')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSaved(false)

    // Same policy as registration (SRS 3.2.3)
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      setPwError('Password must be at least 8 characters and include a letter and a number')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match')
      return
    }

    setPwSaving(true)
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
    if (pwErr) { setPwError(pwErr.message); setPwSaving(false); return }

    setNewPassword('')
    setConfirmPassword('')
    setPwSaved(true)
    setPwSaving(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-center text-sm text-gray-400 py-10">Loading…</p>
      </div>
    )
  }

  // Uploaded picture first, then the role default (students fall through to
  // the initial-letter circle)
  const avatarSrc = resolveAvatar(avatarUrl, role)

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Profile details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarBusy}
            aria-label={avatarUrl ? 'Change profile picture' : 'Upload a profile picture'}
            className="group relative w-20 h-20 rounded-full cursor-pointer disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {avatarSrc ? (
              <span
                className="block w-20 h-20 rounded-full bg-cover bg-center ring-2 ring-white shadow-md"
                style={{ backgroundImage: `url('${avatarSrc}')` }}
              />
            ) : (
              <span className="flex w-20 h-20 rounded-full bg-blue-600 items-center justify-center text-white text-2xl font-bold select-none">
                {(fullName?.[0] ?? '?').toUpperCase()}
              </span>
            )}

            {/* Dim + camera on hover, spinner while working */}
            <span
              className={[
                'absolute inset-0 rounded-full flex items-center justify-center',
                'bg-black/45 text-white transition-opacity',
                avatarBusy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              ].join(' ')}
            >
              {avatarBusy ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Camera size={20} />
              )}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarPick}
            className="hidden"
          />

          <div className="mt-2 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60 cursor-pointer disabled:cursor-wait"
            >
              {avatarBusy ? 'Working…' : avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {avatarUrl && !avatarBusy && (
              <>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  className="font-semibold text-gray-500 hover:text-red-600 cursor-pointer"
                >
                  Remove
                </button>
              </>
            )}
          </div>

          {avatarError && <p className="mt-1.5 text-xs text-red-500">{avatarError}</p>}

          <p className="mt-3 text-base font-semibold text-gray-900">{fullName || '—'}</p>
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize mt-1.5 ${
              role === 'admin'
                ? 'bg-blue-100 text-blue-700'
                : role === 'teacher'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Student'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">RUPP Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-name" className="text-sm font-semibold text-gray-700">Full Name</label>
            <input
              id="profile-name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-phone" className="text-sm font-semibold text-gray-700">
              Contact Mobile Number
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+855 12 345 678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          <label className="flex items-center gap-3 py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={e => setEmailNotifications(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">
              Notify me when my leave request status changes
            </span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-green-600">Profile updated successfully.</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Change Password</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set a new password for {email || 'your account'}.
        </p>

        <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-password" className="text-sm font-semibold text-gray-700">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters, a letter and a number"
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter the new password"
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>

          {pwError && <p className="text-sm text-red-500">{pwError}</p>}
          {pwSaved && <p className="text-sm text-green-600">Password updated — use it next time you log in.</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwSaving || !newPassword}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
