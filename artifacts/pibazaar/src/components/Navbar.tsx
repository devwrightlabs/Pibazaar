

import { useState } from 'react'
import { Link } from 'wouter'
import { useStore } from '@/store/useStore'
import { useUIStore } from '@/store/useUIStore'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/providers/PiAuthProvider'
import NotificationBell from '@/components/NotificationBell'
import ProfileDrawer from '@/components/ProfileDrawer'

export default function Navbar() {
  const { currentUser, isAuthenticated } = useStore()
  const jurisdictionMode = useUIStore((s) => s.jurisdictionMode)
  const setJurisdictionMode = useUIStore((s) => s.setJurisdictionMode)
  const { isLoading } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary-bg/60 backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo — links home */}
        <Link href="/" className="flex items-center gap-2" aria-label="Go home">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
            <span className="font-bold text-black text-sm">π</span>
          </div>
          <span className="text-lg font-bold font-heading text-text-primary">
            Pi Bazaar
          </span>
        </Link>

        {/* Jurisdiction toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setJurisdictionMode(jurisdictionMode === 'local' ? 'global' : 'local')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
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
        <div className="flex items-center gap-3">
          <NotificationBell />
          {isLoading ? (
            <Skeleton shape="line" className="h-9 w-28 rounded-xl" />
          ) : isAuthenticated && currentUser ? (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2"
              aria-label="Open profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center overflow-hidden">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-black text-xs">
                    {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-text-primary hidden sm:inline">
                {currentUser.username}
              </span>
            </button>
          ) : (
            <Link
              href="/login"
              aria-label="Sign in"
              className="inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-95 bg-gold text-black hover:opacity-90 px-3 py-1.5 text-sm rounded-lg"
              style={{ minHeight: '44px' }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  )
}
