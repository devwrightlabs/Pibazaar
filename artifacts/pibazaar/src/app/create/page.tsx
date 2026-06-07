import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'wouter'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { listingsApi, ApiError } from '@/lib/api/client'
import { useUpdateListing } from '@/lib/api/hooks'
import { initPiSdk, payListingFee, LISTING_FEE_PI } from '@/lib/pi-sdk'
import PhotoUploader from '@/components/PhotoUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import type {
  ListingDraft,
  ListingInput,
  ListingCondition,
  ProductType,
  ListingStatus,
} from '@/lib/api/types'

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Toys',
  'Books',
  'Automotive',
  'Art',
  'Collectibles',
  'Music',
  'Jewelry',
  'Health & Beauty',
  'Food & Drink',
  'Services',
  'Other',
]

const CONDITIONS: { key: ListingCondition; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'like_new', label: 'Like New' },
  { key: 'good', label: 'Good' },
  { key: 'fair', label: 'Fair' },
]

const PRODUCT_TYPES: { key: ProductType; label: string; desc: string }[] = [
  { key: 'physical', label: 'Physical', desc: 'Ships to buyer' },
  { key: 'digital', label: 'Digital', desc: 'Delivered online' },
  { key: 'service', label: 'Service', desc: 'Performed for buyer' },
]

const AUTOSAVE_DELAY = 800

