import { lazy, Suspense } from 'react'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'

const MapView = lazy(() => import('@/components/MapView'))

export default function MapPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ fontFamily: 'Sora, sans-serif', color: '#ffffff' }}
        >
          Nearby Listings
        </h1>
        <ErrorBoundary>
          <Suspense fallback={<div style={{height:"55vh", backgroundColor:"var(--color-card-bg)"}} className="rounded-2xl skeleton-shimmer"/>}><MapView /></Suspense>
        </ErrorBoundary>
      </div>
    </main>
  )
}
