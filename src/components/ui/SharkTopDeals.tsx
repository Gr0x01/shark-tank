import Link from 'next/link'
import type { ProductWithSharks } from '@/lib/supabase/types'
import { ProductImage } from './ProductImage'
import { StatusBadge } from './StatusBadge'

interface SharkTopDealsProps {
  topDeals: ProductWithSharks[]
  sharkName: string
}

export function SharkTopDeals({ topDeals, sharkName }: SharkTopDealsProps) {
  if (topDeals.length === 0) {
    return null
  }

  return (
    <section className="mb-12">
      <div className="mb-6">
        <p className="section-label mb-2">Portfolio Highlights</p>
        <h2 className="text-2xl font-medium">Top Performers</h2>
      </div>

      <p className="text-sm text-[var(--ink-500)] mb-4">
        {sharkName}&apos;s most successful active investments
      </p>

      <div className="top-deals-grid">
        {topDeals.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="top-deal-card"
          >
            <div className="top-deal-image-wrapper">
              <ProductImage
                src={product.photo_url}
                alt={`${product.name} product photo`}
                size="sm"
              />
            </div>

            <div className="top-deal-content">
              <h3 className="top-deal-name">{product.name}</h3>

              {product.deal_amount && (
                <div className="top-deal-amount">
                  ${product.deal_amount.toLocaleString()}
                </div>
              )}

              {product.status && (
                <div className="mt-2">
                  <StatusBadge status={product.status} />
                </div>
              )}
            </div>

            <div className="top-deal-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M7.5 15L12.5 10L7.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