function buildInput(draft: ListingDraft, status: ListingStatus): ListingInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    priceInPi: draft.priceInPi,
    category: draft.category,
    condition: draft.condition,
    productType: draft.productType,
    images: draft.images,
    city: draft.city.trim(),
    country: draft.country.trim(),
    allowOffers: draft.allowOffers,
    shippingCarrier: draft.shippingCarrier ?? undefined,
    status,
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block font-heading text-sm font-medium text-foreground">
      {children}
    </label>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-primary'
      }`}
    >
      {children}
    </button>
  )
}

export default function CreateListingPage() {
  const [, navigate] = useLocation()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { draft, setDraft, clearDraft, openModal } = useStore()
  const updateListing = useUpdateListing()

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [publishing, setPublishing] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const creatingRef = useRef(false)

  const update = useCallback(
    (patch: Partial<ListingDraft>) => setDraft(patch),
    [setDraft],
  )

  // Require auth — redirect to /login once we know the user isn't signed in.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login')
  }, [authLoading, isAuthenticated, navigate])

  // Debounced draft autosave: create once (status:draft), then PATCH on edits.
  useEffect(() => {
    if (!isAuthenticated || publishing) return

    const meaningful =
      draft.title.trim().length > 0 ||
      draft.images.length > 0 ||
      draft.priceInPi > 0 ||
      draft.description.trim().length > 0
    if (!meaningful) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void (async () => {
        if (creatingRef.current || publishing) return
        const body = buildInput(draft, 'draft')
        try {
          setSaveState('saving')
          if (!draft.serverId) {
            creatingRef.current = true
            const { listing } = await listingsApi.create(body)
            setDraft({ serverId: listing.id })
            creatingRef.current = false
          } else {
            await updateListing.mutateAsync({ id: draft.serverId, body })
          }
          setSaveState('saved')
        } catch {
          creatingRef.current = false
          setSaveState('idle')
        }
      })()
    }, AUTOSAVE_DELAY)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, isAuthenticated, publishing])

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Title is required'
    if (draft.priceInPi <= 0) return 'Price must be greater than 0'
    if (!draft.category) return 'Please select a category'
    if (!draft.description.trim()) return 'Description is required'
    if (draft.images.length === 0) return 'At least one photo is required'
    return null
  }

  const handlePublish = async () => {
    const validationError = validate()
    if (validationError) {
      openModal({
        title: 'Missing information',
        message: validationError,
        variant: 'alert',
      })
      return
    }

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setPublishing(true)

    try {
      // 1. Save listing as draft first (so we have an ID to attach to the payment).
      const draftBody = buildInput(draft, 'draft')
      let id = draft.serverId
      if (!id) {
        const { listing } = await listingsApi.create(draftBody)
        id = listing.id
        setDraft({ serverId: id })
      } else {
        await updateListing.mutateAsync({ id, body: draftBody })
      }

      // 2. Ensure Pi SDK is initialised before opening the payment dialog.
      const ready = await initPiSdk()
      if (!ready) {
        openModal({
          title: 'Pi SDK unavailable',
          message: 'Open PiBazaar inside the Pi Browser to pay the listing fee.',
          variant: 'alert',
        })
        setPublishing(false)
        return
      }

      // 3. Collect 0.5π listing fee. The backend activates the listing once
      //    the blockchain confirms and the completion endpoint is called.
      await payListingFee(id)

      clearDraft()
      navigate(`/products/${id}`)
    } catch (err) {
      const msg =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to publish listing'

      // Cancellation is not an error — just stop the spinner.
      if (msg === 'Payment cancelled') {
        setPublishing(false)
        return
      }

      openModal({
        title: 'Publish failed',
        message: `${msg} Please try again.`,
        variant: 'alert',
      })
      setPublishing(false)
    }
  }

  const canPublish =
    draft.title.trim().length > 0 &&
    draft.priceInPi > 0 &&
    draft.category.length > 0 &&
    draft.description.trim().length > 0 &&
    draft.images.length > 0 &&
    !publishing

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Spinner className="size-6 text-primary" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold">Sell an item</h1>
          <div className="flex h-6 items-center text-xs text-muted-foreground">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3" /> Saving…
              </span>
            )}
            {saveState === 'saved' && <span>Draft saved</span>}
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1 — Photos */}
          <div>
            <FieldLabel>Photos</FieldLabel>
            <PhotoUploader
              photos={draft.images}
              onPhotosChange={(images) => update({ images })}
            />
          </div>

          {/* Title */}
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(e) => update({ title: e.target.value.slice(0, 140) })}
              placeholder="What are you selling?"
            />
          </div>

          {/* Price */}
          <div>
            <FieldLabel>Price (π)</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={draft.priceInPi ? String(draft.priceInPi) : ''}
              onChange={(e) => update({ priceInPi: Number(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              rows={5}
              value={draft.description}
              onChange={(e) =>
                update({ description: e.target.value.slice(0, 5000) })
              }
              placeholder="Describe your item — condition, features, why you're selling…"
            />
          </div>

          {/* Category — single horizontal-scrolling row of chips */}
          <div>
            <FieldLabel>Category</FieldLabel>
            <div className="-mx-4 flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="shrink-0">
                  <Pill
                    active={draft.category === cat}
                    onClick={() => update({ category: cat })}
                  >
                    {cat}
                  </Pill>
                </div>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <FieldLabel>Condition</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <Pill
                  key={c.key}
                  active={draft.condition === c.key}
                  onClick={() => update({ condition: c.key })}
                >
                  {c.label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Product type */}
          <div>
            <FieldLabel>Product type</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_TYPES.map((pt) => {
                const active = draft.productType === pt.key
                return (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => update({ productType: pt.key })}
                    className={`rounded-xl border p-3 text-center transition-colors ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary'
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}
                    >
                      {pt.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pt.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>City</FieldLabel>
              <Input
                value={draft.city}
                onChange={(e) => update({ city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <FieldLabel>Country</FieldLabel>
              <Input
                value={draft.country}
                onChange={(e) => update({ country: e.target.value })}
                placeholder="Country"
              />
            </div>
          </div>

          {/* Allow offers */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Allow offers</p>
              <p className="text-xs text-muted-foreground">
                Let buyers send you offers
              </p>
            </div>
            <input
              type="checkbox"
              checked={draft.allowOffers}
              onChange={(e) => update({ allowOffers: e.target.checked })}
              className="h-5 w-5 accent-[var(--color-gold)]"
            />
          </label>

          {/* Publish */}
          <Button
            size="lg"
            className="w-full"
            disabled={!canPublish}
            loading={publishing}
            onClick={() => void handlePublish()}
          >
            {publishing ? 'Publishing…' : `Publish listing · ${LISTING_FEE_PI}π fee`}
          </Button>
        </div>
      </div>
    </main>
  )
}
