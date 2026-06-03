import { useState } from 'react'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useEscrow, useEscrowAction, useCreateReview } from '@/lib/api/hooks'
import { escrowApi, ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import StarRating from '@/components/ui/StarRating'
import type { Escrow, EscrowStatus, ReleaseType } from '@/lib/api/types'

/**
 * OrderTracker — Visual escrow timeline + role-based lifecycle actions.
 *
 * Drives entirely off the new escrow lifecycle:
 *   pending → funded → shipped → delivered → released / completed / auto_released
 *   (plus disputed, cancelled).
 *
 * Fetches the escrow via React Query (`useEscrow`) and performs lifecycle
 * actions via `useEscrowAction` wrapping the typed `escrowApi`. The buyer can
 * leave a review once the escrow is released.
 */

interface OrderTrackerProps {
  escrowId: string
  onBack?: () => void
}

const STATUS_META: Record<EscrowStatus, { label: string; color: string }> = {
  pending: { label: 'Pending Payment', color: 'var(--color-gold)' },
  funded: { label: 'Funded in Escrow', color: '#3B82F6' },
  shipped: { label: 'Shipped', color: '#8B5CF6' },
  delivered: { label: 'Delivered', color: '#14B8A6' },
  released: { label: 'Released', color: 'var(--color-success)' },
  completed: { label: 'Completed', color: 'var(--color-success)' },
  auto_released: { label: 'Auto-Released', color: 'var(--color-success)' },
  disputed: { label: 'Disputed', color: 'var(--color-error)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-subtext)' },
}

const RANK_ORDER: EscrowStatus[] = ['pending', 'funded', 'shipped', 'delivered', 'released']

function rank(status: EscrowStatus): number {
  if (status === 'completed' || status === 'auto_released') return 4
  const i = RANK_ORDER.indexOf(status)
  return i < 0 ? 0 : i
}

function stepsFor(releaseType: ReleaseType): { key: EscrowStatus; label: string }[] {
  if (releaseType === 'shipping') {
    return [
      { key: 'pending', label: 'Order Placed' },
      { key: 'funded', label: 'Funded in Escrow' },
      { key: 'shipped', label: 'Shipped' },
      { key: 'delivered', label: 'Delivered' },
      { key: 'released', label: 'Completed' },
    ]
  }
  return [
    { key: 'pending', label: 'Order Placed' },
    { key: 'funded', label: 'Funded in Escrow' },
    { key: 'released', label: 'Completed' },
  ]
}

function StatusBadge({ status }: { status: EscrowStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: meta.color, color: '#fff' }}
    >
      {meta.label}
    </span>
  )
}

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export default function OrderTracker({ escrowId, onBack }: OrderTrackerProps) {
  const { user } = useAuth()
  const { data, isLoading, isError } = useEscrow(escrowId)
  const escrow = data?.escrow

  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [meetupCode, setMeetupCode] = useState('')
  const [revealedCode, setRevealedCode] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewDone, setReviewDone] = useState(false)

  const shipMut = useEscrowAction((args: { trackingNumber?: string; carrier?: string }) =>
    escrowApi.ship(escrowId, args),
  )
  const deliverMut = useEscrowAction(() => escrowApi.deliver(escrowId))
  const confirmMut = useEscrowAction(() => escrowApi.confirm(escrowId))
  const disputeMut = useEscrowAction((reason: string) => escrowApi.dispute(escrowId, reason))
  const cancelMut = useEscrowAction(() => escrowApi.cancel(escrowId))
  const meetupReleaseMut = useEscrowAction((code: string) => escrowApi.meetupRelease(escrowId, code))
  const milestoneMut = useEscrowAction((milestoneId: string) =>
    escrowApi.releaseMilestone(escrowId, milestoneId),
  )
  const reviewMut = useCreateReview()

  const flash = (message: string, variant: 'success' | 'error') => {
    setToast({ message, variant })
    setTimeout(() => setToast(null), 4000)
  }

  const onErr = (fallback: string) => (err: unknown) => flash(errMsg(err, fallback), 'error')

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen min-w-[320px] px-4 pt-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton shape="card" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    )
  }

  /* ── Not found / error ───────────────────────────────────────────────── */
  if (isError || !escrow) {
    return (
      <div
        className="min-h-screen min-w-[320px] flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <p className="text-4xl mb-4">📦</p>
        <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Order not found
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--color-subtext)' }}>
          This order may have been removed or the link is invalid.
        </p>
        {onBack && (
          <Button variant="default" onClick={onBack}>
            Go Back
          </Button>
        )}
      </div>
    )
  }

  const e: Escrow = escrow
  const status = e.status
  const isBuyer = user?.id === e.buyerId
  const isSeller = user?.id === e.sellerId
  const isShipping = e.releaseType === 'shipping'
  const isMeetup = e.releaseType === 'local_meetup'
  const isDigital = e.releaseType === 'digital'

  const canCancel = (isBuyer || isSeller) && status === 'pending'
  const canShip = isSeller && isShipping && status === 'funded'
  const canDeliver = isSeller && isShipping && status === 'shipped'
  const canConfirm = isBuyer && (isShipping ? ['shipped', 'delivered'].includes(status) : status === 'funded')
  const canDispute = (isBuyer || isSeller) && ['funded', 'shipped', 'delivered'].includes(status)
  const canReview = isBuyer && ['released', 'completed', 'auto_released'].includes(status)
  const meetupActive = isMeetup && status === 'funded'

  const steps = stepsFor(e.releaseType)
  const currentRank = rank(status)
  const anyActionPending =
    shipMut.isPending ||
    deliverMut.isPending ||
    confirmMut.isPending ||
    disputeMut.isPending ||
    cancelMut.isPending ||
    meetupReleaseMut.isPending ||
    milestoneMut.isPending

  const handleConfirm = () => {
    confirmMut.mutate(undefined, {
      onSuccess: () => flash('Receipt confirmed — Pi released to the seller!', 'success'),
      onError: onErr('Failed to confirm receipt.'),
    })
  }

  const handleShip = () => {
    shipMut.mutate(
      { trackingNumber: trackingNumber.trim() || undefined, carrier: carrier.trim() || undefined },
      {
        onSuccess: () => flash('Marked as shipped.', 'success'),
        onError: onErr('Failed to mark as shipped.'),
      },
    )
  }

  const handleDeliver = () => {
    deliverMut.mutate(undefined, {
      onSuccess: () => flash('Marked as delivered.', 'success'),
      onError: onErr('Failed to mark as delivered.'),
    })
  }

  const handleCancel = () => {
    cancelMut.mutate(undefined, {
      onSuccess: () => flash('Order cancelled.', 'success'),
      onError: onErr('Failed to cancel order.'),
    })
  }

  const handleDispute = () => {
    if (!disputeReason.trim()) {
      flash('Please describe the issue.', 'error')
      return
    }
    disputeMut.mutate(disputeReason.trim(), {
      onSuccess: () => {
        setShowDispute(false)
        setDisputeReason('')
        flash('Dispute opened. Our team will review it.', 'success')
      },
      onError: onErr('Failed to open dispute.'),
    })
  }

  const handleRevealCode = () => {
    escrowApi
      .meetupCode(escrowId)
      .then((res) => setRevealedCode(res.code))
      .catch(onErr('Failed to load meetup code.'))
  }

  const handleMeetupRelease = () => {
    if (!meetupCode.trim()) {
      flash('Enter the buyer’s meetup code.', 'error')
      return
    }
    meetupReleaseMut.mutate(meetupCode.trim(), {
      onSuccess: () => {
        setMeetupCode('')
        flash('Meetup confirmed — Pi released!', 'success')
      },
      onError: onErr('Invalid or expired meetup code.'),
    })
  }

  const handleReleaseMilestone = (milestoneId: string) => {
    milestoneMut.mutate(milestoneId, {
      onSuccess: () => flash('Milestone released.', 'success'),
      onError: onErr('Failed to release milestone.'),
    })
  }

  const handleSubmitReview = () => {
    reviewMut.mutate(
      { escrowId, rating: reviewRating, comment: reviewComment.trim() || undefined },
      {
        onSuccess: () => {
          setReviewDone(true)
          flash('Thanks for your review!', 'success')
        },
        onError: onErr('Failed to submit review.'),
      },
    )
  }

  return (
    <div className="min-h-screen min-w-[320px] pb-28" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-xl" style={{ color: 'var(--color-gold)' }} aria-label="Go back">
              ←
            </button>
          )}
          <h1 className="text-xl font-bold flex-1" style={{ color: 'var(--color-text)' }}>
            Order Tracker
          </h1>
          <StatusBadge status={status} />
        </div>

        {toast && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-center font-medium"
            style={{
              backgroundColor:
                toast.variant === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: toast.variant === 'success' ? 'var(--color-success)' : 'var(--color-error)',
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Summary */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <Row label="Order ID" value={`${e.id.slice(0, 8)}…`} mono />
          <Row label="Type" value={e.releaseType.replace('_', ' ')} capitalize />
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Amount</span>
            <span className="font-bold" style={{ color: 'var(--color-gold)' }}>
              {e.amountPi.toFixed(2)} π
            </span>
          </div>
          <Row label="Platform fee" value={`${e.platformFeePi.toFixed(2)} π`} />
          <Row label="Date" value={new Date(e.createdAt).toLocaleDateString()} />
        </div>

        {/* Shipment info */}
        {isShipping && e.trackingNumber && (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-royal-purple)' }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-gold)' }}>
              📦 Shipment Info
            </p>
            {e.shippingCarrier && (
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                Carrier: <strong>{e.shippingCarrier}</strong>
              </p>
            )}
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Tracking: <strong>{e.trackingNumber}</strong>
            </p>
          </div>
        )}

        {/* Dispute / cancel banners */}
        {status === 'disputed' && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--color-error)' }}
          >
            ⚠️ This order is under dispute. {e.disputeReason ? `Reason: ${e.disputeReason}` : 'Our team is reviewing it.'}
          </div>
        )}
        {status === 'cancelled' && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: 'var(--color-secondary-bg)', color: 'var(--color-subtext)' }}
          >
            This order was cancelled.
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Order Timeline
          </h2>
          <ol className="space-y-4">
            {steps.map((step, idx) => {
              const reached = currentRank >= rank(step.key) && status !== 'cancelled'
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: reached ? 'var(--color-gold)' : 'var(--color-secondary-bg)',
                      color: reached ? '#000' : 'var(--color-subtext)',
                    }}
                  >
                    {reached ? '✓' : idx + 1}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: reached ? 'var(--color-text)' : 'var(--color-subtext)' }}
                  >
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Digital milestones */}
        {isDigital && e.milestones && e.milestones.length > 0 && (
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              Milestones
            </h2>
            {e.milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {m.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-gold)' }}>
                    {m.amountPi.toFixed(2)} π
                  </p>
                </div>
                {m.status === 'released' ? (
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
                    Released
                  </span>
                ) : isBuyer && status === 'funded' ? (
                  <Button
                    variant="default"
                    size="sm"
                    loading={milestoneMut.isPending}
                    disabled={anyActionPending}
                    onClick={() => handleReleaseMilestone(m.id)}
                  >
                    Release
                  </Button>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--color-subtext)' }}>
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Meetup: buyer reveals code */}
        {meetupActive && isBuyer && (
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              Meetup Code
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Share this code with the seller in person to release the payment.
            </p>
            {revealedCode ? (
              <p
                className="text-2xl font-bold tracking-[0.3em] text-center py-2"
                style={{ color: 'var(--color-gold)' }}
              >
                {revealedCode}
              </p>
            ) : (
              <Button variant="outline" onClick={handleRevealCode}>
                Reveal Code
              </Button>
            )}
          </div>
        )}

        {/* Meetup: seller enters code */}
        {meetupActive && isSeller && (
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              Confirm Meetup
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              Enter the code the buyer shows you to release the escrow.
            </p>
            <input
              value={meetupCode}
              onChange={(ev) => setMeetupCode(ev.target.value)}
              placeholder="Meetup code"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-secondary-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-token)',
              }}
            />
            <Button
              variant="default"
              loading={meetupReleaseMut.isPending}
              disabled={anyActionPending}
              onClick={handleMeetupRelease}
              className="w-full"
            >
              Confirm & Release
            </Button>
          </div>
        )}

        {/* Seller: ship form */}
        {canShip && (
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              Mark as Shipped
            </h2>
            <input
              value={trackingNumber}
              onChange={(ev) => setTrackingNumber(ev.target.value)}
              placeholder="Tracking number (optional)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-secondary-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-token)',
              }}
            />
            <input
              value={carrier}
              onChange={(ev) => setCarrier(ev.target.value)}
              placeholder="Carrier (optional)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-secondary-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-token)',
              }}
            />
            <Button
              variant="default"
              loading={shipMut.isPending}
              disabled={anyActionPending}
              onClick={handleShip}
              className="w-full"
            >
              Mark Shipped
            </Button>
          </div>
        )}

        {/* Review form */}
        {canReview && (
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              Leave a Review
            </h2>
            {reviewDone ? (
              <p className="text-sm" style={{ color: 'var(--color-success)' }}>
                ✓ Review submitted. Thank you!
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReviewRating(i + 1)}
                      aria-label={`Rate ${i + 1} stars`}
                    >
                      <StarRating score={i < reviewRating ? 1 : 0} max={1} size={28} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(ev) => setReviewComment(ev.target.value)}
                  placeholder="Share details about your experience (optional)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--color-secondary-bg)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border-token)',
                  }}
                />
                <Button
                  variant="default"
                  loading={reviewMut.isPending}
                  onClick={handleSubmitReview}
                  className="w-full"
                >
                  Submit Review
                </Button>
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {canConfirm && (
            <Button
              variant="default"
              loading={confirmMut.isPending}
              disabled={anyActionPending}
              onClick={handleConfirm}
              className="w-full"
              style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
            >
              ✓ Confirm Receipt
            </Button>
          )}
          {canDeliver && (
            <Button
              variant="default"
              loading={deliverMut.isPending}
              disabled={anyActionPending}
              onClick={handleDeliver}
              className="w-full"
            >
              Mark as Delivered
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              loading={cancelMut.isPending}
              disabled={anyActionPending}
              onClick={handleCancel}
              className="w-full"
            >
              Cancel Order
            </Button>
          )}
          {canDispute && !showDispute && (
            <Button
              variant="outline"
              onClick={() => setShowDispute(true)}
              className="w-full"
              style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
            >
              Open Dispute
            </Button>
          )}
          {canDispute && showDispute && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)' }}>
              <h3 className="font-bold" style={{ color: 'var(--color-error)' }}>
                Open Dispute
              </h3>
              <textarea
                value={disputeReason}
                onChange={(ev) => setDisputeReason(ev.target.value)}
                placeholder="Describe the issue with this order…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-token)',
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="default"
                  loading={disputeMut.isPending}
                  onClick={handleDispute}
                  className="flex-1"
                  style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}
                >
                  Submit Dispute
                </Button>
                <Button variant="ghost" onClick={() => setShowDispute(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string
  value: string
  mono?: boolean
  capitalize?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: 'var(--color-subtext)' }}>{label}</span>
      <span
        className={mono ? 'font-mono text-xs' : ''}
        style={{ color: 'var(--color-text)', textTransform: capitalize ? 'capitalize' : 'none' }}
      >
        {value}
      </span>
    </div>
  )
}
