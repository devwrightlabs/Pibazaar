'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { signupWithUsernamePassword } from './actions'

type Tab = 'login' | 'signup'

interface AuthResponse {
  token?: string
  user?: {
    id: string
    pi_uid: string
    username: string
    avatar_url: string | null
  }
  error?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { setCurrentUser } = useStore()
  const [tab, setTab] = useState<Tab>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordChecks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
  const isSignupPasswordValid = Object.values(passwordChecks).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let data: AuthResponse

      if (tab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        })

        data = await res.json() as AuthResponse
        if (!res.ok) {
          setError(data.error ?? 'Something went wrong. Please try again.')
          return
        }
      } else {
        if (!isSignupPasswordValid) {
          setError('Password must meet all security requirements.')
          return
        }

        const signup = await signupWithUsernamePassword({
          username: username.trim(),
          password,
        })

        data = {
          token: signup.token,
          user: signup.user,
          error: signup.postgresCode
            ? `${signup.error} (Postgres: ${signup.postgresCode})`
            : signup.error,
        }
      }

      if (!data.token || !data.user) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      // Persist token and update Zustand store
      if (typeof window !== 'undefined') {
        localStorage.setItem('pibazaar-token', data.token)
        document.cookie = `pibazaar-token=${data.token}; path=/; max-age=3600; SameSite=Lax`
      }

      setCurrentUser({
        id: data.user.pi_uid,
        pi_uid: data.user.pi_uid,
        username: data.user.username,
        avatar_url: data.user.avatar_url ?? null,
        bio: null,
        created_at: new Date().toISOString(),
      })

      router.push('/profile')
    } catch (err) {
      console.error('[LoginPage] Auth error:', err)
      setError('Something went wrong. Please try again.')
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ backgroundColor: '#F0C040' }}>
            <span className="font-bold text-black text-2xl">π</span>
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F5F5', fontFamily: 'Sora, sans-serif' }}>
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
                onClick={() => { setTab(t); setError(null) }}
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
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#0A0A0F',
                  color: '#F5F5F5',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(240,192,64,0.5)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              />
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
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(240,192,64,0.5)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              />
              {tab === 'signup' && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: 'linear-gradient(135deg, #12121c 0%, #1a1a2e 100%)',
                    border: '1px solid rgba(240,192,64,0.25)',
                  }}
                >
                  {[
                    { key: 'minLength', label: 'Minimum 8 characters' },
                    { key: 'uppercase', label: 'At least 1 uppercase letter' },
                    { key: 'lowercase', label: 'At least 1 lowercase letter' },
                    { key: 'number', label: 'At least 1 number' },
                    { key: 'special', label: 'At least 1 special character' },
                  ].map((rule) => {
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
                className="p-3 rounded-xl text-sm"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5' }}
              >
                {error}
              </div>
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
                ? (tab === 'login' ? 'Signing in…' : 'Creating account…')
                : (tab === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>

        <p className="text-xs text-center" style={{ color: '#6B7280' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  )
}
