import ShippingDirectory from '@/components/ShippingSelector'
import { useStore } from '@/store/useStore'

export default function ShippingPage() {
  const country = useStore((s) => s.currentUser?.country ?? undefined)

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <header className="mb-6">
          <h1 className="font-heading text-2xl font-bold">Shipping Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse couriers grouped by coverage. PiBazaar links out to each
            carrier — fulfillment is arranged entirely offline between buyer and
            seller.
          </p>
        </header>

        <ShippingDirectory country={country} />
      </div>
    </main>
  )
}
