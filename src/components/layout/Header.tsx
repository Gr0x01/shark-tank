'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navigation = [
  { name: 'Just Aired', href: '/seasons', badge: true },
  { name: 'Products', href: '/products' },
  { name: 'Sharks', href: '/sharks' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-[var(--white)]/95 backdrop-blur-sm border-b border-[var(--ink-100)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-display font-medium text-lg tracking-tight text-[var(--ink-900)]">
              SharkTank
            </span>
            <span className="text-[var(--cyan-600)] font-display text-sm font-medium">Directory</span>
          </Link>
          
          <nav className="flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'font-display text-sm font-medium transition-colors flex items-center gap-1.5',
                  pathname.startsWith(item.href)
                    ? 'text-[var(--coral)]'
                    : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                )}
              >
                {item.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral)] animate-pulse" />
                )}
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
