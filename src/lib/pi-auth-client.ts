/**
 * Pi Auth Client — browser-side session bridge
 *
 * After Pi SDK authentication, forwards the verified payload to the
 * `pi-auth` Supabase Edge Function and persists the returned JWT.
 */

import { getSupabaseClient, setSupabaseAuth } from '@/lib/supabaseClient'
import { initPiSdk, authenticateForAccount, type PiAuthResult } from '@/lib/pi-sdk'
import type { UserProfile } from '@/lib/types'

export interface PiAuthSessionUser {
  pi_uid: string
  username?: string | null
  avatar_url?: string | null
}

export interface PiAuthSessionResult {
  token: string
  isNewUser: boolean
  user: PiAuthSessionUser
}

export type PiAuthFlowResult =
  | { ok: true; data: PiAuthSessionResult }
  | { ok: false; message: string }

interface EdgeAuthResponse {
  token?: string
  isNewUser?: boolean
  user?: PiAuthSessionUser
  error?: string
}

/** Run Pi SDK handshake, then exchange credentials via the pi-auth Edge Function. */
export async function authenticateWithPiEdge(): Promise<PiAuthFlowResult> {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Pi authentication requires a browser environment.' }
  }

  if (!initPiSdk()) {
    return { ok: false, message: 'Pi SDK failed to initialize. Open this app in the Pi Browser.' }
  }

  const piAuth = await authenticateForAccount()
  if (!piAuth?.accessToken || !piAuth.user?.uid) {
    return { ok: false, message: 'Pi authentication was cancelled or failed.' }
  }

  return exchangePiAuthWithEdge(piAuth)
}

/** Exchange an existing Pi SDK result with the pi-auth Edge Function. */
export async function exchangePiAuthWithEdge(
  piAuth: PiAuthResult
): Promise<PiAuthFlowResult> {
  try {
    const supabase = getSupabaseClient()
    const { data, error: invokeError } = await supabase.functions.invoke<EdgeAuthResponse>(
      'pi-auth',
      {
        body: {
          action: 'authenticate',
          accessToken: piAuth.accessToken,
          pi_uid: piAuth.user.uid,
          pi_username: piAuth.user.username,
        },
      }
    )

    if (invokeError) {
      const ctxResp = (invokeError as { context?: { response?: Response } }).context?.response
      let serverMessage: string | null = null
      if (ctxResp) {
        try {
          const parsed = (await ctxResp.clone().json()) as { error?: string }
          serverMessage = parsed?.error ?? null
        } catch {
          try {
            serverMessage = await ctxResp.clone().text()
          } catch {
            serverMessage = null
          }
        }
      }
      return {
        ok: false,
        message: serverMessage || invokeError.message || 'Authentication service unavailable.',
      }
    }

    if (!data?.token || !data.user?.pi_uid) {
      return { ok: false, message: data?.error ?? 'Invalid response from authentication service.' }
    }

    return {
      ok: true,
      data: {
        token: data.token,
        isNewUser: Boolean(data.isNewUser),
        user: data.user,
      },
    }
  } catch (err) {
    console.error('[pi-auth-client] Edge invocation failed:', err)
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Network error during authentication.',
    }
  }
}

/** Persist JWT and return a UserProfile for the Zustand store. */
export function persistPiAuthSession(
  result: PiAuthSessionResult
): UserProfile {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pibazaar-token', result.token)
      const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `pibazaar-token=${result.token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`
    } catch (storageErr) {
      console.warn('[pi-auth-client] Token persistence failed:', storageErr)
    }
  }

  try {
    setSupabaseAuth(result.token)
  } catch (supaErr) {
    console.warn('[pi-auth-client] setSupabaseAuth failed:', supaErr)
  }

  return {
    id: result.user.pi_uid,
    pi_uid: result.user.pi_uid,
    username: result.user.username ?? 'Pioneer',
    avatar_url: result.user.avatar_url ?? null,
    bio: null,
    created_at: new Date().toISOString(),
  }
}
