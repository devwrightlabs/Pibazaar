/**
 * AuthProvider
 *
 * Centralizes authentication for the PiBazaar web app against the self-contained
 * Express backend (`/api/auth/*`). Implements the two-step model:
 *   1. Manual Sign Up / Log In (username + password) → issues our JWT.
 *   2. Optional "Log In with Pi" using the Pi SDK → /auth/pi (login or link).
 *
 * The JWT is the single source of truth, persisted via the API client's token
 * helpers. On mount we restore the session from GET /auth/me.
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
import type {
  SelfUser,
  SignupBody,
  LoginBody,
} from '@/lib/api/types'

const PI_BROWSER_REQUIRED_MESSAGE =
  'Please open PiBazaar inside the Pi Browser to log in with Pi.'

const PI_SIGNUP_REQUIRED_MESSAGE =
  'Pi verification is required to sign up. Please open PiBazaar inside the Pi Browser to create your account.'

interface AuthContextValue {
  user: SelfUser | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  clearError: () => void
  signup: (body: Pick<SignupBody, 'username' | 'password'>) => Promise<SelfUser>
  login: (body: LoginBody) => Promise<SelfUser>
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
  signup: async () => {
    throw new Error('Auth provider not mounted')
  },
  login: async () => {
    throw new Error('Auth provider not mounted')
  },
  loginWithPi: async () => {
    throw new Error('Auth provider not mounted')
  },
  logout: () => {},
  refresh: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

/** @deprecated Use useAuth(). Kept for the login page during migration. */
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

  const signup = useCallback(
    async (body: Pick<SignupBody, 'username' | 'password'>) => {
      setAuthError(null)
      // Pi gate: only verified Pioneers can create an account. Obtain a Pi
      // identity token in the background (form stays username + password only)
      // and submit it; the backend verifies it before creating the account.
      if (typeof window === 'undefined' || !(await initPiSdk()) || !window.Pi) {
        const message = PI_SIGNUP_REQUIRED_MESSAGE
        setAuthError(message)
        throw new Error(message)
      }

      let piAuth: PiAuthResultLite
      try {
        piAuth = (await window.Pi.authenticate(['username'], () => {})) as PiAuthResultLite
        if (!piAuth?.accessToken) throw new Error('Pi verification was cancelled.')
      } catch (err) {
        const message = messageFromError(err, 'Pi verification was cancelled or failed.')
        setAuthError(message)
        throw new Error(message)
      }

      try {
        const { token, user } = await authApi.signup({
          username: body.username,
          password: body.password,
          accessToken: piAuth.accessToken,
          walletAddress: piAuth.user?.wallet_address,
        })
        setToken(token)
        queryClient.clear()
        setCurrentUser(user)
        return user
      } catch (err) {
        const message = messageFromError(err, 'Sign up failed. Please try again.')
        setAuthError(message)
        throw err
      }
    },
    [setCurrentUser, queryClient],
  )

  const login = useCallback(
    async (body: LoginBody) => {
      setAuthError(null)
      try {
        const { token, user } = await authApi.login(body)
        setToken(token)
        queryClient.clear()
        setCurrentUser(user)
        return user
      } catch (err) {
        const message = messageFromError(err, 'Incorrect username or password.')
        setAuthError(message)
        throw err
      }
    },
    [setCurrentUser, queryClient],
  )

  // Shared Pi authentication routine used by both the manual "Log in with Pi"
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

        const ready = typeof window !== 'undefined' ? await initPiSdk() : false
        if (!ready || !window.Pi) {
          if (silent) return null
          setAuthError(PI_BROWSER_REQUIRED_MESSAGE)
          throw new Error(PI_BROWSER_REQUIRED_MESSAGE)
        }

        let piAuth: PiAuthResultLite
        try {
          piAuth = (await window.Pi.authenticate(['username'], () => {})) as PiAuthResultLite
          if (!piAuth?.accessToken) throw new Error('Pi authentication was cancelled.')
        } catch (err) {
          if (silent) return null
          const message = messageFromError(err, 'Pi authentication was cancelled or failed.')
          setAuthError(message)
          throw new Error(message)
        }

        try {
          // If already logged in (manual account), link Pi to it; otherwise log in / provision.
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
        signup,
        login,
        loginWithPi,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
