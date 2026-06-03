/**
 * Login — PiBazaar
 *
 * Two-step auth UI against the Express backend (`/api/auth/*`):
 *   1. Manual Sign Up / Log In (username + password only).
 *   2. Optional "Log in with Pi" via the Pi SDK.
 *
 * All flows issue/persist our JWT through the shared auth provider. On success
 * we navigate to the home feed and surface any auth error inline.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { signup, login, loginWithPi, authError, clearError, isAuthenticated } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [piLoading, setPiLoading] = useState(false)

  // Already signed in → bounce home.
  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  // Reset the error whenever the user switches tabs.
  useEffect(() => {
    clearError()
  }, [mode, clearError])

  const busy = submitting || piLoading

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signup({
          username: username.trim(),
          password,
        })
      } else {
        await login({ username: username.trim(), password })
      }
      navigate('/')
    } catch {
      /* error surfaced via authError */
    } finally {
      setSubmitting(false)
    }
  }

  const handlePiLogin = async () => {
    if (busy) return
    setPiLoading(true)
    try {
      await loginWithPi()
      navigate('/')
    } catch {
      /* error surfaced via authError */
    } finally {
      setPiLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-primary">
            <span className="font-bold text-primary-foreground text-xl">π</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 font-heading text-foreground">PiBazaar</h1>
          <p className="text-sm text-muted-foreground">
            The decentralized marketplace for Pioneers.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="pioneer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                disabled={busy}
              />
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-xl text-sm border"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderColor: 'rgba(239,68,68,0.4)',
                  color: '#FCA5A5',
                }}
              >
                {authError}
              </div>
            )}

            <Button type="submit" size="lg" loading={submitting} disabled={busy} className="w-full">
              {mode === 'signup' ? 'Create account' : 'Log in'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Pi login */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => void handlePiLogin()}
            loading={piLoading}
            disabled={busy}
            className="w-full gap-2"
          >
            <span aria-hidden="true">π</span>
            <span>{piLoading ? 'Connecting to Pi Browser…' : 'Log in with Pi'}</span>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  )
}
