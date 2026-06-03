// Informational, read-only shipping directory.
//
// PiBazaar does NOT manage, track, or facilitate shipping. Couriers are surfaced
// purely as outbound links grouped by coverage; all fulfillment is arranged
// offline between buyer and seller. The contract's `disclaimer` is rendered
// prominently per the API requirement.

import { useShippingCarriers } from '@/lib/api/hooks'
import type { ServiceRange, ShippingCarrier } from '@/lib/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'

const RANGE_LABELS: Record<ServiceRange, string> = {
  local: 'Local',
  regional: 'Regional',
  international: 'International',
}

const RANGE_ORDER: ServiceRange[] = ['local', 'regional', 'international']

interface Props {
  /** Optional ISO-2 country filter. */
  country?: string
}

function CarrierRow({ carrier }: { carrier: ShippingCarrier }) {
  return (
    <a
      href={carrier.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {carrier.logoUrl ? (
          <img
            src={carrier.logoUrl}
            alt={carrier.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-sm font-bold text-muted-foreground">
            {carrier.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold text-foreground">
          {carrier.name}
          {carrier.countryName ? (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              · {carrier.countryName}
            </span>
          ) : null}
        </p>
        {carrier.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {carrier.description}
          </p>
        ) : null}
      </div>
      <span aria-hidden className="flex-shrink-0 text-primary">↗</span>
    </a>
  )
}

export default function ShippingDirectory({ country }: Props) {
  const { data, isLoading, isError } = useShippingCarriers(
    country ? { country } : undefined,
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t load the shipping directory</EmptyTitle>
          <EmptyDescription>
            Please try again in a moment.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const { grouped, disclaimer } = data
  const hasAny = RANGE_ORDER.some((r) => (grouped[r]?.length ?? 0) > 0)

  return (
    <div className="space-y-6">
      {/* Prominent disclaimer callout */}
      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
        <p className="font-heading text-sm font-semibold text-primary">
          Shipping is informational only
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{disclaimer}</p>
      </div>

      {!hasAny ? (
        <Empty className="border border-border">
          <EmptyHeader>
            <EmptyTitle>No carriers listed</EmptyTitle>
            <EmptyDescription>
              There are no shipping carriers available for this region yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        RANGE_ORDER.map((range) => {
          const carriers = grouped[range] ?? []
          if (carriers.length === 0) return null
          return (
            <section key={range} className="space-y-3">
              <h2 className="font-heading text-base font-semibold text-foreground">
                {RANGE_LABELS[range]}
              </h2>
              <div className="space-y-2">
                {carriers.map((c) => (
                  <CarrierRow key={c.id} carrier={c} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
