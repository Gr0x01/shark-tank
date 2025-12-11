import type { ProductWithSharks } from '@/lib/supabase/types'
import { ProductListCard } from './ProductListCard'

interface SharkTopDealsProps {
  topDeals: ProductWithSharks[]
  failures: ProductWithSharks[]
  sharkName: string
}

export function SharkTopDeals({ topDeals, failures, sharkName }: SharkTopDealsProps) {
  const hasTopDeals = topDeals.length > 0
  const hasFailures = failures.length > 0

  if (!hasTopDeals && !hasFailures) {
    return null
  }

  return (
    <section className="mb-12">
      <h2 className="section-label mb-6">Portfolio Highlights</h2>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        {hasTopDeals ? (
          <div>
            <h3 className="font-display font-semibold text-lg text-[var(--ink-900)] mb-4 flex items-center gap-2">
              <span className="text-[var(--success)]">✓</span> Top Performers
            </h3>
            <p className="text-sm text-[var(--ink-500)] mb-4">
              {sharkName}&apos;s most successful active investments
            </p>
            <div className="space-y-3">
              {topDeals.map((product) => (
                <ProductListCard
                  key={product.id}
                  product={product}
                  showDealDetails
                  hideSeason
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[var(--off-white)] rounded-lg border border-[var(--ink-200)]">
            <h3 className="font-display font-semibold text-lg text-[var(--ink-900)] mb-2">
              No Active Deals
            </h3>
            <p className="text-sm text-[var(--ink-500)]">
              {sharkName} doesn&apos;t have any active investments yet, or deal data is not available.
            </p>
          </div>
        )}

        {/* Recent Setbacks */}
        {hasFailures ? (
          <div>
            <h3 className="font-display font-semibold text-lg text-[var(--ink-900)] mb-4 flex items-center gap-2">
              <span className="text-[var(--danger)]">✕</span> Recent Setbacks
            </h3>
            <p className="text-sm text-[var(--ink-500)] mb-4">
              Companies that closed within the last 3 years
            </p>
            <div className="space-y-3">
              {failures.map((product) => (
                <ProductListCard
                  key={product.id}
                  product={product}
                  showDealDetails
                  hideSeason
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[var(--off-white)] rounded-lg border border-[var(--ink-200)]">
            <h3 className="font-display font-semibold text-lg text-[var(--ink-900)] mb-2">
              No Recent Failures
            </h3>
            <p className="text-sm text-[var(--ink-500)]">
              None of {sharkName}&apos;s recent investments have closed in the last 3 years.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
