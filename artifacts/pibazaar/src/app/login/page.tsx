/**
 * Login — PiBazaar
 *
 * Single-step authentication: one "Login with Pi" button that runs the Pi SDK
 * (`username` scope) via the shared auth provider. The provider awaits Pi.init()
 * fully before authenticating, sends the access token to the backend, and the
 * backend validates it via GET https://api.minepi.com/v2/me (Bearer, no API key)
 * before issuing our JWT session. Auth also auto-triggers on load inside the Pi
 * Browser; this page is the manual entry point and the redirect target.
 */

import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { loginWithPi, authError, isAuthenticated, isLoading } = useAuth()
  const [piLoading, setPiLoading] = useState(false)

  // Already signed in → bounce home.
  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  const handlePiLogin = async () => {
    if (piLoading) return
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
      <div className="w-full max-w-xs space-y-6">
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
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Sign in with your Pi account to start buying and selling.
          </p>

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

          <Button
            type="button"
            size="lg"
            onClick={() => void handlePiLogin()}
            loading={piLoading || isLoading}
            disabled={piLoading || isLoading}
            className="w-full gap-2"
          >
            <span aria-hidden="true">π</span>
            <span>{piLoading ? 'Connecting to Pi Browser…' : 'Login with Pi'}</span>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  )
}
