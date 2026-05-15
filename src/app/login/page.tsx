'use client'

/**
 * Login / Sign Up — Pi Bazaar
 *
 * Wires Sign In and Create Account directly to the Supabase Edge Function
 * `pi-auth` via supabase.functions.invoke(). All previous local /api/auth/*
 * onboarding routes have been retired.
 *
 * Sign Up flow:
 *   1. Pi SDK authenticate(['username']) — verifies the user is a real Pioneer
 *   2. invoke('pi-auth', { action: 'signup', pi_id, password, accessToken, pi_username, pi_uid })
 *
 * Login flow:
 *   1. invoke('pi-auth', { action: 'login', pi_id, password })
 *
 * Edge Function expected response shape (200 OK):
 *   { token: string, user: { pi_uid: string, pi_id: string, username?: string|null, avatar_url?: string|null } }
 *
 * Wallet privacy: only the Pi `username` scope is requested. No wallet
 * addresses, passphrases, or private keys are ever requested or stored.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { getSupabaseClient, setSupabaseAuth } from '@/lib/supabaseClient'
import { initPiSdk } from '@/lib/pi-sdk'

type Tab = 'login' | 'signup'

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

const PASSWORD_RULES = [
  { key: 'minLength', label: 'Minimum 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'At least 1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'At least 1 number', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'At least 1 special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

export default function LoginPage() {
  const router = useRouter()
  const { setCurrentUser } = useStore()

  const [tab, setTab] = useState<Tab>('login')
  const [piId, setPiId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)

  // Initialise Pi SDK once on mount so authenticate() is ready by the time
  // the user clicks Create Account. Safe to call when the SDK script is
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

  const passwordChecks = {
    minLength: PASSWORD_RULES[0].test(password),
    uppercase: PASSWORD_RULES[1].test(password),
    lowercase: PASSWORD_RULES[2].test(password),
    number: PASSWORD_RULES[3].test(password),
    special: PASSWORD_RULES[4].test(password),
  }
  const isSignupPasswordValid = Object.values(passwordChecks).every(Boolean)

  const showToast = useCallback((kind: 'error' | 'success', message: string) => {
    setToast({ kind, message })
  }, [])

  const finalizeSession = useCallback(
    (token: string, user: EdgeAuthUser) => {
      // Persist token (cookie + localStorage) and re-bind Supabase client.
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pibazaar-token', token)
          const secureFlag =
            window.location.protocol === 'https:' ? '; Secure' : ''
          document.cookie = `pibazaar-token=${token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`
        } catch (storageErr) {
          // Non-fatal: session will still work for this tab via memory.
          console.warn('[LoginPage] Token persistence failed:', storageErr)
        }
      }

      try {
        setSupabaseAuth(token)
      } catch (supaErr) {
        console.warn('[LoginPage] setSupabaseAuth failed:', supaErr)
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
    async (
      payload: Record<string, unknown>
    ): Promise<{ ok: true; data: EdgeAuthResponse } | { ok: false; message: string }> => {
      try {
        const supabase = getSupabaseClient()
        const { data, error: invokeError } = await supabase.functions.invoke<EdgeAuthResponse>(
          'pi-auth',
          { body: payload }
        )

        if (invokeError) {
          // FunctionsHttpError exposes context.response with a JSON body when available.
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
        console.error('[LoginPage] Edge invocation threw:', err)
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Network error contacting authentication service.',
        }
      }
    },
    []
  )

  const handleLogin = useCallback(async () => {
    const result = await invokeEdge({
      action: 'login',
      pi_id: piId.trim(),
      password,
    })

    if (!result.ok) {
      setError(result.message)
      showToast('error', result.message)
      return
    }

    const { token, user, error: edgeError } = result.data
    if (!token || !user) {
      const msg = edgeError ?? 'Invalid Pi ID or password.'
      setError(msg)
      showToast('error', msg)
      return
    }

    finalizeSession(token, user)
    showToast('success', `Welcome back, ${user.username ?? user.pi_id}!`)
    router.push('/')
  }, [invokeEdge, piId, password, finalizeSession, router, showToast])

  const handleSignup = useCallback(async () => {
    if (!isSignupPasswordValid) {
      const msg = 'Password must meet all security requirements.'
      setError(msg)
      showToast('error', msg)
      return
    }

    // 1. Pi SDK handshake — verify the caller is a real Pioneer.
    let piAuth: PiAuthResultLite
    try {
      if (typeof window === 'undefined' || !window.Pi) {
        throw new Error('Pi Browser is required to create an account.')
      }

      const ready = initPiSdk()
      if (!ready) {
        throw new Error('Pi SDK failed to initialize. Please reopen in the Pi Browser.')
      }

      // Only request `username` scope — wallet/payment scopes are deferred
      // to the checkout flow (wallet-privacy rule).
      const result = (await window.Pi.authenticate(['username'], () => {})) as PiAuthResultLite
      if (!result?.accessToken || !result?.user?.uid) {
        throw new Error('Pi authentication did not return a valid session.')
      }
      piAuth = result
    } catch (sdkErr) {
      const msg = sdkErr instanceof Error ? sdkErr.message : 'Pi SDK handshake failed.'
      console.error('[LoginPage] Pi SDK handshake failed:', sdkErr)
      setError(msg)
      showToast('error', msg)
      return
    }

    // 2. Forward verified payload to the Edge Function.
    const result = await invokeEdge({
      action: 'signup',
      pi_id: piId.trim(),
      password,
      accessToken: piAuth.accessToken,
      pi_uid: piAuth.user.uid,
      pi_username: piAuth.user.username,
    })

    if (!result.ok) {
      setError(result.message)
      showToast('error', result.message)
      return
    }

    const { token, user, error: edgeError } = result.data
    if (!token || !user) {
      const msg = edgeError ?? 'Account creation failed. Please try again.'
      setError(msg)
      showToast('error', msg)
      return
    }

    finalizeSession(token, user)
    showToast('success', `Welcome, ${user.username ?? user.pi_id}!`)
    router.push('/')
  }, [
    isSignupPasswordValid,
    invokeEdge,
    piId,
    password,
    finalizeSession,
    router,
    showToast,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    const trimmedPi = piId.trim()
    if (trimmedPi.length < 3 || trimmedPi.length > 32) {
      const msg = 'Pi ID must be between 3 and 32 characters.'
      setError(msg)
      showToast('error', msg)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (tab === 'login') {
        await handleLogin()
      } else {
        await handleSignup()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #12121c 0%, #1a1a2e 100%)' }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ backgroundColor: '#F0C040' }}
          >
            <span className="font-bold text-black text-2xl">π</span>
          </div>
          <h1
            className="text-3xl font-bold mb-1"
            style={{ color: '#F5F5F5', fontFamily: 'Sora, sans-serif' }}
          >
            Pi Bazaar
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            The decentralized marketplace for the Pi Network
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-6"
          style={{ backgroundColor: '#12121c', border: '1px solid rgba(240,192,64,0.15)' }}
        >
          {/* Tab switcher */}
          <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t)
                  setError(null)
                }}
                className="flex-1 py-2.5 text-sm font-semibold capitalize transition-colors"
                style={{
                  backgroundColor: tab === t ? '#F0C040' : 'transparent',
                  color: tab === t ? '#000' : '#9CA3AF',
                }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: '#D1D5DB' }}>
                Pi ID
              </label>
              <input
                type="text"
                value={piId}
                onChange={(e) => setPiId(e.target.value)}
                placeholder="your_pi_id"
                autoComplete="username"
                required
                minLength={3}
                maxLength={32}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#0A0A0F',
                  color: '#F5F5F5',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(240,192,64,0.5)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
              />
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Your universal Pi Network identifier — used to sign in across devices.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: '#D1D5DB' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={tab === 'signup' ? 8 : 6}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#0A0A0F',
                  color: '#F5F5F5',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(240,192,64,0.5)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
              />
              {tab === 'signup' && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: 'linear-gradient(135deg, #12121c 0%, #1a1a2e 100%)',
                    border: '1px solid rgba(240,192,64,0.25)',
                  }}
                >
                  {PASSWORD_RULES.map((rule) => {
                    const ok = passwordChecks[rule.key as keyof typeof passwordChecks]
                    return (
                      <div key={rule.key} className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: ok ? '#F0C040' : '#4B5563' }}
                        />
                        <span style={{ color: ok ? '#F0C040' : '#9CA3AF' }}>{rule.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

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

            {tab === 'signup' && (
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Creating an account opens the Pi Browser to verify you are a real Pioneer.
                We never request or store your wallet address or passphrase here — those are
                handled only at checkout.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || (tab === 'signup' && !isSignupPasswordValid)}
              className="w-full py-3.5 rounded-xl font-bold text-base transition-opacity"
              style={{
                backgroundColor: '#F0C040',
                color: '#000',
                fontFamily: 'Sora, sans-serif',
                opacity: loading ? 0.65 : 1,
              }}
            >
              {loading
                ? tab === 'login'
                  ? 'Signing in…'
                  : 'Verifying with Pi…'
                : tab === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>
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
