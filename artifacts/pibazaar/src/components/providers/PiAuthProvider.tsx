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
import {
  initPiSdk,
  piDebugAlert,
  getResolvedSandboxMode,
  describePiSdkUnavailable,
} from '@/lib/pi-sdk'
import { useStore } from '@/store/useStore'
import type { SelfUser } from '@/lib/api/types'

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
  isLoggingIn: boolean
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
  isLoggingIn: false,
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
      piDebugAlert('0/5 Button clicked (home)')
      try {
        await ctx.loginWithPi()
      } catch (err) {
        // Detailed message already surfaced via authError; this is the
        // console-less visual-debug catch-all.
        piDebugAlert(`Login failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
    // Session-restore loading (use for skeletons/avatar).
    loading: ctx.isLoading,
    // In-flight manual login attempt (use to gate the login button so a stalled
    // session restore can never leave it permanently disabled).
    loggingIn: ctx.isLoggingIn,
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
  const [isLoggingIn, setIsLoggingIn] = useState(false)
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
        if (!silent) piDebugAlert('1/5 Login started')

        // Initialise the Pi SDK when present, but do NOT gate the login attempt
        // on init reporting success — some Pi Browser builds resolve init lazily
        // or report a non-fatal status, and blocking on it wrongly stops real
        // Pioneers from signing in. The reliable signal that we're inside the Pi
        // Browser is simply that `window.Pi` has been injected.
        if (typeof window !== 'undefined') {
          const ready = await initPiSdk()
          if (!silent) {
            piDebugAlert(
              `2/5 Pi.init ready=${ready}, sandbox=${getResolvedSandboxMode()}, ` +
                `window.Pi present=${!!window.Pi}`,
            )
          }
        }

        // If the SDK was never injected we are not inside the Pi Browser / Sandbox.
        // On a manual attempt this must be visible — otherwise the button looks dead.
        if (typeof window === 'undefined' || !window.Pi) {
          const diagnostic = describePiSdkUnavailable()
          if (!silent) {
            // Always surface this on a manual attempt (not gated behind pidebug):
            // it is the actionable failure that otherwise makes the button look
            // dead, and there is no dev console inside the Pi Browser/Sandbox.
            try {
              window.alert(`[PiBazaar] ${diagnostic}`)
            } catch {
              /* alert blocked */
            }
            setAuthError(diagnostic)
          }
          return null
        }

        // Native Pi SDK authentication — `username` scope only.
        let piAuth: PiAuthResultLite
        try {
          if (!silent) piDebugAlert('3/5 Calling Pi.authenticate(["username"])…')
          piAuth = (await window.Pi.authenticate(
            ['username'],
            onIncompletePaymentFound,
          )) as PiAuthResultLite
          if (!silent) {
            piDebugAlert(`4/5 Pi.authenticate OK — user=${piAuth?.user?.username ?? '(none)'}`)
          }
        } catch (err) {
          console.warn('[pi-sdk] Pi.authenticate failed:', err)
          const message = messageFromError(err, 'Pi authentication was cancelled or failed.')
          if (!silent) {
            piDebugAlert(`ERROR Pi.authenticate: ${message}`)
            setAuthError(message)
          }
          return null
        }
        if (!piAuth?.accessToken) {
          if (!silent) {
            piDebugAlert('ERROR: Pi.authenticate returned no access token')
            setAuthError('Pi did not return an access token. Please try again.')
          }
          return null
        }

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
          if (!silent) piDebugAlert(`5/5 Backend login OK — welcome ${user.username}`)
          return { user, isNewUser: !!isNewUser }
        } catch (err) {
          if (silent) return null
          const message = messageFromError(err, 'Could not log in with Pi. Please try again.')
          piDebugAlert(`ERROR backend exchange: ${message}`)
          setAuthError(message)
          throw err
        }
      })()

      piLoginInFlight.current = attempt
      if (!silent) setIsLoggingIn(true)
      return attempt.finally(() => {
        piLoginInFlight.current = null
        if (!silent) setIsLoggingIn(false)
      })
    },
    [setCurrentUser, queryClient],
  )

  const loginWithPi = useCallback(async () => {
    const result = await runPiLogin()
    if (!result) throw new Error('Pi login is unavailable.')
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
        isLoggingIn,
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
