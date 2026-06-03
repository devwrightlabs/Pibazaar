import { useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useListing, useAddresses, useCreateAddress, useCreateEscrow } from '@/lib/api/hooks'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import PiPayButton from '@/components/PiPayButton'
import type { Address, CreateAddressBody, Escrow } from '@/lib/api/types'
import { ApiError } from '@/lib/api/client'

const EMPTY_ADDRESS: CreateAddressBody = {
  fullName: '',
  streetAddress: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  countryCode: '',
  phoneNumber: '',
  isDefault: false,
}

function inputStyle(): React.CSSProperties {
  return {
    backgroundColor: 'var(--color-secondary-bg)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border-token)',
  }
}

export default function CheckoutPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const [, navigate] = useLocation()
  const { isAuthenticated } = useAuth()
  const { openModal } = useStore()

  const listingQuery = useListing(listingId)
  const addressesQuery = useAddresses()
  const createAddress = useCreateAddress()
  const createEscrow = useCreateEscrow()

  const [escrow, setEscrow] = useState<Escrow | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [form, setForm] = useState<CreateAddressBody>(EMPTY_ADDRESS)

  const listing = listingQuery.data?.listing
  const isPhysical = listing?.productType === 'physical'
  const addresses: Address[] = addressesQuery.data?.addresses ?? []

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (listingQuery.isLoading) {
    return (
      <main className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton shape="card" />
          <Skeleton className="h-24" />
          <Skeleton className="h-12" />
        </div>
      </main>
    )
  }

  if (listingQuery.isError || !listing) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>📦</EmptyMedia>
            <EmptyTitle>Listing not found</EmptyTitle>
            <EmptyDescription>This listing may have been removed or is no longer available.</EmptyDescription>
          </EmptyHeader>
          <Button variant="default" onClick={() => navigate('/browse')}>
            Browse Listings
          </Button>
        </Empty>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>🔒</EmptyMedia>
            <EmptyTitle>Sign in to continue</EmptyTitle>
            <EmptyDescription>Log in to your account to complete this purchase.</EmptyDescription>
          </EmptyHeader>
          <Button variant="default" onClick={() => navigate('/login')}>
            Log In
          </Button>
        </Empty>
      </main>
    )
  }

  // The buyer pays the item price into escrow. The 2% platform fee is deducted
  // from the seller's payout on release, so it is NOT added to the buyer's total.
  const payAmount = escrow ? escrow.amountPi : listing.priceInPi
  const sellerFeePi = escrow ? escrow.platformFeePi : Number((listing.priceInPi * 0.02).toFixed(6))

  const handleSaveAddress = () => {
    if (!form.fullName.trim() || !form.streetAddress.trim() || !form.city.trim() || !form.countryCode.trim()) {
      openModal({
        title: 'Missing Details',
        message: 'Please fill in your name, street address, city, and country.',
        variant: 'alert',
      })
      return
    }
    createAddress.mutate(
      {
        ...form,
        stateProvince: form.stateProvince?.trim() || undefined,
        postalCode: form.postalCode?.trim() || undefined,
        phoneNumber: form.phoneNumber?.trim() || undefined,
      },
      {
        onSuccess: ({ address }) => {
          setSelectedAddressId(address.id)
          setShowAddrForm(false)
          setForm(EMPTY_ADDRESS)
        },
        onError: (err) =>
          openModal({
            title: 'Could Not Save Address',
            message: err instanceof ApiError ? err.message : 'Please try again.',
            variant: 'alert',
          }),
      },
    )
  }

  const handlePrepareOrder = () => {
    if (isPhysical && !selectedAddressId) {
      openModal({
        title: 'Shipping Address Required',
        message: 'Please select or add a shipping address to continue.',
        variant: 'alert',
      })
      return
    }
    createEscrow.mutate(
      {
        listingId: listing.id,
        releaseType: isPhysical ? 'shipping' : 'digital',
        ...(isPhysical && selectedAddressId ? { shippingAddressId: selectedAddressId } : {}),
      },
      {
        onSuccess: ({ escrow: created }) => setEscrow(created),
        onError: (err) =>
          openModal({
            title: 'Checkout Error',
            message: err instanceof ApiError ? err.message : 'Could not prepare your order. Please try again.',
            variant: 'alert',
          }),
      },
    )
  }

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => window.history.back()} className="text-xl" style={{ color: 'var(--color-gold)' }} aria-label="Go back">
            ←
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            Checkout
          </h1>
        </div>

        {/* Listing summary */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <div className="flex gap-3 p-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--color-bg)' }}>
              {listing.images[0] ? (
                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 capitalize"
                style={{
                  backgroundColor: 'var(--color-secondary-bg)',
                  color: isPhysical ? '#8B5CF6' : 'var(--color-success)',
                  border: `1px solid ${isPhysical ? '#8B5CF6' : 'var(--color-success)'}`,
                }}
              >
                {listing.productType}
              </span>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                {listing.title}
              </h2>
              <p className="font-bold mt-1" style={{ color: 'var(--color-gold)' }}>
                {listing.priceInPi.toFixed(2)} π
              </p>
            </div>
          </div>
        </div>

        {/* Shipping address (physical) or digital note */}
        {isPhysical ? (
          <div className="space-y-3">
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              Shipping Address
            </h2>

            {addressesQuery.isLoading ? (
              <Skeleton className="h-16" />
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    disabled={!!escrow}
                    className="w-full text-left rounded-xl p-3 transition-colors"
                    style={{
                      backgroundColor: 'var(--color-card-bg)',
                      border: `1px solid ${selectedAddressId === addr.id ? 'var(--color-gold)' : 'var(--color-border-token)'}`,
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {addr.fullName}
                      {addr.isDefault && (
                        <span className="ml-2 text-[10px] font-bold" style={{ color: 'var(--color-gold)' }}>
                          DEFAULT
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-subtext)' }}>
                      {addr.streetAddress}, {addr.city}
                      {addr.stateProvince ? `, ${addr.stateProvince}` : ''} {addr.postalCode ?? ''} ({addr.countryCode})
                    </p>
                  </button>
                ))}
              </div>
            )}

            {!showAddrForm ? (
              <Button variant="outline" onClick={() => setShowAddrForm(true)} disabled={!!escrow} className="w-full">
                + Add New Address
              </Button>
            ) : (
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-card-bg)' }}>
                {([
                  ['fullName', 'Full name'],
                  ['streetAddress', 'Street address'],
                  ['city', 'City'],
                  ['stateProvince', 'State / Province (optional)'],
                  ['postalCode', 'Postal code (optional)'],
                  ['countryCode', 'Country code (e.g. US, BS)'],
                  ['phoneNumber', 'Phone number (optional)'],
                ] as [keyof CreateAddressBody, string][]).map(([key, placeholder]) => (
                  <input
                    key={key}
                    value={(form[key] as string) ?? ''}
                    onChange={(ev) => setForm((f) => ({ ...f, [key]: ev.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle()}
                  />
                ))}
                <div className="flex gap-2">
                  <Button variant="default" loading={createAddress.isPending} onClick={handleSaveAddress} className="flex-1">
                    Save Address
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddrForm(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-success)' }}>
              📥 Digital Delivery — No Shipping Required
            </p>
            <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
              The seller will deliver this item via chat or a download link after payment is confirmed.
            </p>
          </div>
        )}

        {/* Payment breakdown */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
            Payment Breakdown
          </h3>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-subtext)' }}>Item price</span>
            <span style={{ color: 'var(--color-text)' }}>{payAmount.toFixed(2)} π</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--color-subtext)' }}>Platform fee (2%, paid by seller on release)</span>
            <span style={{ color: 'var(--color-subtext)' }}>{sellerFeePi.toFixed(2)} π</span>
          </div>
          <div className="border-t pt-2 flex justify-between" style={{ borderColor: 'var(--color-border-token)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
              You pay
            </span>
            <span className="font-bold" style={{ color: 'var(--color-gold)' }}>
              {payAmount.toFixed(2)} π
            </span>
          </div>
        </div>

        {/* Escrow protection */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid rgba(240,192,64,0.2)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-gold)' }}>
            🔒 Escrow Protection
          </p>
          <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
            Your Pi is held securely until you confirm receipt. If there&apos;s a problem, you can open a dispute and our team will help resolve it.
          </p>
        </div>

        {/* Pay / prepare action */}
        {escrow ? (
          <PiPayButton
            escrowId={escrow.id}
            amount={escrow.amountPi}
            memo={`PiBazaar: ${listing.title}`}
            metadata={{ listingId: listing.id }}
            onComplete={() => navigate(`/orders/${escrow.id}`)}
            onCancel={() =>
              openModal({
                title: 'Payment Cancelled',
                message: 'Your payment was cancelled. No Pi was charged.',
                variant: 'info',
              })
            }
          />
        ) : (
          <Button
            variant="default"
            size="lg"
            loading={createEscrow.isPending}
            onClick={handlePrepareOrder}
            disabled={isPhysical && !selectedAddressId}
            className="w-full"
          >
            {createEscrow.isPending ? 'Preparing Order…' : 'Proceed to Payment'}
          </Button>
        )}

        {isPhysical && !selectedAddressId && !escrow && (
          <p className="text-xs text-center" style={{ color: 'var(--color-subtext)' }}>
            Please select a shipping address to enable payment.
          </p>
        )}
      </div>
    </main>
  )
}
