'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { useUIStore } from '@/store/useUIStore'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'

export default function Navbar() {
  const router = useRouter()
  const { currentUser, isAuthenticated } = useStore()
  const jurisdictionMode = useUIStore((s) => s.jurisdictionMode)
  const setJurisdictionMode = useUIStore((s) => s.setJurisdictionMode)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary-bg/60 backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo — links to profile dashboard */}
        <Link href="/profile" className="flex items-center gap-2" aria-label="Go to profile">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
            <span className="font-bold text-black text-sm">π</span>
          </div>
          <span className="text-lg font-bold font-heading text-text-primary">
            P2P Bazaar Marketplace
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
          {isAuthenticated && currentUser ? (
            <Link href="/profile" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
                <span className="font-bold text-black text-xs">
                  {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-text-primary hidden sm:inline">
                {currentUser.username}
              </span>
            </Link>
          ) : (
            <Button size="sm" onClick={() => router.push('/login')} aria-label="Open login">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
