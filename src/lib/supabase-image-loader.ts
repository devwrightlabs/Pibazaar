/**
 * Custom Next.js image loader for Supabase Storage.
 *
 * Appends Supabase's image transformation query parameters so that
 * <Image /> components automatically request resized variants.
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

import { supabaseUrl } from '@/lib/env'

export default function supabaseImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  const q = quality ?? 75
  const base = supabaseUrl.replace(/\/$/, '')
  const publicPrefix = `${base}/storage/v1/object/public/`

  // If src is already a full Supabase storage object URL for this project,
  // swap the object path for the render/image transform path so Supabase
  // resizes on the fly. Leave other absolute URLs unchanged.
  if (src.startsWith('http')) {
    if (!src.startsWith(publicPrefix)) {
      return src
    }

    const renderUrl = `${base}/storage/v1/render/image/public/${src.slice(publicPrefix.length)}`
    const separator = renderUrl.includes('?') ? '&' : '?'
    return `${renderUrl}${separator}width=${width}&quality=${q}`
  }

  // Otherwise treat src as a relative storage path and build the full URL.
  return `${base}/storage/v1/render/image/public/listing-images/${src}?width=${width}&quality=${q}`
}
