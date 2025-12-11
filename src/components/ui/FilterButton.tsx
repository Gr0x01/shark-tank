'use client'

import { useSearchParams } from 'next/navigation'

interface FilterButtonProps {
  onClick: () => void
}

export function FilterButton({ onClick }: FilterButtonProps) {
  const searchParams = useSearchParams()

  // Count active filters
  const activeCount =
    (searchParams.get('season') ? 1 : 0) +
    searchParams.getAll('status').length +
    searchParams.getAll('deal').length +
    searchParams.getAll('shark').length +
    searchParams.getAll('category').length

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 lg:hidden flex items-center gap-2 px-5 py-3 bg-[var(--coral)] text-white font-display font-semibold text-sm rounded-full shadow-lg hover:bg-[var(--coral-dark)] active:scale-95 transition-all"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <span>Filter{activeCount > 0 && ` (${activeCount})`}</span>
    </button>
  )
}
