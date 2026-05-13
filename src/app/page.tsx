'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { usePiAuth } from '@/components/providers/PiAuthProvider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import PullToRefresh from '@/components/marketplace/PullToRefresh'
import MapWrapper, { MapSkeleton } from '@/components/MapWrapper'
import MapModal from '@/components/MapModal'
import LeftSidebar from '@/components/layout/LeftSidebar'

/* ─── Unified feed skeleton ────────────────────────────────────────────── */

const SKELETON_GRID_COUNT = 6

function FeedSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 px-4">
      {/* Left column skeleton (listings) */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-1">
          <div className="skeleton-shimmer h-5 w-40 rounded" />
          <div className="skeleton-shimmer h-4 w-16 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: SKELETON_GRID_COUNT }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--color-card-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="skeleton-shimmer w-full aspect-square" />
              <div className="p-3 space-y-2">
                <div className="skeleton-shimmer h-3 rounded w-4/5" />
                <div className="skeleton-shimmer h-3 rounded w-3/5" />
                <div className="skeleton-shimmer h-4 rounded w-2/5" />
              </div>
              <div className="flex gap-2 px-3 pb-3">
                <div className="skeleton-shimmer h-8 rounded-lg flex-1" />
                <div className="skeleton-shimmer h-8 rounded-lg flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right column skeleton (map) */}
      <div className="hidden lg:block w-[380px] shrink-0">
        <MapSkeleton height="400px" />
      </div>
      {/* Mobile map skeleton */}
      <div className="lg:hidden">
        <MapSkeleton height="260px" />
      </div>
    </div>
  )
}

