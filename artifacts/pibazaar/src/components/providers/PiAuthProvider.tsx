

/**
 * AuthProvider (formerly PiAuthProvider)
 *
 * Restores Pi-authenticated sessions from localStorage and exposes shared
 * auth helpers for Pi Browser sign-in and logout flows.
 *
 * On mount, this provider attempts to restore an existing session from
 * localStorage and hydrates the Zustand store. It also exposes a `logout()`
 * helper consumed by the Navbar and profile pages.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { getSupabaseClient, setSupabaseAuth } from '@/lib/supabaseClient'
import { initPiSdk } from '@/lib/pi-sdk'
import { useStore } from '@/store/useStore'

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  loginWithPi: () => Promise<void>
  logout: () => void
  isLoading: boolean
  authError: string | null
}

const AuthContext = createContext<AuthContextValue>({
  loginWithPi: async () => {},
  logout: () => {},
  isLoading: true,
  authError: null,
})

/** @deprecated Use useAuth() */
export function usePiAuth(): AuthContextValue & { handleLogin: () => Promise<void>; loading: boolean; error: string | null } {
  const ctx = useContext(AuthContext)
  return {
    ...ctx,
    handleLogin: async () => {
      console.warn('[PiBazaar] usePiAuth() is deprecated. Use useAuth().loginWithPi().')
      try {
        await ctx.loginWithPi()
      } catch {
        // The provider already stores the surfaced auth error.
      }
    },
    loading: ctx.isLoading,
    error: ctx.authError,
  }
}

export function useAuth() {
  return useContext(AuthContext)
}

// ─── Token payload shape (same as authHelper.AuthPayload) ─────────────────────

interface TokenPayload {
  sub: string
  pi_uid: string
  username?: string
  exp: number
}

interface EdgeAuthUser {
  pi_uid: string
  pi_id: string
  username?: string | null
  avatar_url?: string | null
}

interface EdgeAuthResponse {
  token?: string
  user?: EdgeAuthUser
  error?: string
}

interface PiAuthResultLite {
  accessToken: string
  user: { uid: string; username: string }
}

const PI_BROWSER_REQUIRED_MESSAGE = 'Please open Pi Bazaar inside the Pi Browser to sign in.'

/** Decode a JWT payload without signature verification (browser-safe). */
function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Pad base64url to standard base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json) as TokenPayload
  } catch {
    return null
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentUser } = useStore()
  const [, navigate] = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // On mount: restore session from localStorage if token is still valid
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    const token = localStorage.getItem('pibazaar-token')

    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      // Decode without verifying — signature verification happens server-side.
      // We only need the claims to hydrate the client store.
      const decoded = decodeJwtPayload(token)

      if (!decoded || !decoded.pi_uid || decoded.exp * 1000 < Date.now()) {
        // Token missing or expired — clear it
        localStorage.removeItem('pibazaar-token')
        document.cookie = 'pibazaar-token=; path=/; max-age=0'
        setIsLoading(false)
        return
      }

      setCurrentUser({
        id: decoded.pi_uid,
        pi_uid: decoded.pi_uid,
        username: decoded.username ?? 'Pioneer',
        avatar_url: null,
        bio: null,
        created_at: new Date().toISOString(),
      })
    } catch {
      localStorage.removeItem('pibazaar-token')
    } finally {
      setIsLoading(false)
    }
  }, [setCurrentUser])

  const finalizeSession = useCallback(
    (token: string, user: EdgeAuthUser) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pibazaar-token', token)
          const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
          document.cookie = `pibazaar-token=${token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`
        } catch (storageErr) {
          console.warn('[PiAuthProvider] Token persistence failed:', storageErr)
        }
      }

      try {
        setSupabaseAuth(token)
      } catch (supaErr) {
        console.warn('[PiAuthProvider] setSupabaseAuth failed:', supaErr)
      }

      setCurrentUser({
        id: user.pi_uid,
        pi_uid: user.pi_uid,
        username: user.username ?? user.pi_id ?? 'Pioneer',
        avatar_url: user.avatar_url ?? null,
        bio: null,
        created_at: new Date().toISOString(),
      })
    },
    [setCurrentUser]
  )

  const invokeEdge = useCallback(
    async (piAuth: PiAuthResultLite): Promise<{ ok: true; data: EdgeAuthResponse } | { ok: false; message: string }> => {
      try {
        const supabase = getSupabaseClient()
        const { data, error: invokeError } = await supabase.functions.invoke<EdgeAuthResponse>('pi-auth', {
          body: {
            accessToken: piAuth.accessToken,
            pi_uid: piAuth.user.uid,
            pi_username: piAuth.user.username,
          },
        })

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

        if (!data) {
          return { ok: false, message: 'Empty response from authentication service.' }
        }

        return { ok: true, data }
      } catch (err) {
        console.error('[PiAuthProvider] Edge invocation threw:', err)
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Network error contacting authentication service.',
        }
      }
    },
    []
  )

  const loginWithPi = useCallback(async () => {
    setIsLoading(true)
    setAuthError(null)

    try {
      if (typeof window === 'undefined') {
        throw new Error(PI_BROWSER_REQUIRED_MESSAGE)
      }

      const ready = initPiSdk()
      if (!ready || !window.Pi) {
        throw new Error(PI_BROWSER_REQUIRED_MESSAGE)
      }

      let piAuth: PiAuthResultLite
      try {
        const result = (await window.Pi.authenticate(['username'], () => {})) as PiAuthResultLite
        if (!result?.accessToken || !result?.user?.uid) {
          throw new Error('Pi authentication was cancelled or failed.')
        }
        piAuth = result
      } catch (sdkErr) {
        console.error('[PiAuthProvider] Pi authentication failed:', sdkErr)
        throw new Error('Pi authentication was cancelled or failed.')
      }

      const result = await invokeEdge(piAuth)
      if (!result.ok) {
        throw new Error(result.message)
      }

      const { token, user, error } = result.data
      if (!token || !user) {
        throw new Error(error ?? 'Authentication service unavailable.')
      }

      finalizeSession(token, user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pi authentication was cancelled or failed.'
      setAuthError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [finalizeSession, invokeEdge])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pibazaar-token')
      document.cookie = 'pibazaar-token=; path=/; max-age=0'
    }
    setCurrentUser(null)
    navigate('/login')
  }, [setCurrentUser])

  return (
    <AuthContext.Provider value={{ loginWithPi, logout, isLoading, authError }}>
      {children}
    </AuthContext.Provider>
  )
}
