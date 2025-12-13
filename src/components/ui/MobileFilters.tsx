'use client'

import { useState } from 'react'
import { FilterButton } from './FilterButton'
import { FilterDrawer } from './FilterDrawer'
import type { Shark, Category } from '@/lib/supabase/types'

interface MobileFiltersProps {
  stats: {
    active: number
    outOfBusiness: number
    gotDeal: number
    noDeal: number
  }
  sharks: Shark[]
  categories: Category[]
  currentSeason: number
  hideSharkFilter?: boolean
  basePath?: string
}

export function MobileFilters({ stats, sharks, categories, currentSeason, hideSharkFilter, basePath }: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <FilterButton onClick={() => setIsOpen(true)} hideSharkFilter={hideSharkFilter} basePath={basePath} />
      <FilterDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stats={stats}
        sharks={sharks}
        categories={categories}
        currentSeason={currentSeason}
        hideSharkFilter={hideSharkFilter}
        basePath={basePath}
      />
    </>
  )
}
