import type { TimelineEntry } from '@/lib/supabase/types'
import { ProductListCard } from './ProductListCard'

interface SharkTimelineProps {
  timeline: TimelineEntry[]
  sharkName: string
}

export function SharkTimeline({ timeline, sharkName }: SharkTimelineProps) {
  if (timeline.length === 0) {
    return null
  }

  return (
    <section className="mb-12">
      <h2 className="section-label mb-6">Investment History</h2>
      <p className="text-sm text-[var(--ink-500)] mb-8">
        {sharkName}&apos;s deal-making journey over the seasons
      </p>

      <div className="relative border-l-2 border-[var(--ink-200)] pl-6 md:pl-8 space-y-8">
        {timeline.map((entry) => (
          <div key={entry.season} className="relative">
            {/* Timeline node */}
            <div className="absolute -left-[1.35rem] md:-left-[1.6rem] w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--cyan-600)] flex items-center justify-center shadow-sm">
              <span className="text-white text-xs md:text-sm font-display font-semibold">
                S{entry.season}
              </span>
            </div>

            {/* Season header */}
            <div className="mb-4">
              <h3 className="font-display font-semibold text-lg text-[var(--ink-900)]">
                Season {entry.season}
                {entry.year && (
                  <span className="text-sm text-[var(--ink-400)] font-normal ml-2">
                    ({entry.year})
                  </span>
                )}
              </h3>
              <p className="text-sm text-[var(--ink-500)]">
                {entry.products.length} {entry.products.length === 1 ? 'investment' : 'investments'}
              </p>
            </div>

            {/* Products for this season */}
            <div className="space-y-3">
              {entry.products.map((product) => (
                <ProductListCard
                  key={product.id}
                  product={product}
                  showDealDetails
                  hideSeason
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
