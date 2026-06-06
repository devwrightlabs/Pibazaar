/**
 * AuthProvider
 *
 * Pi-only authentication for the PiBazaar web app against the self-contained
 * Express backend (`/api/auth/*`). There is no manual username/password flow:
 * the sole entry point is "Login with Pi", which runs the Pi SDK inside the Pi
 * Browser, then exchanges the access token with the backend, which validates it
 * via GET https://api.minepi.com/v2/me (Bearer, no API key) before issuing our
 * JWT. The JWT is the single source of truth, persisted via the API client's
 * token helpers. On mount we restore the session from GET /auth/me.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'wouter'
import { useQueryClient } from '@tanstack/react-query'
import { authApi, setToken, getToken, ApiError } from '@/lib/api/client'
import { useRealtimeSync } from '@/lib/api/hooks'
import { initPiSdk } from '@/lib/pi-sdk'
import { useStore } from '@/store/useStore'
import type { SelfUser } from '@/lib/api/types'

const PI_BROWSER_REQUIRED_MESSAGE =
  'Please open PiBazaar inside the Pi Browser to log in with Pi.'

/**
 * Required by `Pi.authenticate(scopes, onIncompletePaymentFound)`. The Pi SDK
 * invokes this when a previously-created payment for this user was never
 * completed. We only request the `username` scope here (no payments), so this
 * is a safety net: log it for observability. Payment completion is handled in
 * the dedicated checkout flow, not during sign-in.
 */
function onIncompletePaymentFound(payment: unknown): void {
  console.warn('[pi-sdk] Incomplete payment found during authentication:', payment)
}

interface AuthContextValue {
  user: SelfUser | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  clearError: () => void
  loginWithPi: () => Promise<{ user: SelfUser; isNewUser: boolean }>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  clearError: () => {},
  loginWithPi: async () => {
    throw new Error('Auth provider not mounted')
  },
  logout: () => {},
  refresh: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

/** Convenience wrapper used by the home hero's "Login with Pi" button. */
export function usePiAuth() {
  const ctx = useContext(AuthContext)
  return {
    ...ctx,
    handleLogin: async () => {
      try {
        await ctx.loginWithPi()
      } catch {
        /* error surfaced via authError */
      }
    },
    loading: ctx.isLoading,
    error: ctx.authError,
  }
}

interface PiAuthResultLite {
  accessToken: string
  user: { uid: string; username: string; wallet_address?: string }
}

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export default function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUser } = useStore()
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Keep React Query caches live over the WebSocket while authenticated.
  useRealtimeSync()

  const clearError = useCallback(() => setAuthError(null), [])

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setCurrentUser(null)
      return
    }
    try {
      const { user } = await authApi.me()
      setCurrentUser(user)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToken(null)
        setCurrentUser(null)
      }
    }
  }, [setCurrentUser])

  // Restore session on mount.
  useEffect(() => {
    let active = true
    ;(async () => {
      await refresh()
      if (active) setIsLoading(false)
    })()
    return () => {
      active = false
    }
  }, [refresh])

  // Shared Pi authentication routine used by both the manual "Login with Pi"
  // button and the automatic on-load trigger. Awaits Pi.init() fully, then
  // authenticates with the `username` scope and exchanges the access token with
  // the backend, which validates it via GET /v2/me before issuing our session.
  // A single in-flight promise dedupes concurrent attempts (auto + manual).
  const piLoginInFlight = useRef<
    Promise<{ user: SelfUser; isNewUser: boolean } | null> | null
  >(null)

  const runPiLogin = useCallback(
    (
      { silent }: { silent?: boolean } = {},
    ): Promise<{ user: SelfUser; isNewUser: boolean } | null> => {
      if (piLoginInFlight.current) return piLoginInFlight.current

      const attempt = (async () => {
        if (!silent) setAuthError(null)

        // Pi authentication runs exclusively inside the Pi Browser, where
        // window.Pi is injected. Anywhere else there is nothing to authenticate
        // against, so we bail out (silently for the auto-trigger).
        const ready = typeof window !== 'undefined' ? await initPiSdk() : false
        if (!ready || !window.Pi) {
          if (silent) return null
          setAuthError(PI_BROWSER_REQUIRED_MESSAGE)
          throw new Error(PI_BROWSER_REQUIRED_MESSAGE)
        }

        // Native Pi SDK authentication — `username` scope only — executed inside
        // the Pi Browser. We deliberately do NOT surface the SDK's raw failure
        // text (e.g. "We couldn't verify your app") in the UI: it is logged for
        // observability and the attempt simply stops, so no error banner is shown.
        let piAuth: PiAuthResultLite
        try {
          piAuth = (await window.Pi.authenticate(
            ['username'],
            onIncompletePaymentFound,
          )) as PiAuthResultLite
        } catch (err) {
          console.warn('[pi-sdk] Pi.authenticate failed:', err)
          return null
        }
        if (!piAuth?.accessToken) return null

        try {
          // If already logged in, link Pi to it; otherwise log in / provision.
          const linking = !!getToken()
          const { token, user, isNewUser } = await authApi.pi(
            { accessToken: piAuth.accessToken, walletAddress: piAuth.user?.wallet_address },
            { link: linking },
          )
          setToken(token)
          // Fresh login switches identity — drop cached data. Linking keeps the same user.
          if (!linking) queryClient.clear()
          setCurrentUser(user)
          return { user, isNewUser: !!isNewUser }
        } catch (err) {
          if (silent) return null
          const message = messageFromError(err, 'Could not log in with Pi. Please try again.')
          setAuthError(message)
          throw err
        }
      })()

      piLoginInFlight.current = attempt
      return attempt.finally(() => {
        piLoginInFlight.current = null
      })
    },
    [setCurrentUser, queryClient],
  )

  const loginWithPi = useCallback(async () => {
    const result = await runPiLogin()
    if (!result) throw new Error(PI_BROWSER_REQUIRED_MESSAGE)
    return result
  }, [runPiLogin])

  // Automatically trigger Pi authentication on app load: once the session has
  // been restored, if the user is not already authenticated and the Pi SDK is
  // present (running inside the Pi Browser), attempt a silent Pi login.
  const autoPiAttempted = useRef(false)
  useEffect(() => {
    if (isLoading || currentUser || autoPiAttempted.current) return
    if (typeof window === 'undefined' || !window.Pi) return
    autoPiAttempted.current = true
    void runPiLogin({ silent: true })
  }, [isLoading, currentUser, runPiLogin])

  const logout = useCallback(() => {
    authApi.logout().catch(() => {})
    setToken(null)
    setCurrentUser(null)
    // Drop all cached server data so the next user never sees the previous one's.
    queryClient.clear()
    navigate('/login')
  }, [navigate, setCurrentUser, queryClient])

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        authError,
        clearError,
        loginWithPi,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
