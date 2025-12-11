'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { useSpoilerContext } from '@/contexts/SpoilerContext'
import { useSearchTypeahead } from '@/hooks/useSearchTypeahead'

const navigation = [
  { name: 'Products', href: '/products' },
  { name: 'Sharks', href: '/sharks' },
  { name: 'Categories', href: '/categories' },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const { spoilersHidden, toggleSpoilers } = useSpoilerContext()
  const { results, isLoading, error } = useSearchTypeahead(searchQuery)

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        setSelectedIndex(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset selected index when query changes or results become empty
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery, results.length])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        // Navigate to selected product
        router.push(`/products/${results[selectedIndex].slug}`)
      } else {
        // Navigate to full search results
        router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      }
      setSearchOpen(false)
      setSearchQuery('')
      setSelectedIndex(-1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIndex = selectedIndex < results.length - 1 ? selectedIndex + 1 : selectedIndex
      setSelectedIndex(newIndex)

      // Scroll selected item into view
      setTimeout(() => {
        const element = document.querySelector(`[data-result-index="${newIndex}"]`)
        element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }, 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIndex = selectedIndex > -1 ? selectedIndex - 1 : -1
      setSelectedIndex(newIndex)

      // Scroll selected item into view
      if (newIndex >= 0) {
        setTimeout(() => {
          const element = document.querySelector(`[data-result-index="${newIndex}"]`)
          element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }, 0)
      }
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[var(--white)]/95 backdrop-blur-sm border-b border-[var(--ink-100)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="font-display font-bold text-lg tracking-tight text-[var(--ink-900)]">
              tankd.io
            </span>
          </Link>
          
          <div className="flex items-center gap-6">
            <button
              onClick={toggleSpoilers}
              className={clsx('spoiler-slide-toggle', !spoilersHidden && 'revealed')}
              aria-label={spoilersHidden ? 'Show deal outcomes' : 'Hide deal outcomes'}
              role="switch"
              aria-checked={!spoilersHidden}
            >
              <span className="spoiler-slide-label">Spoilers</span>
              <span className="spoiler-slide-track">
                <span className="spoiler-slide-knob" />
              </span>
            </button>
            
            <button
              onClick={() => setSearchOpen(true)}
              className="header-search-trigger"
              aria-label="Search products"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="search-placeholder">Search products...</span>
              <kbd className="search-kbd">⌘K</kbd>
            </button>
            
            <nav className="hidden sm:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'font-display text-sm font-medium transition-colors',
                    pathname.startsWith(item.href)
                      ? 'text-[var(--coral)]'
                      : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          
          {searchOpen && (
            <div className="search-modal-overlay" onClick={() => setSearchOpen(false)}>
              <div className="search-modal" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSearch}>
                  <div className="search-input-wrapper">
                    <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search Shark Tank products..."
                      className="search-input"
                      role="combobox"
                      aria-expanded={results.length > 0}
                      aria-controls="search-results-list"
                      aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
                      aria-autocomplete="list"
                    />
                    <button type="button" onClick={() => setSearchOpen(false)} className="search-close">
                      <kbd>ESC</kbd>
                    </button>
                  </div>
                </form>

                {/* Typeahead Results */}
                {searchQuery.trim().length >= 2 && (
                  <div className="search-results">
                    {isLoading && (
                      <div className="search-loading">
                        <div className="search-spinner" />
                        <span>Searching...</span>
                      </div>
                    )}

                    {error && !isLoading && (
                      <div className="search-no-results">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {!isLoading && !error && results.length > 0 && (
                      <div id="search-results-list" role="listbox" className="search-results-list">
                        {results.map((product, index) => (
                          <Link
                            key={product.slug}
                            id={`result-${index}`}
                            href={`/products/${product.slug}`}
                            className={clsx('search-result-item', index === selectedIndex && 'selected')}
                            role="option"
                            aria-selected={index === selectedIndex}
                            data-result-index={index}
                            onClick={() => {
                              setSearchOpen(false)
                              setSearchQuery('')
                              setSelectedIndex(-1)
                            }}
                          >
                            <div className="search-result-image">
                              {product.photo_url && !failedImages.has(product.slug) ? (
                                <Image
                                  src={product.photo_url}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="object-cover"
                                  onError={() => {
                                    setFailedImages(prev => new Set(prev).add(product.slug))
                                  }}
                                />
                              ) : (
                                <div className="search-result-placeholder" />
                              )}
                            </div>
                            <div className="search-result-text">
                              <div className="search-result-name">{product.name}</div>
                              {product.company_name && (
                                <div className="search-result-company">{product.company_name}</div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {!isLoading && !error && results.length === 0 && (
                      <div className="search-no-results">
                        <p>No products found</p>
                        <Link
                          href={`/products?q=${encodeURIComponent(searchQuery.trim())}`}
                          className="search-view-all"
                          onClick={() => {
                            setSearchOpen(false)
                            setSearchQuery('')
                            setSelectedIndex(-1)
                          }}
                        >
                          View all results for "{searchQuery}"
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <div className="search-hints">
                  <span>Try: Scrub Daddy, Ring, Bombas, or browse by</span>
                  <Link href="/products?status=active" onClick={() => setSearchOpen(false)} className="search-hint-link">Still Active</Link>
                  <span>·</span>
                  <Link href="/products?deal=true" onClick={() => setSearchOpen(false)} className="search-hint-link">Got Deals</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
