'use client'

/**
 * Login / Sign Up — Pi Bazaar
 *
 * Pi SDK is the exclusive authentication method. Both tabs run the same
 * secure flow: Pi.authenticate → pi-auth Edge Function → custom JWT session.
 *
 * Sign Up: first-time Pioneers see a welcome message (isNewUser from edge).
 * Log In: returning Pioneers get a frictionless Pi Browser handshake.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { initPiSdk } from '@/lib/pi-sdk'
import { authenticateWithPiEdge, persistPiAuthSession } from '@/lib/pi-auth-client'

type Tab = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const { setCurrentUser } = useStore()

  const [tab, setTab] = useState<Tab>('login')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('tab') === 'signup') {
      setTab('signup')
    }
  }, [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  useEffect(() => {
    initPiSdk()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = useCallback((kind: 'error' | 'success', message: string) => {
    setToast({ kind, message })
  }, [])

  const handlePiAuth = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const result = await authenticateWithPiEdge()

      if (!result.ok) {
        setError(result.message)
        showToast('error', result.message)
        return
      }

      const profile = persistPiAuthSession(result.data)
      setCurrentUser(profile)

      const name = result.data.user.username ?? 'Pioneer'
      if (tab === 'signup' || result.data.isNewUser) {
        showToast('success', `Welcome to Pi Bazaar, ${name}!`)
      } else {
        showToast('success', `Welcome back, ${name}!`)
      }

      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [loading, tab, setCurrentUser, router, showToast])

  const isSignup = tab === 'signup'
  const ctaLabel = loading
    ? 'Verifying with Pi…'
    : isSignup
      ? 'Sign Up with Pi'
      : 'Log In with Pi'

  return (
    <main
      className="min-h-screen flex items-center justify-center p-3"
      style={{ background: '#0A0A0F' }}
    >
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-11 h-11 rounded-full mb-3"
            style={{ backgroundColor: '#F0C040' }}
          >
            <span className="font-bold text-black text-lg">π</span>
          </div>
          <h1
            className="text-xl font-bold mb-0.5"
            style={{ color: '#F5F5F5', fontFamily: 'Sora, sans-serif' }}
          >
            Pi Bazaar
          </h1>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            P2P marketplace for the Pi Network
          </p>
        </div>

        <div
          className="rounded-xl p-4 space-y-4"
          style={{ backgroundColor: '#12121c', border: '1px solid rgba(240,192,64,0.12)' }}
        >
          <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t)
                  setError(null)
                }}
                className="flex-1 py-2 text-xs font-semibold capitalize transition-colors"
                style={{
                  backgroundColor: tab === t ? '#F0C040' : 'transparent',
                  color: tab === t ? '#000' : '#9CA3AF',
                }}
              >
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="space-y-3 text-center">
            <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
              {isSignup
                ? 'Verify you are a real Pioneer with the Pi Browser. Your Pi identity becomes your account — no email or password.'
                : 'Return with one tap. The Pi Browser confirms your identity and restores your session.'}
            </p>

            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-lg text-xs text-left"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#FCA5A5',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handlePiAuth()}
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity"
              style={{
                backgroundColor: '#F0C040',
                color: '#000',
                fontFamily: 'Sora, sans-serif',
                opacity: loading ? 0.65 : 1,
              }}
            >
              {ctaLabel}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-center" style={{ color: '#6B7280' }}>
          Wallet access is requested only at checkout. We never store passphrases.
        </p>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-5 z-50 max-w-xs w-[calc(100%-1.5rem)] px-3 py-2 rounded-lg text-xs shadow-lg"
          style={{
            backgroundColor: toast.kind === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)',
            color: '#0A0A0F',
            fontWeight: 600,
          }}
        >
          {toast.message}
        </div>
      )}
    </main>
  )
}
