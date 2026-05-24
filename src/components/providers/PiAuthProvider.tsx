'use client'

/**
 * PiAuthProvider
 *
 * Restores the custom JWT session from localStorage on mount and exposes
 * logout(). Pi SDK authentication runs on /login (or via pi-auth-client).
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { setSupabaseAuth } from '@/lib/supabaseClient'
import { initPiSdk, isPiBrowserAvailable } from '@/lib/pi-sdk'

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
  return {
    ...ctx,
    handleLogin: () => {
      console.warn('[PiBazaar] usePiAuth().handleLogin() is deprecated. Use /login.')
    },
    loading: ctx.isLoading,
    error: null,
  }
}

export function useAuth() {
  return useContext(AuthContext)
}

interface TokenPayload {
  sub: string
  pi_uid: string
  username?: string
  exp: number
}

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json) as TokenPayload
  } catch {
    return null
  }
}

export default function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentUser } = useStore()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    if (isPiBrowserAvailable()) {
      initPiSdk()
    }

    const token = localStorage.getItem('pibazaar-token')

    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const decoded = decodeJwtPayload(token)

      if (!decoded?.pi_uid || decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('pibazaar-token')
        document.cookie = 'pibazaar-token=; path=/; max-age=0'
        setIsLoading(false)
        return
      }

      setSupabaseAuth(token)
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
