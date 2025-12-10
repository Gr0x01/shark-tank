'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

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
  const inputRef = useRef<HTMLInputElement>(null)

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
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[var(--white)]/95 backdrop-blur-sm border-b border-[var(--ink-100)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="font-display font-bold text-lg tracking-tight text-[var(--ink-900)]">
              SharkTank
            </span>
            <span className="text-[var(--coral)] font-display text-sm font-medium">Directory</span>
          </Link>
          
          <div className="flex items-center gap-6">
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
                      placeholder="Search Shark Tank products..."
                      className="search-input"
                    />
                    <button type="button" onClick={() => setSearchOpen(false)} className="search-close">
                      <kbd>ESC</kbd>
                    </button>
                  </div>
                </form>
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
