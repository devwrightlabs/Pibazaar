'use client'

/**
 * Login — Pi Bazaar
 *
 * Runs the Pi Browser authentication handshake, forwards the verified Pi
 * identity to the existing `pi-auth` Supabase Edge Function, and lets the
 * shared auth provider finalize the authenticated Supabase session.
 *
 * Edge Function expected response shape (200 OK):
 *   { token: string, user: { pi_uid: string, pi_id: string, username?: string|null, avatar_url?: string|null } }
 *
 * Wallet privacy: only the Pi `username` scope is requested. No wallet
 * addresses, passphrases, or private keys are ever requested or stored.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { initPiSdk } from '@/lib/pi-sdk'

export default function LoginPage() {
  const router = useRouter()
  const { loginWithPi } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  // Initialise Pi SDK once on mount so authenticate() is ready by the time
  // the user taps the Pi sign-in button. Safe to call when the SDK script is
  // missing — initPiSdk() returns false and we surface that at click time.
  useEffect(() => {
    initPiSdk()
  }, [])

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = useCallback((kind: 'error' | 'success', message: string) => {
    setToast({ kind, message })
  }, [])

  const handlePiLogin = useCallback(async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      await loginWithPi()
      showToast('success', 'Welcome to Pi Bazaar.')
      router.push('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pi authentication was cancelled or failed.'
      setError(msg)
      showToast('error', msg)
    } finally {
      setLoading(false)
    }
  }, [loading, loginWithPi, router, showToast])

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0A0A0F' }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: '#F0C040' }}
          >
            <span className="font-bold text-black text-xl">π</span>
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: '#F5F5F5', fontFamily: 'Sora, sans-serif' }}
          >
            Pi Bazaar
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            The decentralized marketplace for Pioneers.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-5 space-y-5"
          style={{ backgroundColor: '#12121c', border: '1px solid rgba(240,192,64,0.15)' }}
        >
          <p className="text-sm leading-6" style={{ color: '#9CA3AF' }}>
            Sign in with your Pi Browser account to continue into the marketplace.
          </p>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl text-sm"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: '#FCA5A5',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handlePiLogin()}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-opacity inline-flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#F0C040',
              color: '#000',
              fontFamily: 'Sora, sans-serif',
              opacity: loading ? 0.65 : 1,
            }}
          >
            <span aria-hidden="true">π</span>
            <span>{loading ? 'Connecting to Pi Browser…' : 'Sign in with Pi'}</span>
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: '#6B7280' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Floating toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-sm w-[calc(100%-2rem)] px-4 py-3 rounded-xl text-sm shadow-lg"
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
