'use client'

import Link from 'next/link'
import { useStore } from '@/store/useStore'
import { useUIStore } from '@/store/useUIStore'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/providers/PiAuthProvider'
import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
  const { currentUser, isAuthenticated } = useStore()
  const jurisdictionMode = useUIStore((s) => s.jurisdictionMode)
  const setJurisdictionMode = useUIStore((s) => s.setJurisdictionMode)
  const { isLoading } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary-bg/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2 max-w-6xl mx-auto">
        <Link href="/profile" className="flex items-center gap-1.5 min-w-0" aria-label="Go to profile">
          <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-black text-xs">π</span>
          </div>
          <span className="text-sm font-bold font-heading text-text-primary truncate">
            Pi Bazaar
          </span>
        </Link>

        {/* Jurisdiction toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setJurisdictionMode(jurisdictionMode === 'local' ? 'global' : 'local')}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all duration-200"
            style={{
              backgroundColor: jurisdictionMode === 'local'
                ? 'rgba(139, 92, 246, 0.15)'
                : 'rgba(240, 192, 64, 0.12)',
              color: jurisdictionMode === 'local' ? '#8B5CF6' : 'var(--color-gold)',
              border: `1px solid ${jurisdictionMode === 'local' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(240, 192, 64, 0.25)'}`,
            }}
            aria-label={`Switch to ${jurisdictionMode === 'local' ? 'global' : 'local'} marketplace`}
          >
            <span>{jurisdictionMode === 'local' ? '🇧🇸' : '🌐'}</span>
            <span>{jurisdictionMode === 'local' ? 'Local' : 'Global'}</span>
          </button>
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          {isLoading ? (
            <Skeleton shape="line" className="h-7 w-20 rounded-lg" />
          ) : isAuthenticated && currentUser ? (
            <Link href="/profile" className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center">
                <span className="font-bold text-black text-[10px]">
                  {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-medium text-text-primary hidden sm:inline max-w-[100px] truncate">
                {currentUser.username}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="Log in with Pi"
              className="inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-95 bg-gold text-black hover:opacity-90 px-2.5 py-1 text-xs rounded-md min-h-[32px]"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

