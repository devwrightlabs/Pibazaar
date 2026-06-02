/**
 * Centralized environment variable validation.
 *
 * Import `isSupabaseConfigured`, `supabaseUrl`, and `supabaseAnonKey` from
 * this module instead of reading `process.env` directly in client/server code.
 */

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const urlMissing = !rawUrl || rawUrl === PLACEHOLDER_URL
const keyMissing = !rawKey || rawKey === PLACEHOLDER_KEY

/**
 * `true` when both Supabase environment variables are present and are not
 * the build-time placeholder values.
 */
export const isSupabaseConfigured = !urlMissing && !keyMissing

/**
 * Validated Supabase project URL.
 * Falls back to the placeholder so that `createClient()` never receives an
 * empty string (which would throw during the module parse phase at build time).
 */
export const supabaseUrl = rawUrl || PLACEHOLDER_URL

/**
 * Validated Supabase anonymous key.
 * Falls back to the placeholder for the same build-time reason as above.
 */
export const supabaseAnonKey = rawKey || PLACEHOLDER_KEY

if (!isSupabaseConfigured) {
  const missing: string[] = []
  if (urlMissing) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (keyMissing) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error(
    `[PiBazaar] Missing or invalid environment variable(s): ${missing.join(', ')}. ` +
      'All Supabase queries will fail until these are configured in your deployment.'
  )
}
