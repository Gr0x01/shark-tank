'use client'

import { useFilterParams } from '@/hooks/useFilterParams'
import { SeasonSelect } from './SeasonSelect'
import type { Shark } from '@/lib/supabase/types'
import type { Category } from '@/lib/supabase/types'

interface FilterSidebarProps {
  stats: {
    total: number
    active: number
    outOfBusiness: number
    gotDeal: number
    noDeal: number
  }
  sharks: Shark[]
  categories: Category[]
  currentSeason: number
}

export function FilterSidebar({ stats, sharks, categories, currentSeason }: FilterSidebarProps) {
  const { toggleFilter, setFilter, isChecked, getFilterValue } = useFilterParams()

  const currentSeasonFilter = getFilterValue('season')

  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-8">
        {/* Season */}
        <div>
          <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Season</h3>
          <SeasonSelect
            value={currentSeasonFilter}
            onChange={(value) => setFilter('season', value)}
            currentSeason={currentSeason}
          />
        </div>

        {/* Status */}
        <div>
          <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Status</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('status', 'active')}
                onChange={() => toggleFilter('status', 'active')}
              />
              Active ({stats.active})
            </label>
            <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('status', 'out_of_business')}
                onChange={() => toggleFilter('status', 'out_of_business')}
              />
              Out of Business ({stats.outOfBusiness})
            </label>
          </div>
        </div>

        {/* Deal */}
        <div>
          <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Deal</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('deal', 'deal')}
                onChange={() => toggleFilter('deal', 'deal')}
              />
              Got a Deal ({stats.gotDeal})
            </label>
            <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('deal', 'no_deal')}
                onChange={() => toggleFilter('deal', 'no_deal')}
              />
              No Deal ({stats.noDeal})
            </label>
          </div>
        </div>

        {/* Shark */}
        <div>
          <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Shark</h3>
          <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
            {sharks.map(shark => (
              <label key={shark.id} className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                <input
                  type="checkbox"
                  className="rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                  checked={isChecked('shark', shark.slug)}
                  onChange={() => toggleFilter('shark', shark.slug)}
                />
                {shark.name}
              </label>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Category</h3>
          <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
            {categories.map(cat => (
              <label key={cat.id} className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                <input
                  type="checkbox"
                  className="rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                  checked={isChecked('category', cat.slug)}
                  onChange={() => toggleFilter('category', cat.slug)}
                />
                {cat.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
