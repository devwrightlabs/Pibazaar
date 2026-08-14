

import { useState } from 'react'
import { useLocation } from 'wouter'

import type { Listing } from '@/lib/api/types'
import FavoriteButton from '@/components/marketplace/FavoriteButton'
import VerifiedBadge from '@/components/VerifiedBadge'
import TrustBadge from '@/components/marketplace/TrustBadge'
import BuyerProtectionBadge from '@/components/ui/BuyerProtectionBadge'
import StarRating from '@/components/ui/StarRating'

export type CardLayout = 'grid' | 'list' | 'swipe'

const CONDITION_LABELS: Record<Listing['condition'], string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

interface ProductCardProps {
  item: Listing
  layout?: CardLayout
}

export default function ProductCard({ item, layout = 'grid' }: ProductCardProps) {
  const [, navigate] = useLocation()
  const [imgError, setImgError] = useState(false)

  const imageUrl = item.images[0]
  const hasImage = Boolean(imageUrl) && !imgError
  const sellerInitial = item.sellerId.charAt(0).toUpperCase() || '?'
  const conditionLabel = item.condition ? CONDITION_LABELS[item.condition] : null
  const locationText = [item.city, item.country].filter(Boolean).join(', ')

  const handleOpen = () => {
    navigate(`/products/${item.id}`)
  }

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/checkout/${item.id}`)
  }

  // ----- SWIPE layout -----
  if (layout === 'swipe') {
    return (
      <div className="rounded-2xl border border-border bg-card-bg overflow-hidden flex flex-col">
        {/* Hero image */}
        <button onClick={handleOpen} className="relative w-full overflow-hidden aspect-[3/4] text-left">
          {hasImage ? (
            <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary-bg" />
          )}

          {/* Boosted badge */}
          {item.isBoosted && (
            <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full z-10 bg-gold text-black">
              BOOSTED
            </span>
          )}

          {/* Favorite button overlay (swipe) */}
          <div className="absolute top-3 right-3 z-20">
            <FavoriteButton listingId={item.id} size="md" />
          </div>

          {/* Floating pills — location + condition */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap z-10">
            {conditionLabel && (
              <span className="text-xs px-3 py-1 rounded-full backdrop-blur-md bg-backdrop text-text-primary">
                {conditionLabel}
              </span>
            )}
          </div>
        </button>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="text-xl font-bold line-clamp-2 font-heading text-text-primary">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-text-sub line-clamp-2">
              {item.description}
            </p>
          )}
          <p className="text-3xl font-bold text-gold">{item.priceInPi.toFixed(2)} π</p>

          {/* Seller row */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-gold text-black">
              {sellerInitial}
            </div>
            <span className="text-sm text-text-sub">{locationText}</span>
            <VerifiedBadge size="sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 pb-4">
          <button
            onClick={handleOpen}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 active:scale-95 bg-secondary-bg text-text-primary border border-border"
          >
            View Details
          </button>
          <button
            onClick={handleBuy}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 active:scale-95 bg-gold text-black"
          >
            Buy with π
          </button>
        </div>
      </div>
    )
  }

  // ----- LIST layout -----
  if (layout === 'list') {
    return (
      <div className="rounded-2xl border border-border bg-card-bg overflow-hidden flex flex-row">
        {/* Fixed image area */}
        <button onClick={handleOpen} className="relative w-32 shrink-0 overflow-hidden">
          <div className="w-32 h-full min-h-[5.5rem]">
            {hasImage ? (
              <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary-bg" />
            )}
            {/* Boosted badge */}
            {item.isBoosted && (
              <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-full z-10 bg-gold text-black">
                BOOSTED
              </span>
            )}
            {/* Favorite button overlay (list) */}
            <div className="absolute top-2 right-2 z-20">
              <FavoriteButton listingId={item.id} size="sm" />
            </div>
            {/* Floating pills */}
            <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap z-10">
              {conditionLabel && (
                <span className="text-xs px-1.5 py-0.5 rounded-full backdrop-blur-md bg-backdrop text-text-primary leading-tight">
                  {conditionLabel}
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Details */}
        <div className="flex flex-col justify-between p-3 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <button onClick={handleOpen} className="text-left flex-1">
              <h3 className="text-sm font-semibold line-clamp-2 font-heading text-text-primary">
                {item.title}
              </h3>
            </button>
            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-secondary-bg text-text-sub">
                {item.category}
              </span>
            )}
          </div>

          <p className="text-2xl font-bold text-gold mt-1">{item.priceInPi.toFixed(2)} π</p>

          <p className="text-xs text-text-sub">{locationText}</p>

          <VerifiedBadge size="sm" />

          {/* Actions */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleOpen}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95 bg-secondary-bg text-text-primary border border-border"
            >
              View Details
            </button>
            <button
              onClick={handleBuy}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 active:scale-95 bg-gold text-black"
            >
              Buy with π
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----- GRID layout (default) -----
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: item.isProSeller
          ? '2px solid var(--color-gold)'
          : '1px solid var(--color-border)',
        backgroundColor: 'var(--color-card-bg)',
      }}
    >
      {/* Square image */}
      <button onClick={handleOpen} className="relative w-full aspect-square overflow-hidden">
        {hasImage ? (
          <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-secondary-bg" />
        )}

        {/* Pro-Seller badge */}
        {item.isProSeller && (
          <div className="absolute top-2 left-2 z-10">
            <TrustBadge size="sm" />
          </div>
        )}

        {/* Boosted badge */}
        {item.isBoosted && !item.isProSeller && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full z-10 bg-gold text-black">
            BOOSTED
          </span>
        )}

        {/* Category badge + Favorite */}
        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
          {item.category && (
            <span className="text-xs px-2 py-0.5 rounded-full backdrop-blur-md bg-backdrop text-text-primary">
              {item.category}
            </span>
          )}
          <FavoriteButton listingId={item.id} size="sm" />
        </div>

        {/* Floating pills — condition */}
        <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap z-10">
          {conditionLabel && (
            <span className="text-xs px-2 py-0.5 rounded-full backdrop-blur-md bg-backdrop text-text-primary leading-tight">
              {conditionLabel}
            </span>
          )}
        </div>
      </button>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <button onClick={handleOpen} className="text-left">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 font-heading text-text-primary">
            {item.title}
          </h3>
        </button>

        <p className="font-bold text-lg text-gold">{item.priceInPi.toFixed(2)} π</p>

        <p className="text-xs text-text-sub">{locationText}</p>

        {/* Seller avatar */}
        <div className="flex items-center justify-between gap-1.5 mt-1">
          <StarRating score={4.0} size={10} />
          <div className="flex items-center gap-1.5">
            {item.isProSeller ? (
              <TrustBadge size="sm" />
            ) : (
              <VerifiedBadge size="sm" />
            )}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: 'var(--color-gold)',
                color: '#000',
              }}
            >
              {sellerInitial}
            </div>
          </div>
        </div>
        <div className="mt-1">
          <BuyerProtectionBadge tier="standard" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={handleOpen}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95 bg-secondary-bg text-text-primary border border-border"
        >
          View Details
        </button>
        <button
          onClick={handleBuy}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 active:scale-95 bg-gold text-black"
        >
          Buy with π
        </button>
      </div>
    </div>
  )
}
