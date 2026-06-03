import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useEscrows } from '@/lib/api/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import type { Escrow, EscrowStatus } from '@/lib/api/types'

type Tab = 'purchases' | 'sales'

const STATUS_META: Record<EscrowStatus, { label: string; color: string }> = {
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

function EscrowRow({ escrow }: { escrow: Escrow }) {
  const meta = STATUS_META[escrow.status]
  return (
    <Link href={`/orders/${escrow.id}`}>
      <div
        className="flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border-token)' }}
      >
        <div
          className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-xl"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          {escrow.releaseType === 'digital' ? '💾' : escrow.releaseType === 'local_meetup' ? '🤝' : '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            Order #{escrow.id.slice(0, 8)}
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-gold)' }}>
            {escrow.amountPi.toFixed(2)} π
          </p>
          <div className="flex items-center justify-between mt-2">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: meta.color, color: '#fff' }}
            >
              {meta.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>
              {new Date(escrow.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function OrdersPage() {
  const { isAuthenticated } = useAuth()
  const [, navigate] = useLocation()
  const [tab, setTab] = useState<Tab>('purchases')

  const buyerQuery = useEscrows('buyer')
  const sellerQuery = useEscrows('seller')
  const active = tab === 'purchases' ? buyerQuery : sellerQuery
  const escrows = active.data?.escrows ?? []

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          Orders
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['purchases', 'sales'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2 rounded-full text-sm font-medium capitalize transition-colors"
              style={{
                backgroundColor: tab === t ? 'var(--color-gold)' : 'var(--color-card-bg)',
                color: tab === t ? '#000' : 'var(--color-text)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {!isAuthenticated ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>🔒</EmptyMedia>
              <EmptyTitle>Sign in required</EmptyTitle>
              <EmptyDescription>Log in to view your orders.</EmptyDescription>
            </EmptyHeader>
            <Button variant="default" onClick={() => navigate('/login')}>
              Log In
            </Button>
          </Empty>
        ) : active.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : active.isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>⚠️</EmptyMedia>
              <EmptyTitle>Something went wrong</EmptyTitle>
              <EmptyDescription>We couldn’t load your orders.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => active.refetch()}>
              Try Again
            </Button>
          </Empty>
        ) : escrows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>📦</EmptyMedia>
              <EmptyTitle>No orders yet</EmptyTitle>
              <EmptyDescription>
                {tab === 'purchases'
                  ? 'Browse listings to get started.'
                  : 'Your sales will appear here when buyers purchase your listings.'}
              </EmptyDescription>
            </EmptyHeader>
            {tab === 'purchases' && (
              <Button variant="default" onClick={() => navigate('/browse')}>
                Browse Listings
              </Button>
            )}
          </Empty>
        ) : (
          <div className="space-y-3">
            {escrows.map((escrow) => (
              <EscrowRow key={escrow.id} escrow={escrow} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
