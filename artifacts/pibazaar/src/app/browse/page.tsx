

import { useEffect, useMemo, useState } from 'react'
import { useSearch, useLocation } from 'wouter'

import { useListings } from '@/lib/api/hooks'
import type { ListingQuery, ListingCondition } from '@/lib/api/types'
import ProductCard from '@/components/marketplace/ProductCard'
import ProductCardSkeleton from '@/components/marketplace/ProductCardSkeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import ErrorBoundary from '@/components/ErrorBoundary'

const CATEGORIES = [
  'All',
  'Electronics',
  'Fashion',
  'Home',
  'Vehicles',
  'Sports',
  'Books',
  'Art',
  'Other',
]

const CONDITIONS: { label: string; value: '' | ListingCondition }[] = [
  { label: 'Any', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Like New', value: 'like_new' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
]

const SORTS: { label: string; value: NonNullable<ListingQuery['sort']> }[] = [
  { label: 'Most recent', value: 'recent' },
  { label: 'Price: low to high', value: 'price_asc' },
  { label: 'Price: high to low', value: 'price_desc' },
]

const SKELETON_COUNT = 8

function BrowseContent() {
  const searchString = useSearch()
  const [, navigate] = useLocation()

  const initialParams = useMemo(
    () => new URLSearchParams(searchString),
    [searchString],
  )

  const [searchInput, setSearchInput] = useState(initialParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(searchInput)
  const [category, setCategory] = useState(initialParams.get('category') ?? 'All')
  const [condition, setCondition] = useState<'' | ListingCondition>('')
  const [sort, setSort] = useState<NonNullable<ListingQuery['sort']>>('recent')

  // Debounce the search box (~350ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Keep the URL query string in sync with q/category.
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (category !== 'All') params.set('category', category)
    const qs = params.toString()
    navigate(`/browse${qs ? `?${qs}` : ''}`, { replace: true })
  }, [debouncedQuery, category, navigate])

  const query: ListingQuery = {
    q: debouncedQuery || undefined,
    category: category === 'All' ? undefined : category,
    condition: condition || undefined,
    sort,
    limit: 50,
    offset: 0,
  }

  const { data, isLoading, isError, error, refetch } = useListings(query)
  const listings = data?.listings ?? []

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold font-heading text-foreground mb-4">
          Browse
        </h1>

        {/* Search */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search listings…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4 bg-card text-foreground border border-border focus:border-primary"
        />

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground border border-border'
                }`}
              >
                {cat}
              </button>
            )
          })}
          <div className="flex-shrink-0 w-2" aria-hidden="true" />
        </div>

        {/* Condition pills + sort */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {CONDITIONS.map((c) => {
              const isActive = condition === c.value
              return (
                <button
                  key={c.label}
                  onClick={() => setCondition(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground border border-border'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NonNullable<ListingQuery['sort']>)}
            className="px-3 py-2 rounded-xl text-sm bg-card text-foreground border border-border outline-none"
            aria-label="Sort listings"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <Empty className="border border-border">
            <EmptyHeader>
              <EmptyTitle>Something went wrong</EmptyTitle>
              <EmptyDescription>
                {error instanceof Error ? error.message : 'Failed to load listings.'}
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => refetch()}>Try Again</Button>
          </Empty>
        ) : listings.length === 0 ? (
          <Empty className="border border-border">
            <EmptyHeader>
              <EmptyTitle>No listings found</EmptyTitle>
              <EmptyDescription>
                Try a different category, condition, or search term.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {listings.map((listing) => (
              <ProductCard key={listing.id} item={listing} layout="grid" />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function BrowsePage() {
  return (
    <ErrorBoundary>
      <BrowseContent />
    </ErrorBoundary>
  )
}
