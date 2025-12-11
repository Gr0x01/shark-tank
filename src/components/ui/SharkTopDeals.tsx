import type { ProductWithSharks } from '@/lib/supabase/types'
import { ProductListCard } from './ProductListCard'

interface SharkTopDealsProps {
  topDeals: ProductWithSharks[]
  sharkName: string
}

export function SharkTopDeals({ topDeals, sharkName }: SharkTopDealsProps) {
  if (topDeals.length === 0) {
    return null
  }

  return (
    <section className="mb-12">
      <div className="mb-6">
        <p className="section-label mb-2">Portfolio Highlights</p>
        <h2 className="text-2xl font-medium">Top Performers</h2>
      </div>

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
    </section>
  )
}
