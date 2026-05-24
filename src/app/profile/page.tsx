'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/store/useStore'
import { authenticateWithPiEdge, persistPiAuthSession } from '@/lib/pi-auth-client'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { isPiBrowserAvailable } from '@/lib/pi-sdk'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import VerifiedBadge from '@/components/VerifiedBadge'

export default function ProfilePage() {
  const { currentUser, isAuthenticated, setCurrentUser } = useStore()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const profileHydrated = useRef(false)

  useEffect(() => {
    const piUid = currentUser?.pi_uid
    if (!isAuthenticated || !piUid || profileHydrated.current) return
    profileHydrated.current = true
    void getSupabaseClient()
      .from('users')
      .select('username, avatar_url, bio, created_at')
      .eq('pi_uid', piUid)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setCurrentUser({
          id: piUid,
          pi_uid: piUid,
          username: data.username ?? 'Pioneer',
          avatar_url: data.avatar_url ?? null,
          bio: data.bio ?? null,
          created_at: data.created_at ?? new Date().toISOString(),
        })
      })
  }, [isAuthenticated, currentUser?.pi_uid, setCurrentUser])

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      if (!isPiBrowserAvailable()) {
        setError('Open in the Pi Browser to continue.')
        return
      }
      const result = await authenticateWithPiEdge()
      if (!result.ok) {
        setError(result.message)
        return
      }
      setCurrentUser(persistPiAuthSession(result.data))
    } catch {
      setError('Authentication failed. Try again.')
    } finally {
      setConnecting(false)
    }
  }

  const profile = currentUser

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#0A0A0F' }}>
      <div className="px-3 pt-4 pb-3 max-w-md mx-auto">
        <h1 className="text-lg font-bold mb-4 font-heading" style={{ color: '#F5F5F5' }}>
          Profile
        </h1>
        <ErrorBoundary>
          {connecting ? (
            <LoadingSkeleton rows={3} variant="rows" />
          ) : isAuthenticated && profile ? (
            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: '#12121c', border: '1px solid rgba(240,192,64,0.12)' }}
            >
              <div
                className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden text-xl font-bold"
                style={{ backgroundColor: '#F0C040', color: '#000' }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (profile.username ?? 'P').charAt(0).toUpperCase()
                )}
              </div>
              <h2 className="text-base font-bold mb-1" style={{ color: '#F5F5F5' }}>
                @{profile.username}
              </h2>
              <div className="flex justify-center mb-2">
                <VerifiedBadge size="md" />
              </div>
              {profile.bio && (
                <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                  {profile.bio}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl mb-3" style={{ color: '#F0C040' }} aria-hidden="true">
                π
              </div>
              <h2 className="text-sm font-bold mb-2" style={{ color: '#F5F5F5' }}>
                Sign in with Pi
              </h2>
              <p className="text-xs mb-4 px-4" style={{ color: '#9CA3AF' }}>
                Verify your Pioneer identity in the Pi Browser.
              </p>
              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={connecting}
                className="px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#F0C040', color: '#000' }}
              >
                {connecting ? 'Verifying…' : 'Log In with Pi'}
              </button>
              <p className="mt-3 text-[10px]" style={{ color: '#6B7280' }}>
                Or{' '}
                <Link href="/login" className="underline" style={{ color: '#F0C040' }}>
                  open sign-in page
                </Link>
              </p>
              {error && (
                <p className="mt-2 text-xs" style={{ color: '#EF4444' }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </main>
  )
}