/* ─── Home Page ─────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { isAuthenticated, currentUser, mapRadius, setMapRadius } = useStore()
  const { handleLogin, loading: authLoading, error: authError } = usePiAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [discoveryView, setDiscoveryView] = useState<'list' | 'map'>('list')

  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshKey((k) => k + 1)
    await new Promise<void>((r) => setTimeout(r, 800))
  }, [])

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev)
  }

  return (
    <main className="min-h-screen min-w-[320px] bg-background">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* ── Hero section (unauthenticated only) ─────────────────────── */}
        {!isAuthenticated && (
          <section
            className="px-4 pt-10 pb-8 flex flex-col items-center text-center"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(240, 192, 64, 0.15)' }}
            >
              <span className="text-3xl font-bold" style={{ color: 'var(--color-gold)' }}>π</span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold font-heading mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              P2P Bazaar Marketplace
            </h1>
            <p className="text-sm sm:text-base mb-8 max-w-xs sm:max-w-sm" style={{ color: 'var(--color-subtext)' }}>
              Buy and sell locally with Pi — the decentralized marketplace built for Pioneers.
            </p>

            {/* Login / Sign Up buttons */}
            <div className="flex items-center gap-3 w-full max-w-xs">
              <button
                onClick={() => void handleLogin()}
                disabled={authLoading}
                className="flex-1 py-3 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-control-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {authLoading ? 'Loading…' : 'Login'}
              </button>
              <button
                onClick={() => void handleLogin()}
                disabled={authLoading}
                className="flex-1 py-3 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
              >
                {authLoading ? 'Loading…' : 'Sign Up'}
              </button>
            </div>

            {authError && (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-error)' }}>
                {authError}
              </p>
            )}
          </section>
        )}

        {/* ── Sticky header (when authenticated) ───────────────────────── */}
        {isAuthenticated && (
          <section
            className="sticky top-0 z-40 px-4 py-4"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              {/* Sidebar toggle */}
              <button
                onClick={handleSidebarToggle}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{ backgroundColor: 'var(--color-control-bg)' }}
                aria-label="Open menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold font-heading" style={{ color: 'var(--color-text)' }}>
                Trade with <span style={{ color: 'var(--color-gold)' }}>Pi</span>
              </h1>

              {/* User avatar */}
              {authLoading ? (
                <Skeleton shape="line" className="h-10 w-10 rounded-xl" />
              ) : currentUser ? (
                <button
                  onClick={handleSidebarToggle}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ backgroundColor: 'var(--color-gold)' }}
                >
                  <span className="font-bold text-black text-sm">
                    {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
                  </span>
                </button>
              ) : null}
            </div>
            <div className="mt-3 max-w-7xl mx-auto flex items-center gap-2">
              <button
                onClick={() => setDiscoveryView('list')}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{
                  color: discoveryView === 'list' ? 'var(--color-text)' : 'var(--color-subtext)',
                  backgroundColor: discoveryView === 'list' ? 'var(--color-secondary-bg)' : 'var(--color-control-bg)',
                }}
              >
                List
              </button>
              <button
                onClick={() => setDiscoveryView('map')}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{
                  color: discoveryView === 'map' ? 'var(--color-text)' : 'var(--color-subtext)',
                  backgroundColor: discoveryView === 'map' ? 'var(--color-secondary-bg)' : 'var(--color-control-bg)',
                }}
              >
                Map
              </button>
            </div>
          </section>
        )}

        {/* ── Main content ─────────────────────────────────────────────── */}
        {!pageReady ? (
          <FeedSkeleton />
        ) : discoveryView === 'map' ? (
          <div className="px-4 pb-24 max-w-7xl mx-auto">
            <div className="mb-3 mt-1 flex items-center justify-between">
              <label htmlFor="map-radius" className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Radius: {mapRadius} km
              </label>
              <button
                onClick={() => setMapModalOpen(true)}
                className="text-xs font-semibold"
                style={{ color: 'var(--color-gold)' }}
              >
                Full Screen
              </button>
            </div>
            <input
              id="map-radius"
              type="range"
              min={5}
              max={200}
              value={mapRadius}
              onChange={(event) => setMapRadius(Number(event.target.value))}
              className="mb-3 w-full"
            />
            <ErrorBoundary>
              <div className="rounded-2xl overflow-hidden">
                <MapWidget
                  isAuthenticated={isAuthenticated}
                  onLogin={() => void handleLogin()}
                  onExpand={() => setMapModalOpen(true)}
                  height="calc(100dvh - 300px)"
                  radius={mapRadius}
                />
              </div>
            </ErrorBoundary>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 px-4 pb-24 max-w-7xl mx-auto">
            {/* ── Left column: Listings ─────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {/* Trending section header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold font-heading" style={{ color: 'var(--color-text)' }}>
                  Trending Near You
                </h2>
                <span className="text-xs font-medium" style={{ color: 'var(--color-gold)' }}>
                  View All
                </span>
              </div>

              {/* Mobile map widget (above listings on small screens) */}
              <div className="lg:hidden mb-4">
                <MapWidget
                  isAuthenticated={isAuthenticated}
                  onLogin={() => void handleLogin()}
                  onExpand={() => setMapModalOpen(true)}
                  height="clamp(260px, 42dvh, 420px)"
                  radius={mapRadius}
                />
              </div>

              {/* Marketplace feed */}
              <ErrorBoundary>
                <MarketplaceFeed key={refreshKey} />
              </ErrorBoundary>
            </div>

            {/* ── Right column: Map widget (desktop) ───────────────────── */}
            <div className="hidden lg:block w-[380px] shrink-0">
              <div className="sticky top-20">
                <MapWidget
                  isAuthenticated={isAuthenticated}
                  onLogin={() => void handleLogin()}
                  onExpand={() => setMapModalOpen(true)}
                  height="400px"
                  radius={mapRadius}
                />
              </div>
            </div>
          </div>
        )}
      </PullToRefresh>

      {/* Left sidebar */}
      <ErrorBoundary>
        <LeftSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </ErrorBoundary>

      {/* Full-screen map modal */}
      <MapModal open={mapModalOpen} onClose={() => setMapModalOpen(false)} />
    </main>
  )
}

/* ─── Map Widget (shared between mobile + desktop) ─────────────────────── */

interface MapWidgetProps {
  isAuthenticated: boolean
  onLogin: () => void
  onExpand: () => void
  height: string
  radius: number
}

function MapWidget({ isAuthenticated, onLogin, onExpand, height, radius }: MapWidgetProps) {
  if (!isAuthenticated) {
    /* ── UNAUTHENTICATED: blurred overlay lock screen ─────────────── */
    return (
      <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
        {/* Blurred map behind */}
        <div className="absolute inset-0" style={{ filter: 'blur(6px)' }}>
          <ErrorBoundary>
            <MapWrapper height={height} radius={radius} />
          </ErrorBoundary>
        </div>

        {/* Lock overlay */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center px-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(240, 192, 64, 0.15)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
            Sign in to view Local Sellers
          </p>
          <Button size="sm" onClick={onLogin}>
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  /* ── AUTHENTICATED: fully unlocked map with expand button ─────────── */
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-subtext)' }}>
          Local Sellers
        </span>
        <button
          onClick={onExpand}
          className="flex items-center gap-1 text-xs font-semibold transition-colors"
          style={{ color: 'var(--color-gold)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Expand
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ height }}>
        <ErrorBoundary>
          <MapWrapper height={height} radius={radius} />
        </ErrorBoundary>
      </div>
    </div>
  )
}
