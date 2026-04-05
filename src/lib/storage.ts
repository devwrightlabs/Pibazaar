/**
 * Supabase Storage helpers for the listing-images bucket.
 *
 * Exports upload, delete, and URL-resolution utilities, along with
 * the bucket name and validation constants for listing image storage.
 */

import { supabase } from '@/lib/supabase'
import { isSupabaseConfigured } from '@/lib/env'

export const LISTING_IMAGES_BUCKET = 'listing-images'

/** Maximum allowed file size: 5 MB */
export const MAX_FILE_SIZE_MB = 5
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

/** MIME types accepted for listing images */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Uploads an image file to the listing-images bucket under the given user's folder.
 *
 * @param userId - The authenticated user's ID (used as the top-level folder).
 * @param file   - The image File to upload.
 * @returns An object containing the public `url` and the storage `path`.
 * @throws If Supabase is not configured, validation fails, or the upload errors.
 */
export async function uploadListingImage(
  userId: string,
  file: File
): Promise<{ url: string; path: string }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot upload images.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`)
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type "${file.type}". Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}.`
    )
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const ext = extMap[file.type] ?? 'jpg'
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const url = getListingImageUrl(path)
  return { url, path }
}

/**
 * Removes a file from the listing-images bucket.
 *
 * @param path - The storage path returned by `uploadListingImage`.
 * @throws If Supabase is not configured or the remove call errors.
 */
export async function deleteListingImage(path: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete images.')
  }

  const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Returns the public URL for a given storage path in the listing-images bucket.
 *
 * @param path - The storage path (e.g. `{userId}/{filename}`).
 */
export function getListingImageUrl(path: string): string {
  const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
