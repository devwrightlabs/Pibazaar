'use client'

/**
 * AuthProvider (formerly PiAuthProvider)
 *
 * Manages the Web2 username/password session lifecycle.
 * Pi SDK authentication has been moved to the checkout-only
 * ConnectPiWalletToPay component — it no longer runs on every page load.
 *
 * On mount, this provider attempts to restore an existing session from
 * localStorage and hydrates the Zustand store. It also exposes a `logout()`
 * helper consumed by the Navbar and profile pages.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  logout: () => {},
  isLoading: true,
})

/** @deprecated Use useAuth() */
export function usePiAuth(): AuthContextValue & { handleLogin: () => void; loading: boolean; error: null } {
  const ctx = useContext(AuthContext)
  return { ...ctx, handleLogin: () => {}, loading: ctx.isLoading, error: null }
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
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

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

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pibazaar-token')
      document.cookie = 'pibazaar-token=; path=/; max-age=0'
    }
    setCurrentUser(null)
    router.push('/login')
  }, [setCurrentUser, router])

  return (
    <AuthContext.Provider value={{ logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

