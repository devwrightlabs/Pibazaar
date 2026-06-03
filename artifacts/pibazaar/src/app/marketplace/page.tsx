import MarketplaceFeed from '@/components/marketplace/MarketplaceFeed'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 mb-2 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Marketplace
        </h1>
        <p className="text-sm text-muted-foreground">Find listings near you</p>
      </div>

      <ErrorBoundary>
        <MarketplaceFeed />
      </ErrorBoundary>
    </main>
  )
}
