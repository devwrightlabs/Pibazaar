// Marketplace discovery hook — wraps the typed `useListings` React Query hook.
// Returns camelCase `Listing[]` from GET /listings with category filtering,
// keyword search, sort order, and limit-based infinite scroll via an
// IntersectionObserver sentinel.

import { useState, useRef, useCallback, useEffect } from 'react'
import { useListings } from '@/lib/api/hooks'
import type { Listing, ListingQuery } from '@/lib/api/types'

// Kept as an alias so existing feed components keep compiling.
export type RecommendedListing = Listing

export type SortOrder = 'recent' | 'price_asc' | 'price_desc'

const PAGE_SIZE = 20

export function useMarketplace(_initialListings: RecommendedListing[] = []) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const query: ListingQuery = {
    q: searchQuery.trim() || undefined,
    category: activeCategory === 'All' ? undefined : activeCategory,
    sort: sortOrder,
    limit,
    offset: 0,
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useListings(query)

  const listings = data?.listings ?? []
  const total = data?.total ?? 0
  const hasMore = listings.length < total

  const setCategory = useCallback((category: string) => {
    setActiveCategory(category)
    setLimit(PAGE_SIZE)
  }, [])

  const setQ = useCallback((q: string) => {
    setSearchQuery(q)
    setLimit(PAGE_SIZE)
  }, [])

  const setSort = useCallback((sort: SortOrder) => {
    setSortOrder(sort)
    setLimit(PAGE_SIZE)
  }, [])

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setLimit((l) => l + PAGE_SIZE)
  }, [hasMore, isFetching])

  // IntersectionObserver for infinite scroll.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  return {
    listings,
    loading: isLoading,
    loadingMore: isFetching && !isLoading,
    error: isError
      ? error instanceof Error
        ? error.message
        : 'Failed to load listings'
      : null,
    hasMore,
    activeCategory,
    setCategory,
    searchQuery,
    setQ,
    sortOrder,
    setSort,
    loadMore,
    sentinelRef,
    retry: () => {
      void refetch()
    },
    refresh: async () => {
      await refetch()
    },
  }
}
