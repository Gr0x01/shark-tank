'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Grid2X2, Home, Package, Search, Users } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Categories', href: '/categories', icon: Grid2X2 },
  { name: 'Sharks', href: '/sharks', icon: Users },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {items.slice(0, 2).map((item) => {
        const Icon = item.icon
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

        return (
          <Link key={item.name} href={item.href} className={clsx('mobile-bottom-link', active && 'active')}>
            <Icon aria-hidden="true" />
            <span>{item.name}</span>
          </Link>
        )
      })}

      <button
        type="button"
        className="mobile-bottom-link"
        onClick={() => window.dispatchEvent(new Event('tankd:open-search'))}
        aria-label="Search products"
      >
        <Search aria-hidden="true" />
        <span>Search</span>
      </button>

      {items.slice(2).map((item) => {
        const Icon = item.icon
        const active = pathname.startsWith(item.href)

        return (
          <Link key={item.name} href={item.href} className={clsx('mobile-bottom-link', active && 'active')}>
            <Icon aria-hidden="true" />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
