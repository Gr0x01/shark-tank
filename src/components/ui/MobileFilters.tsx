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
}

export function MobileFilters({ stats, sharks, categories, currentSeason }: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <FilterButton onClick={() => setIsOpen(true)} />
      <FilterDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stats={stats}
        sharks={sharks}
        categories={categories}
        currentSeason={currentSeason}
      />
    </>
  )
}
