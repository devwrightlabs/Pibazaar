

import { useState } from 'react'
import { useParams, useLocation } from 'wouter'

import { useListing, useStartConversation } from '@/lib/api/hooks'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import ErrorBoundary from '@/components/ErrorBoundary'
import TrustBadge from '@/components/marketplace/TrustBadge'
import VerifiedBadge from '@/components/VerifiedBadge'
import type { ListingCondition } from '@/lib/api/types'

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

function ProductDetailContent({ productId }: { productId: string }) {
  const [, navigate] = useLocation()
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch } = useListing(productId)
  const startConversation = useStartConversation()

  const [activeImage, setActiveImage] = useState(0)
  const [imgError, setImgError] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messageError, setMessageError] = useState<string | null>(null)

  // Loading skeleton
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="px-4 pt-6 max-w-2xl mx-auto space-y-4">
          <Skeleton shape="card" className="h-72 w-full rounded-2xl" />
          <Skeleton shape="line" className="h-6 w-3/4" />
          <Skeleton shape="line" className="h-8 w-1/3" />
          <Skeleton shape="line" className="h-4 w-full" />
          <Skeleton shape="line" className="h-4 w-5/6" />
          <Skeleton shape="card" className="h-24 w-full rounded-xl" />
        </div>
      </main>
    )
  }

  // Error / not found
  if (isError || !data) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="font-semibold mb-2 text-foreground">
            {error instanceof Error ? error.message : 'Product not found'}
          </p>
          <p className="text-sm mb-4 text-muted-foreground">
            This listing may have been removed or is no longer available.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
            <Button onClick={() => navigate('/browse')}>Browse</Button>
          </div>
        </div>
      </main>
    )
  }

  const { listing, seller } = data
  const images = listing.images ?? []
  const currentImage = images[activeImage]
  const hasImage = Boolean(currentImage) && !imgError
  const conditionLabel = listing.condition ? CONDITION_LABELS[listing.condition] : null
  const isOwnListing = user?.id === listing.sellerId

  const handleSendMessage = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!messageText.trim()) return
    setMessageError(null)
    try {
      const res = await startConversation.mutateAsync({
        recipientId: listing.sellerId,
        listingId: listing.id,
        content: messageText.trim(),
      })
      navigate(`/chat/${res.conversationId}`)
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Could not send message.')
    }
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-xl text-primary"
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="text-xl font-bold font-heading flex-1 text-foreground">
            Product Detail
          </h1>
        </div>

        {/* Image gallery */}
        <div
          className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card"
        >
          {hasImage ? (
            <img
              src={currentImage}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-muted">
              📦
            </div>
          )}
          {listing.isProSeller && (
            <div className="absolute top-3 left-3 z-10">
              <TrustBadge size="md" />
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={img + idx}
                onClick={() => {
                  setActiveImage(idx)
                  setImgError(false)
                }}
                className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                  idx === activeImage ? 'border-primary' : 'border-border'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading text-foreground">
            {listing.title}
          </h2>
          <p className="text-3xl font-bold text-primary">
            {listing.priceInPi.toFixed(2)} π
          </p>
        </div>

        {/* Details */}
        <div className="rounded-xl p-4 space-y-3 bg-card border border-border">
          {listing.description && (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {listing.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {listing.category && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-foreground">
                {listing.category}
              </span>
            )}
            {conditionLabel && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-foreground">
                {conditionLabel}
              </span>
            )}
            {listing.productType && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize bg-muted text-foreground">
                {listing.productType}
              </span>
            )}
          </div>
          {(listing.city || listing.country) && (
            <p className="text-xs text-muted-foreground">
              📍 {[listing.city, listing.country].filter(Boolean).join(', ')}
              {listing.originCountry ? ` · Origin: ${listing.originCountry}` : ''}
            </p>
          )}
        </div>

        {/* Seller card */}
        {seller && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="font-semibold text-sm mb-3 font-heading text-foreground">
              Seller
            </h3>
            <button
              onClick={() => navigate(`/profile`)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-primary text-primary-foreground font-bold">
                {seller.avatarUrl ? (
                  <img src={seller.avatarUrl} alt={seller.username} className="w-full h-full object-cover" />
                ) : (
                  seller.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground truncate">
                    {seller.username}
                  </span>
                  {seller.isVerified && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trust score {seller.trustScore.toFixed(1)} · {seller.totalSales} sales
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Actions */}
        {!isOwnListing && (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full rounded-xl"
              onClick={() => navigate(`/checkout/${listing.id}`)}
            >
              Buy with {listing.priceInPi.toFixed(2)} π
            </Button>

            {!messageOpen ? (
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl"
                onClick={() => {
                  if (!user) {
                    navigate('/login')
                    return
                  }
                  setMessageOpen(true)
                }}
              >
                💬 Message Seller
              </Button>
            ) : (
              <div className="rounded-xl p-4 bg-card border border-border space-y-3">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a message to the seller…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-background text-foreground border border-border focus:border-primary resize-none"
                />
                {messageError && (
                  <p className="text-xs text-destructive">{messageError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setMessageOpen(false)}
                    disabled={startConversation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => void handleSendMessage()}
                    disabled={startConversation.isPending || !messageText.trim()}
                  >
                    {startConversation.isPending ? <Spinner /> : 'Send'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isOwnListing && (
          <div className="rounded-xl p-4 bg-card border border-border text-center">
            <p className="text-sm text-muted-foreground">
              This is your listing. Manage it from your{' '}
              <button
                onClick={() => navigate('/dashboard')}
                className="text-primary font-semibold underline"
              >
                dashboard
              </button>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>()
  if (!productId) return <Skeleton shape="card" className="m-4" />
  return (
    <ErrorBoundary>
      <ProductDetailContent productId={productId} />
    </ErrorBoundary>
  )
}
