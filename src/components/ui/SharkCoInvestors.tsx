import Link from 'next/link'
import type { SharkCoInvestor } from '@/lib/supabase/types'
import { SharkImage } from './SharkImage'

interface SharkCoInvestorsProps {
  coInvestors: SharkCoInvestor[]
  sharkName: string
}

export function SharkCoInvestors({ coInvestors, sharkName }: SharkCoInvestorsProps) {
  if (coInvestors.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="section-label mb-4">Partnership Patterns</h2>
        <div className="p-6 bg-[var(--off-white)] rounded-lg border border-[var(--ink-200)]">
          <p className="text-sm text-[var(--ink-500)]">
            {sharkName} typically invests solo or co-investor data is not available.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-12">
      <h2 className="section-label mb-4">Often Invests With</h2>
      <p className="text-sm text-[var(--ink-500)] mb-6">
        Sharks who frequently partner with {sharkName} on deals
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coInvestors.map((coInvestor) => (
          <Link
            key={coInvestor.id}
            href={`/sharks/${coInvestor.slug}`}
            className="card group flex items-center gap-4 hover:border-[var(--cyan-600)] transition-colors"
          >
            <SharkImage
              src={coInvestor.photo_url}
              name={coInvestor.name}
              size="md"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-medium text-[var(--ink-900)] truncate group-hover:text-[var(--cyan-600)] transition-colors">
                {coInvestor.name}
              </h3>
              <p className="text-sm text-[var(--ink-600)]">
                {coInvestor.deal_count} {coInvestor.deal_count === 1 ? 'deal' : 'deals'} together
              </p>
              {coInvestor.success_rate !== null && (
                <p className="text-xs text-[var(--success)] font-display mt-1">
                  {coInvestor.success_rate}% success rate
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
