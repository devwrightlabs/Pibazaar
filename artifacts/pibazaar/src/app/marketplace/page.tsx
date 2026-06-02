import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Listing, MatchScore } from '@/lib/types'
import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import ProductCardSkeleton from '@/components/marketplace/ProductCardSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import type { RecommendedListing } from '@/hooks/useMarketplace'

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

function FeedWithData() {
  const [initialListings, setInitialListings] = useState<RecommendedListing[] | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitialListings([])
      return
    }
    supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('is_boosted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error('[marketplace] Supabase query error:', error)
          setInitialListings([])
          return
        }
        const listings = ((data ?? []) as Listing[]).map((listing) => ({
          ...listing,
          match_score: {
            listing_id: listing.id,
            score: 0,
            distance_km: null,
            category_match: false,
            is_boosted: listing.is_boosted,
          } satisfies MatchScore,
        }))
        setInitialListings(listings)
      })
      .then(undefined, (err: unknown) => {
        console.error('[marketplace] Unexpected error fetching listings:', err)
        setInitialListings([])
      })
  }, [])

  if (initialListings === null) return <SkeletonGrid />
  return <MarketplaceFeed initialListings={initialListings} />
}

export default function MarketplacePage() {
  return (
    <main className="min-h-screen px-4 pt-6 pb-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
        >
          Marketplace
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
          Find listings near you
        </p>
      </div>

      <ErrorBoundary>
        <FeedWithData />
      </ErrorBoundary>
    </main>
  )
}
