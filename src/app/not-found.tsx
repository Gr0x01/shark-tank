import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-[70vh] px-6 py-20 flex items-center justify-center">
      <div className="max-w-2xl text-center">
        <p className="section-label mb-4">404 — Page not found</p>
        <h1 className="text-5xl md:text-7xl mb-6">This one got away.</h1>
        <p className="text-lg text-[var(--ink-600)] mb-10">
          The page may have moved, but the Shark Tank products and episode guides are still here.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-shop">Go home</Link>
          <Link href="/products" className="btn-secondary">Browse products</Link>
          <Link href="/seasons" className="btn-secondary">Explore seasons</Link>
        </div>
      </div>
    </main>
  )
}
