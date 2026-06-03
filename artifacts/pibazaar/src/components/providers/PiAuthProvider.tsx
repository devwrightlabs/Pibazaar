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

interface AuthContextValue {
  user: SelfUser | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  clearError: () => void
  signup: (body: SignupBody) => Promise<SelfUser>
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
    async (body: SignupBody) => {
      setAuthError(null)
      try {
        const { token, user } = await authApi.signup(body)
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

  const loginWithPi = useCallback(async () => {
    setAuthError(null)
    if (typeof window === 'undefined' || !initPiSdk() || !window.Pi) {
      const message = PI_BROWSER_REQUIRED_MESSAGE
      setAuthError(message)
      throw new Error(message)
    }

    let piAuth: PiAuthResultLite
    try {
      piAuth = (await window.Pi.authenticate(
        ['username', 'payments', 'wallet_address'],
        () => {},
      )) as PiAuthResultLite
      if (!piAuth?.accessToken) throw new Error('Pi authentication was cancelled.')
    } catch (err) {
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
      const message = messageFromError(err, 'Could not log in with Pi. Please try again.')
      setAuthError(message)
      throw err
    }
  }, [setCurrentUser, queryClient])

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
