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
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="8" cy="6" r="2" fill="currentColor" />
        <circle cx="16" cy="12" r="2" fill="currentColor" />
        <circle cx="10" cy="18" r="2" fill="currentColor" />
      </svg>
      <span>Filter{activeCount > 0 && ` (${activeCount})`}</span>
    </button>
  )
}
