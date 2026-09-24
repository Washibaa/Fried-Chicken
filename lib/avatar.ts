// Profile picture helpers, shared by ProfileForm and Sidebar so both resolve
// and store avatars the same way.

export const AVATAR_BUCKET = 'avatars'

// Anything larger is rejected before we bother decoding it. The upload itself
// is always far smaller — squareThumbnail downscales first.
export const MAX_AVATAR_MB = 5

// Stored square, so a circular crop never distorts the picture.
const THUMBNAIL_PX = 512

// Fallbacks for accounts that haven't uploaded a picture. Students have no
// default photo and fall through to the initial-letter circle.
const ROLE_DEFAULT_AVATAR: Record<string, string> = {
  admin: '/Admin.jpg',
  teacher: '/Teacher.jpg',
}

/**
 * Which image to show for a user: their uploaded picture first, then their
 * role's default photo. Null means the caller should render the initial.
 */
export function resolveAvatar(avatarUrl?: string | null, role?: string | null): string | null {
  if (avatarUrl) return avatarUrl
  return (role && ROLE_DEFAULT_AVATAR[role]) || null
}

/**
 * Center-crop to a square and downscale, returning a JPEG blob.
 *
 * JPEG rather than WebP on purpose: canvas.toBlob silently falls back to PNG
 * when it can't honour the requested type, and PNG isn't in the bucket's
 * allowed_mime_types — the upload would fail on exactly the older browsers
 * we'd be trying to support.
 */
export async function squareThumbnail(file: File, size = THUMBNAIL_PX): Promise<Blob> {
  // imageOrientation keeps phone photos from arriving sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not read that image')
  }

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  )
  if (!blob) throw new Error('Could not read that image')
  return blob
}

/**
 * The object path inside the avatars bucket for a stored public URL, so an
 * old picture can be deleted when it's replaced. Null for role defaults like
 * /Admin.jpg, which live in public/ and must never be removed.
 */
export function avatarStoragePath(publicUrl?: string | null): string | null {
  if (!publicUrl) return null
  const marker = `/object/public/${AVATAR_BUCKET}/`
  const at = publicUrl.indexOf(marker)
  if (at === -1) return null
  return decodeURIComponent(publicUrl.slice(at + marker.length))
}
