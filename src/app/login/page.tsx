'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizeIdentifierToEmail = (value: string) => {
    const clean = value.trim().toLowerCase()
    if (clean.includes('@')) return clean
    const safe = clean.replace(/[^a-z0-9._-]/g, '')
    return `${safe}@users.pibazaar.local`
  }

  const displayNameFromIdentifier = (value: string) => {
    const clean = value.trim()
    if (!clean) return 'Pioneer'
    if (clean.includes('@')) return clean.split('@')[0]
    return clean
  }

  const syncSession = async (accessToken: string, preferredUsername?: string) => {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken,
        ...(preferredUsername ? { username: preferredUsername } : {}),
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string }
      const statusMessage = response.status ? ` (HTTP ${response.status})` : ''
      throw new Error(payload.error ?? `Failed to initialize user session${statusMessage}.`)
    }

    const payload = await response.json().catch(() => null) as { token: string } | null
    if (!payload?.token) {
      throw new Error('Session setup failed: invalid server response.')
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('pibazaar-token', payload.token)
      document.cookie = `pibazaar-token=${payload.token}; path=/; max-age=3600; SameSite=Lax`
    }
  }

  const handleSubmit = async () => {
    const normalizedEmail = normalizeIdentifierToEmail(identifier)
    const preferredUsername = username.trim() || displayNameFromIdentifier(identifier)
    if (!normalizedEmail || !password.trim()) {
      setError('Please enter an email or username and password.')
      return
    }

    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              username: preferredUsername,
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        if (!data.session?.access_token) {
          setMessage('Account created. Please verify your email, then sign in.')
          setMode('login')
          return
        }

        await syncSession(data.session.access_token, preferredUsername)
        router.push('/')
        router.refresh()
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (!data.session?.access_token) {
        setError('Login did not return a valid session.')
        return
      }

      await syncSession(data.session.access_token)
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="w-full max-w-md space-y-6 rounded-2xl p-5 sm:p-6" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--color-text)', fontFamily: 'Sora, sans-serif' }}>
            {mode === 'login' ? 'Sign in to' : 'Create your'} <span style={{ color: 'var(--color-gold)' }}>Pi Bazaar</span> account
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-subtext)' }}>
            Use email/password for account access. Connect your Pi Wallet only when paying at checkout.
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-xl p-1" style={{ backgroundColor: 'var(--color-control-bg)' }}>
          <button
            onClick={() => setMode('login')}
            className="py-2.5 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: mode === 'login' ? 'var(--color-gold)' : 'transparent',
              color: mode === 'login' ? '#000' : 'var(--color-text)',
            }}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className="py-2.5 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: mode === 'signup' ? 'var(--color-gold)' : 'transparent',
              color: mode === 'signup' ? '#000' : 'var(--color-text)',
            }}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Email or Username
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="you@example.com or yourname"
              className="mt-1 w-full rounded-xl px-3 py-3 text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-control-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
          </label>

          {mode === 'signup' && (
            <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Display Username (optional)
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your public name"
                className="mt-1 w-full rounded-xl px-3 py-3 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--color-control-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </label>
          )}

          <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="mt-1 w-full rounded-xl px-3 py-3 text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-control-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
          </label>

          <button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-base transition-opacity"
            style={{
              backgroundColor: 'var(--color-gold)',
              color: '#000',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </div>

        {message && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22C55E' }}>
            <p className="text-sm" style={{ color: '#22C55E' }}>{message}</p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444' }}>
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}

        <div className="text-xs text-center" style={{ color: 'var(--color-subtext)' }}>
          <button onClick={() => router.push('/')} className="underline underline-offset-2">
            Back to marketplace
          </button>
        </div>
      </div>
    </main>
  )
}
