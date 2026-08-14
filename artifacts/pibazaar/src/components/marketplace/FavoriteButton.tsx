/**
 * FavoriteButton — heart/save toggle for a listing.
 *
 * Shows a filled heart when the listing is already in the user's favorites;
 * an outline heart otherwise. Requires the user to be authenticated.
 * Calls toggle on click and updates the query cache via onSuccess.
 */
import { useFavorites, useToggleFavorite } from '@/lib/api/hooks'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  listingId: string
  /** Optional extra class names */
  className?: string
  /** Size preset */
  size?: 'sm' | 'md'
}

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function FavoriteButton({
  listingId,
  className,
  size = 'md',
}: FavoriteButtonProps) {
  const user = useStore((s) => s.currentUser)
  const { data } = useFavorites()
  const { mutate: toggle, isPending } = useToggleFavorite()

  // Not authenticated → hide the button entirely.
  if (!user) return null

  const isFavorited =
    (data?.favorites ?? []).some((f) => f.listingId === listingId)

  const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-2'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isPending) toggle(listingId)
      }}
      aria-label={isFavorited ? 'Remove from saved' : 'Save listing'}
      aria-pressed={isFavorited}
      disabled={isPending}
      className={cn(
        'rounded-full transition-all active:scale-90 disabled:opacity-50',
        sizeClasses,
        isFavorited
          ? 'text-red-500'
          : 'text-text-sub hover:text-red-400',
        className,
      )}
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
    >
      <HeartIcon filled={isFavorited} />
    </button>
  )
}
