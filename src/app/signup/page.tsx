'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'

interface AuthApiResponse {
  session?: {
    access_token: string
    refresh_token: string
  }
  appToken?: string
  user?: {
    id: string
    username: string
  }
  error?: string
}

function AuthToast({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="fixed top-5 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-semibold"
      style={{
        backgroundColor: 'rgba(239,68,68,0.14)',
        borderColor: 'rgba(239,68,68,0.65)',
        color: '#FCA5A5',
      }}
    >
      {message}
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const { setCurrentUser } = useStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorToast(null)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = (await response.json().catch(() => ({}))) as AuthApiResponse

      if (!response.ok || !data.session || !data.user) {
        setErrorToast(data.error ?? 'Sign up failed. Please try again.')
        setLoading(false)
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        setErrorToast('Account created, but session setup failed. Please retry.')
        setLoading(false)
        return
      }

      if (typeof window !== 'undefined' && data.appToken) {
        localStorage.setItem('pibazaar-token', data.appToken)
      }

      setCurrentUser({
        id: data.user.id,
        pi_uid: data.user.id,
        username: data.user.username,
        avatar_url: null,
        bio: null,
        created_at: new Date().toISOString(),
      })

      router.replace('/profile')
    } catch {
      setErrorToast('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-8 flex items-center justify-center"
      style={{
        backgroundColor: '#0A0A0F',
        backgroundImage: 'linear-gradient(180deg, #12121c 0%, #1a1a2e 100%)',
      }}
    >
      {errorToast ? <AuthToast message={errorToast} /> : null}

      <section
        className="w-full max-w-md rounded-2xl border p-6 sm:p-8"
        style={{
          backgroundColor: 'rgba(10,10,15,0.92)',
          borderColor: 'rgba(240,192,64,0.28)',
        }}
      >
        <h1 className="text-3xl font-bold" style={{ color: '#F8F8F8' }}>
          Create account
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#C8C8C8' }}>
          Sign up with just a username and password.
        </p>

        <form className="mt-7 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block space-y-2">
            <span className="text-sm font-medium" style={{ color: '#F8F8F8' }}>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{
                color: '#F8F8F8',
                backgroundColor: '#12121c',
                borderColor: 'rgba(240,192,64,0.35)',
              }}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium" style={{ color: '#F8F8F8' }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{
                color: '#F8F8F8',
                backgroundColor: '#12121c',
                borderColor: 'rgba(240,192,64,0.35)',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 font-semibold text-black transition-opacity disabled:opacity-75"
            style={{ backgroundColor: '#F0C040' }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                Creating account...
              </span>
            ) : (
              'Sign up'
            )}
          </button>
        </form>

        <p className="mt-5 text-sm" style={{ color: '#C8C8C8' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#F0C040' }}>
            Login
          </Link>
        </p>
      </section>
    </main>
  )
}
