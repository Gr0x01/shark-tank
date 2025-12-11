'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { SeasonSelect } from './SeasonSelect'
import { CategorySelect } from './CategorySelect'
import type { Category } from '@/lib/supabase/types'

interface SharkPortfolioFiltersProps {
  categories: Category[]
  currentSeason: number
}

export function SharkPortfolioFilters({ categories, currentSeason }: SharkPortfolioFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      const currentValues = params.getAll(key)

      if (currentValues.includes(value)) {
        // Remove the value
        const newValues = currentValues.filter(v => v !== value)
        params.delete(key)
        newValues.forEach(v => params.append(key, v))
      } else {
        // Add the value
        params.append(key, value)
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router]
  )

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router]
  )

  const isChecked = useCallback(
    (key: string, value: string) => {
      return searchParams.getAll(key).includes(value)
    },
    [searchParams]
  )

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false })
  }, [pathname, router])

  const currentSeasonFilter = searchParams.get('season') || ''
  const currentCategoryFilter = searchParams.get('category') || ''
  const hasActiveFilters = searchParams.toString().length > 0

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-label">Filter Portfolio</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-[var(--ink-500)] hover:text-[var(--coral)] transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <div>
          <h4 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Status</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('status', 'active')}
                onChange={() => toggleFilter('status', 'active')}
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('status', 'out_of_business')}
                onChange={() => toggleFilter('status', 'out_of_business')}
              />
              <span className="text-sm">Out of Business</span>
            </label>
            <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('status', 'acquired')}
                onChange={() => toggleFilter('status', 'acquired')}
              />
              <span className="text-sm">Acquired</span>
            </label>
          </div>
        </div>

        {/* Deal Outcome */}
        <div>
          <h4 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Deal</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('deal', 'deal')}
                onChange={() => toggleFilter('deal', 'deal')}
              />
              <span className="text-sm">Got a Deal</span>
            </label>
            <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                checked={isChecked('deal', 'no_deal')}
                onChange={() => toggleFilter('deal', 'no_deal')}
              />
              <span className="text-sm">No Deal</span>
            </label>
          </div>
        </div>

        {/* Season */}
        <div>
          <h4 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Season</h4>
          <SeasonSelect
            value={currentSeasonFilter}
            onChange={(value) => setFilter('season', value)}
            currentSeason={currentSeason}
          />
        </div>

        {/* Category */}
        <div>
          <h4 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Category</h4>
          <CategorySelect
            value={currentCategoryFilter}
            onChange={(value) => setFilter('category', value)}
            categories={categories}
          />
        </div>
      </div>
    </div>
  )
}
