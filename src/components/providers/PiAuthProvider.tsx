'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'

// ─── Context ──────────────────────────────────────────────────────────────────

interface PiAuthContextValue {
  handleLogin: () => Promise<void>
  loading: boolean
  error: string | null
}

const PiAuthContext = createContext<PiAuthContextValue>({
  handleLogin: async () => {},
  loading: false,
  error: null,
})

export function usePiAuth() {
  return useContext(PiAuthContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentUser } = useStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearClientAuth = useCallback(() => {
    setCurrentUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pibazaar-token')
      document.cookie = 'pibazaar-token=; path=/; max-age=0; SameSite=Lax'
    }
  }, [setCurrentUser])

  const syncSession = useCallback(async (accessToken: string) => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error ?? 'Failed to sync session')
    }

    const data = (await res.json()) as {
      token: string
      user: {
        pi_uid: string
        username: string | null
        avatar_url: string | null
        created_at: string | null
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('pibazaar-token', data.token)
      document.cookie = `pibazaar-token=${data.token}; path=/; max-age=3600; SameSite=Lax`
    }

    setCurrentUser({
      id: data.user.pi_uid,
      pi_uid: data.user.pi_uid,
      username: data.user.username ?? 'Pioneer',
      avatar_url: data.user.avatar_url,
      bio: null,
      created_at: data.user.created_at ?? new Date().toISOString(),
    })
  }, [setCurrentUser])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await syncSession(session.access_token)
        } else {
          clearClientAuth()
        }
      } catch (err) {
        console.error('[PiAuthProvider] Session bootstrap failed:', err)
        clearClientAuth()
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    const handleAuthStateChange = async (accessToken: string | undefined) => {
      setLoading(true)
      setError(null)
      try {
        if (accessToken) {
          await syncSession(accessToken)
        } else {
          clearClientAuth()
        }
      } catch (err) {
        console.error('[PiAuthProvider] Auth state sync failed:', err)
        clearClientAuth()
        if (isMounted) {
          setError('Authentication sync failed. Please sign in again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleAuthStateChange(session?.access_token)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [clearClientAuth, syncSession])

  const handleLogin = useCallback(async () => {
    setError(null)
    router.push('/login')
  }, [router])

  return (
    <PiAuthContext.Provider value={{ handleLogin, loading, error }}>
      {children}
    </PiAuthContext.Provider>
  )
}
