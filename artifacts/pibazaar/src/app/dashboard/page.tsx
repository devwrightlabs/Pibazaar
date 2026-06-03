import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import {
  useDashboard,
  useMyListings,
  useUpdateListing,
  useDeleteListing,
  useEscrows,
} from '@/lib/api/hooks'
import { useStore } from '@/store/useStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import type { Listing, Escrow, EscrowStatus } from '@/lib/api/types'

type Tab = 'listings' | 'orders'

const ESCROW_META: Record<EscrowStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'var(--color-gold)' },
  funded: { label: 'Funded', color: '#3B82F6' },
  shipped: { label: 'Shipped', color: '#8B5CF6' },
  delivered: { label: 'Delivered', color: '#14B8A6' },
  released: { label: 'Released', color: 'var(--color-success)' },
  completed: { label: 'Completed', color: 'var(--color-success)' },
  auto_released: { label: 'Auto-Released', color: 'var(--color-success)' },
  disputed: { label: 'Disputed', color: 'var(--color-error)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-subtext)' },
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function BentoCard({
  label,
  value,
  icon,
  accent,
  className = '',
}: {
  label: string
  value: string | number
  icon: string
  accent: string
  className?: string
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col justify-between min-h-[100px] ${className}`}
      style={{ backgroundColor: 'var(--color-card-bg)', border: `1px solid ${accent}25` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}

// ─── Listing management row ───────────────────────────────────────────────────

function ListingRow({ listing }: { listing: Listing }) {
  const [, navigate] = useLocation()
  const { openModal } = useStore()
  const updateListing = useUpdateListing()
  const deleteListing = useDeleteListing()

  const isActive = listing.status === 'active'
  const busy = updateListing.isPending || deleteListing.isPending

  const toggleActive = () => {
    updateListing.mutate(
      { id: listing.id, body: { status: isActive ? 'removed' : 'active' } },
      {
        onError: () =>
          openModal({ title: 'Error', message: 'Could not update listing status.', variant: 'alert' }),
      },
    )
  }

  const remove = () => {
    deleteListing.mutate(listing.id, {
      onError: () => openModal({ title: 'Error', message: 'Could not delete listing.', variant: 'alert' }),
    })
  }

  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border-token)' }}
    >
      <button
        onClick={() => navigate(`/product/${listing.id}`)}
        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        {listing.images[0] ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-xl">📦</span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
          {listing.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-gold)' }}>
          {listing.priceInPi.toFixed(2)} π
        </p>
        <span
          className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
          style={{
            backgroundColor: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(136,136,136,0.15)',
            color: isActive ? 'var(--color-success)' : 'var(--color-subtext)',
          }}
        >
          {listing.status}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <Button variant="outline" size="sm" loading={updateListing.isPending} disabled={busy} onClick={toggleActive}>
          {isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button variant="ghost" size="sm" loading={deleteListing.isPending} disabled={busy} onClick={remove}>
          Delete
        </Button>
      </div>
    </div>
  )
}

// ─── Seller order row ─────────────────────────────────────────────────────────

function OrderRow({ escrow }: { escrow: Escrow }) {
  const meta = ESCROW_META[escrow.status]
  return (
    <Link href={`/orders/${escrow.id}`}>
      <div
        className="rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border-token)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Order #{escrow.id.slice(0, 8)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtext)' }}>
            {new Date(escrow.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: 'var(--color-gold)' }}>
            {escrow.amountPi.toFixed(2)} π
          </p>
          <span
            className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ backgroundColor: meta.color, color: '#fff' }}
          >
            {meta.label}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton shape="circle" className="w-16 h-16" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="line" className="h-5 w-32" />
          <Skeleton shape="line" className="h-3 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton shape="card" className="h-28 rounded-xl" />
        <Skeleton shape="card" className="h-28 rounded-xl" />
        <Skeleton shape="card" className="h-28 rounded-xl col-span-2" />
      </div>
      <div className="space-y-3">
        <Skeleton shape="card" className="h-20 rounded-xl" />
        <Skeleton shape="card" className="h-20 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [, navigate] = useLocation()
  const [tab, setTab] = useState<Tab>('listings')

  const dashboard = useDashboard()
  const listingsQuery = useMyListings()
  const ordersQuery = useEscrows('seller')

  if (authLoading) {
    return (
      <main className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-bg)' }}>
        <DashboardSkeleton />
      </main>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>🔒</EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>Log in to view your seller dashboard.</EmptyDescription>
          </EmptyHeader>
          <Button variant="default" onClick={() => navigate('/login')}>
            Log In
          </Button>
        </Empty>
      </main>
    )
  }

  const summary = dashboard.data
  const listings = listingsQuery.data?.listings ?? []
  const orders = ordersQuery.data?.escrows ?? []

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="px-4 pt-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
            style={{ backgroundColor: 'var(--color-card-bg)' }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <span>{user.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text)' }}>
              {user.username}
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              Member since{' '}
              {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/create')}>
            + New Listing
          </Button>
        </div>

        {/* Stats */}
        {dashboard.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton shape="card" className="h-28 rounded-xl" />
            <Skeleton shape="card" className="h-28 rounded-xl" />
            <Skeleton shape="card" className="h-28 rounded-xl col-span-2" />
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-3">
            <BentoCard label="Revenue" value={`${summary.revenuePi.toFixed(2)} π`} icon="💰" accent="#F0C040" />
            <BentoCard label="Sales" value={summary.sales} icon="🛍️" accent="#8B5CF6" />
            <BentoCard label="Active Listings" value={summary.activeListings} icon="🏪" accent="#14B8A6" />
            <BentoCard label="Active Escrows" value={summary.activeEscrows} icon="🔒" accent="#3B82F6" />
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2">
          {(
            [
              { key: 'listings', label: 'Listings' },
              { key: 'orders', label: 'Orders' },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === t.key ? 'var(--color-gold)' : 'var(--color-card-bg)',
                color: tab === t.key ? '#000' : 'var(--color-text)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Listings tab */}
        {tab === 'listings' &&
          (listingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} shape="card" className="h-20 rounded-xl" />
              ))}
            </div>
          ) : listingsQuery.isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>⚠️</EmptyMedia>
                <EmptyTitle>Could not load listings</EmptyTitle>
                <EmptyDescription>Please try again.</EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => listingsQuery.refetch()}>
                Try Again
              </Button>
            </Empty>
          ) : listings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>🏪</EmptyMedia>
                <EmptyTitle>No listings yet</EmptyTitle>
                <EmptyDescription>Create your first listing to start selling.</EmptyDescription>
              </EmptyHeader>
              <Button variant="default" onClick={() => navigate('/create')}>
                Create a Listing
              </Button>
            </Empty>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </div>
          ))}

        {/* Orders tab */}
        {tab === 'orders' &&
          (ordersQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} shape="card" className="h-20 rounded-xl" />
              ))}
            </div>
          ) : ordersQuery.isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>⚠️</EmptyMedia>
                <EmptyTitle>Could not load orders</EmptyTitle>
                <EmptyDescription>Please try again.</EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => ordersQuery.refetch()}>
                Try Again
              </Button>
            </Empty>
          ) : orders.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>📋</EmptyMedia>
                <EmptyTitle>No orders yet</EmptyTitle>
                <EmptyDescription>Your sales will appear here when buyers purchase your listings.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {orders.map((escrow) => (
                <OrderRow key={escrow.id} escrow={escrow} />
              ))}
            </div>
          ))}
      </div>
    </main>
  )
}
