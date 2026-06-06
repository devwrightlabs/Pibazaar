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
import { Link, useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { piDebugAlert } from '@/lib/pi-sdk'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { loginWithPi, authError, isAuthenticated } = useAuth()
  const [piLoading, setPiLoading] = useState(false)

  // Already signed in → bounce home.
  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  const handlePiLogin = async () => {
    piDebugAlert('0/5 Button clicked')
    if (piLoading) {
      piDebugAlert('Ignored: a login attempt is already running')
      return
    }
    setPiLoading(true)
    try {
      await loginWithPi()
      navigate('/')
    } catch (err) {
      // The detailed message is already shown via authError; this alert is the
      // visual-debug catch-all for environments without a dev console.
      piDebugAlert(`Login failed: ${err instanceof Error ? err.message : String(err)}`)
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

          {/* Disabled state is tied ONLY to an in-flight login attempt — never to
              session-restore loading, so a stalled GET /auth/me can't leave the
              button permanently dead. */}
          <Button
            type="button"
            size="lg"
            onClick={() => void handlePiLogin()}
            loading={piLoading}
            disabled={piLoading}
            className="w-full gap-2"
          >
            <span aria-hidden="true">π</span>
            <span>{piLoading ? 'Connecting to Pi Browser…' : 'Login with Pi'}</span>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </main>
  )
}
