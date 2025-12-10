'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navigation = [
  { name: 'Products', href: '/products' },
  { name: 'Sharks', href: '/sharks' },
  { name: 'Seasons', href: '/seasons' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            🦈 Shark Tank Products
          </Link>
          
          <nav className="flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'text-sm font-medium transition-colors hover:text-blue-600',
                  pathname.startsWith(item.href)
                    ? 'text-blue-600'
                    : 'text-gray-600'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
