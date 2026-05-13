'use client'

import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import ErrorBoundary from '@/components/ErrorBoundary'
import VerifiedBadge from '@/components/VerifiedBadge'

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, isAuthenticated } = useStore()

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
        >
          Profile
        </h1>
        <ErrorBoundary>
          {isAuthenticated && currentUser ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: 'var(--color-card-bg)' }}
            >
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl overflow-hidden"
                style={{ backgroundColor: 'var(--color-secondary-bg)' }}
              >
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-2xl" style={{ color: 'var(--color-gold)' }}>
                    {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
              >
                @{currentUser.username}
              </h2>
              <div className="flex justify-center mb-2">
                <VerifiedBadge size="md" />
              </div>
              {currentUser.bio && (
                <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
                  {currentUser.bio}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div
                className="text-6xl mb-6"
                style={{ color: 'var(--color-gold)' }}
                aria-hidden="true"
              >
                π
              </div>
              <h2
                className="text-xl font-bold mb-3"
                style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
              >
                Sign in to view your profile
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-subtext)' }}>
                Use your email/password account to access your profile and orders.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="px-8 py-4 rounded-2xl font-bold text-lg"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                Sign In
              </button>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </main>
  )
}
