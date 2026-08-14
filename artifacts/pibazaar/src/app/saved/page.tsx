/**
 * Saved / Wishlist page
 *
 * Shows the authenticated user's favorited listings. The list is fetched
 * server-side and scoped to the caller's user_id — no other user's favorites
 * are ever returned by the API.
 *
 * Unauthenticated users are shown a sign-in prompt.
 */
import { Link } from 'wouter'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useFavorites, useToggleFavorite } from '@/lib/api/hooks'
import { useStore } from '@/store/useStore'
import type { FavoriteEntry } from '@/lib/api/types'

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function FavSkeleton() {
  return (
    <div
      className="flex gap-3 p-3 rounded-2xl"
      style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="skeleton-shimmer w-20 h-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="skeleton-shimmer h-3 rounded w-4/5" />
        <div className="skeleton-shimmer h-3 rounded w-2/5" />
        <div className="skeleton-shimmer h-4 rounded w-1/4 mt-2" />
      </div>
    </div>
  )
}

// ─── Single favorite row ───────────────────────────────────────────────────────

function FavRow({ entry }: { entry: FavoriteEntry }) {
  const { mutate: toggle, isPending } = useToggleFavorite()
  const { listing } = entry

  return (
    <div
      className="flex gap-3 p-3 rounded-2xl"
      style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Thumbnail */}
      <Link href={`/products/${listing.id}`} className="shrink-0">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-20 h-20 object-cover rounded-xl"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: 'var(--color-surface)' }}
            aria-hidden="true"
          >
            🛍️
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${listing.id}`}>
          <p className="font-semibold text-sm text-text-primary line-clamp-2 leading-snug hover:text-gold transition-colors">
            {listing.title}
          </p>
        </Link>
        <p className="text-xs text-text-sub mt-1 capitalize">{listing.category}</p>
        <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-gold)' }}>
          π {listing.priceInPi.toFixed(2)}
        </p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => { if (!isPending) toggle(listing.id) }}
        disabled={isPending}
        aria-label="Remove from saved"
        className="shrink-0 self-start mt-1 p-1.5 rounded-full text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>
    </div>
  )
}

// ─── Page content ──────────────────────────────────────────────────────────────

function SavedContent() {
  const user = useStore((s) => s.currentUser)
  const { data, isLoading, isError, error } = useFavorites()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <span className="text-5xl mb-4" aria-hidden="true">🔒</span>
        <p className="font-semibold text-text-primary mb-2">Sign in to save listings</p>
        <p className="text-sm text-text-sub mb-6">
          Your saved listings are private and tied to your Pi account.
        </p>
        <Link
          href="/login"
          className="px-6 py-3 rounded-xl font-semibold text-sm text-black transition-all active:scale-95"
          style={{ backgroundColor: 'var(--color-gold)' }}
        >
          Sign in with Pi
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 px-4">
        {Array.from({ length: 4 }).map((_, i) => <FavSkeleton key={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="font-semibold text-text-primary mb-2">Failed to load saved listings</p>
        <p className="text-sm text-text-sub">
          {error instanceof Error ? error.message : 'Please try again.'}
        </p>
      </div>
    )
  }

  const entries = data?.favorites ?? []

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <span className="text-5xl mb-4" aria-hidden="true">🤍</span>
        <p className="font-semibold text-text-primary mb-2">No saved listings yet</p>
        <p className="text-sm text-text-sub mb-6">
          Tap the heart on any listing to save it here for later.
        </p>
        <Link
          href="/marketplace"
          className="px-6 py-3 rounded-xl font-semibold text-sm text-black transition-all active:scale-95"
          style={{ backgroundColor: 'var(--color-gold)' }}
        >
          Browse Marketplace
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-4">
      <p className="text-xs text-text-sub pb-1">
        {entries.length} saved listing{entries.length !== 1 ? 's' : ''}
      </p>
      {entries.map((entry) => (
        <FavRow key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

export default function SavedPage() {
  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-bg, #0A0A0F)' }}>
      <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary">Saved</h1>
        <p className="text-sm text-text-sub">Your wishlist, private to you</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <ErrorBoundary>
          <SavedContent />
        </ErrorBoundary>
      </div>
    </main>
  )
}
