'use client'

import { Search } from 'lucide-react'

interface HomeSearchLauncherProps {
  productCount: number
}

export function HomeSearchLauncher({ productCount }: HomeSearchLauncherProps) {
  return (
    <button
      type="button"
      className="home-search-launcher"
      onClick={() => window.dispatchEvent(new Event('tankd:open-search'))}
    >
      <Search aria-hidden="true" />
      <span>Search {productCount} products</span>
      <kbd>⌘K</kbd>
    </button>
  )
}
