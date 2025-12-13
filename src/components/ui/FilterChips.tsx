'use client'

import { useMemo } from 'react'
import { useFilterParams } from '@/hooks/useFilterParams'

interface FilterChipsProps {
  sharks: { slug: string; name: string }[]
  categories: { slug: string; name: string }[]
  basePath?: string
}

export function FilterChips({ sharks, categories, basePath }: FilterChipsProps) {
  const { removeFilter, clearAll, getFilterValue, getFilterValues } = useFilterParams(basePath)

  // Create lookup maps for O(1) access instead of O(n) find operations
  const sharksMap = useMemo(
    () => new Map(sharks.map(s => [s.slug, s.name])),
    [sharks]
  )

  const categoriesMap = useMemo(
    () => new Map(categories.map(c => [c.slug, c.name])),
    [categories]
  )

  // Collect all active filters
  const activeFilters = useMemo(() => {
    const filters: { key: string; value: string; label: string }[] = []

    const season = getFilterValue('season')
    if (season) {
      filters.push({ key: 'season', value: season, label: `Season ${season}` })
    }

    getFilterValues('status').forEach(status => {
      const label = status === 'active' ? 'Active' : 'Out of Business'
      filters.push({ key: 'status', value: status, label })
    })

    getFilterValues('deal').forEach(deal => {
      const label = deal === 'deal' ? 'Got a Deal' : 'No Deal'
      filters.push({ key: 'deal', value: deal, label })
    })

    getFilterValues('shark').forEach(sharkSlug => {
      const name = sharksMap.get(sharkSlug)
      if (name) {
        filters.push({ key: 'shark', value: sharkSlug, label: name })
      }
    })

    getFilterValues('category').forEach(catSlug => {
      const name = categoriesMap.get(catSlug)
      if (name) {
        filters.push({ key: 'category', value: catSlug, label: name })
      }
    })

    return filters
  }, [getFilterValue, getFilterValues, sharksMap, categoriesMap])

  if (activeFilters.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm text-[var(--ink-500)] mr-1">Filtered by:</span>
      {activeFilters.map((filter, index) => (
        <button
          key={`${filter.key}-${filter.value}-${index}`}
          onClick={() => removeFilter(filter.key, filter.value)}
          aria-label={`Remove ${filter.label} filter`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-display bg-[var(--cream)] border border-[var(--ink-200)] rounded-full text-[var(--ink-700)] hover:bg-[var(--coral)] hover:text-white hover:border-[var(--coral)] transition-colors"
        >
          {filter.label}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      {activeFilters.length > 0 && (
        <button
          onClick={clearAll}
          className="text-sm text-[var(--ink-500)] hover:text-[var(--coral)] transition-colors ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
