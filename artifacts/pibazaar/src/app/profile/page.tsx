/**
 * Profile — PiBazaar
 *
 * Reads the authenticated user from `useAuth()` and lets them edit
 * username / bio / avatar / country via `useUpdateProfile()` (then `refresh()`).
 * Pioneers without a linked Pi identity can link one in place. Shows the user's
 * reviews and their own listings.
 */

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useUpdateProfile, useUserReviews, useMyListings } from '@/lib/api/hooks'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import StarRating from '@/components/ui/StarRating'
import { ApiError } from '@/lib/api/client'
import type { Listing } from '@/lib/api/types'

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
      <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M4 6L5.5 7.5L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
      </svg>
      {label}
    </span>
  )
}

function ListingTile({ listing }: { listing: Listing }) {
  const image = listing.images[0]
  return (
    <Link
      href={`/products/${listing.id}`}
      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:opacity-90 transition-opacity"
    >
      <div className="relative w-full aspect-square overflow-hidden bg-muted">
        {image ? (
          <img src={image} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">π</div>
        )}
        {listing.status !== 'active' && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/80 text-muted-foreground uppercase">
            {listing.status}
          </span>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2 font-heading text-foreground">
          {listing.title}
        </h3>
        <p className="text-base font-bold text-primary">{listing.priceInPi.toFixed(2)} π</p>
      </div>
    </Link>
  )
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, loginWithPi, refresh, authError } = useAuth()
  const [, navigate] = useLocation()

  const updateProfile = useUpdateProfile()
  const reviewsQuery = useUserReviews(user?.id)
  const listingsQuery = useMyListings()

  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [country, setCountry] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  // Seed the edit form whenever we open it or the user changes.
  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setBio(user.bio ?? '')
      setAvatarUrl(user.avatarUrl ?? '')
      setCountry(user.country ?? '')
    }
  }, [user, editing])

  // ----- Loading session -----
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
          <Skeleton shape="circle" className="h-20 w-20 mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    )
  }

  // ----- Unauthenticated -----
  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <h1 className="text-2xl font-bold mb-6 font-heading text-foreground">Profile</h1>
          <Empty className="border border-border">
            <EmptyHeader>
              <div className="text-5xl text-primary mb-2" aria-hidden="true">π</div>
              <EmptyTitle>Sign in to view your profile</EmptyTitle>
              <EmptyDescription>
                Log in or create an account to manage your listings, reviews, and Pi identity.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => navigate('/login')} size="lg">Go to login</Button>
          </Empty>
        </div>
      </main>
    )
  }

  const handleSave = async () => {
    setSaveError(null)
    try {
      await updateProfile.mutateAsync({
        username: username.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
        country: country.trim(),
      })
      await refresh()
      setEditing(false)
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Could not save your profile. Please try again.',
      )
    }
  }

  const handleLinkPi = async () => {
    if (linking) return
    setLinking(true)
    try {
      await loginWithPi()
      await refresh()
    } catch {
      /* error surfaced via authError */
    } finally {
      setLinking(false)
    }
  }

  const reviews = reviewsQuery.data?.reviews ?? []
  const listings = listingsQuery.data?.listings ?? []

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">Profile</h1>

        {/* Profile card */}
        <section className="rounded-2xl border border-border bg-card p-5">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-foreground">Username</label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} disabled={updateProfile.isPending} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="avatarUrl" className="text-sm font-medium text-foreground">Avatar URL</label>
                <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" disabled={updateProfile.isPending} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="country" className="text-sm font-medium text-foreground">Country</label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" disabled={updateProfile.isPending} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="bio" className="text-sm font-medium text-foreground">Bio</label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} disabled={updateProfile.isPending} />
              </div>

              {saveError && (
                <p className="text-sm text-error" style={{ color: '#FCA5A5' }}>{saveError}</p>
              )}

              <div className="flex gap-3">
                <Button onClick={() => void handleSave()} loading={updateProfile.isPending} disabled={updateProfile.isPending}>
                  Save changes
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={updateProfile.isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
              <Avatar className="h-20 w-20">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.username} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 mt-3 sm:mt-0">
                <h2 className="text-xl font-bold font-heading text-foreground">@{user.username}</h2>
                {user.bio && <p className="text-sm text-muted-foreground mt-1">{user.bio}</p>}

                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-3">
                  {user.isVerified && <StatusBadge label="Pi Verified" />}
                  {user.isKycVerified && <StatusBadge label="KYC Verified" />}
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <StarRating score={user.trustScore} size={14} showScore />
                    <span className="text-muted-foreground">trust</span>
                  </div>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{user.totalSales}</span> sales
                  </span>
                  {user.country && <span className="text-muted-foreground">{user.country}</span>}
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Edit profile
                  </Button>
                  {!user.piUid && (
                    <Button size="sm" onClick={() => void handleLinkPi()} loading={linking} disabled={linking} className="gap-1.5">
                      <span aria-hidden="true">π</span> Link Pi account
                    </Button>
                  )}
                </div>

                {!user.piUid && authError && (
                  <p className="text-sm mt-2" style={{ color: '#FCA5A5' }}>{authError}</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* My listings */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold font-heading text-foreground">My listings</h2>
          {listingsQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} shape="card" className="aspect-square h-auto" />
              ))}
            </div>
          ) : listingsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Could not load your listings.</p>
          ) : listings.length === 0 ? (
            <Empty className="border border-border">
              <EmptyHeader>
                <EmptyTitle>No listings yet</EmptyTitle>
                <EmptyDescription>Create your first listing to start selling.</EmptyDescription>
              </EmptyHeader>
              <Button size="sm" onClick={() => navigate('/create')}>Create a listing</Button>
            </Empty>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {listings.map((listing) => (
                <ListingTile key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold font-heading text-foreground">Reviews</h2>
          {reviewsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reviewsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Could not load reviews.</p>
          ) : reviews.length === 0 ? (
            <Empty className="border border-border">
              <EmptyHeader>
                <EmptyTitle>No reviews yet</EmptyTitle>
                <EmptyDescription>Reviews from completed orders will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {review.reviewer?.avatarUrl ? (
                          <AvatarImage src={review.reviewer.avatarUrl} alt={review.reviewer.username} />
                        ) : null}
                        <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                          {(review.reviewer?.username ?? '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        @{review.reviewer?.username ?? 'pioneer'}
                      </span>
                    </div>
                    <StarRating score={review.rating} size={12} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
