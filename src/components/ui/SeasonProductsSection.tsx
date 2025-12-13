'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProductCardCommerce } from './ProductCardCommerce'
import type { ProductWithSharks } from '@/lib/supabase/types'

interface SeasonProductsSectionProps {
  products: ProductWithSharks[]
  season: number
  totalProducts: number
  sharkPhotos: Record<string, string>
}

type DealFilter = 'all' | 'deal' | 'no_deal'

export function SeasonProductsSection({ products, season, totalProducts, sharkPhotos }: SeasonProductsSectionProps) {
  const [filter, setFilter] = useState<DealFilter>('all')

  const filteredProducts = products.filter((product) => {
    if (filter === 'all') return true
    if (filter === 'deal') return product.deal_outcome === 'deal'
    if (filter === 'no_deal') return product.deal_outcome === 'no_deal' || product.deal_outcome === 'deal_fell_through'
    return true
  })

  const dealCount = products.filter(p => p.deal_outcome === 'deal').length
  const noDealCount = products.filter(p => p.deal_outcome === 'no_deal' || p.deal_outcome === 'deal_fell_through').length

  return (
    <section className="products-main">
      <div className="max-w-6xl mx-auto px-6">
        <div className="products-header">
          <h2 className="products-title">Season {season}</h2>
          <Link href="/products" className="products-link">
            View all {totalProducts} →
          </Link>
        </div>
        
        <div className="season-filters">
          <button
            className={`season-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({products.length})
          </button>
          <button
            className={`season-filter-btn ${filter === 'deal' ? 'active' : ''}`}
            onClick={() => setFilter('deal')}
          >
            Got Deal ({dealCount})
          </button>
          <button
            className={`season-filter-btn ${filter === 'no_deal' ? 'active' : ''}`}
            onClick={() => setFilter('no_deal')}
          >
            No Deal ({noDealCount})
          </button>
        </div>
        
        <div className="products-grid-home">
          {filteredProducts.map((product) => (
            <ProductCardCommerce
              key={product.id}
              product={product}
              sharkPhotos={sharkPhotos}
              spoiler={true}
              hideBadges={true}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <p className="text-center text-[var(--ink-400)] py-8">No products match this filter.</p>
        )}

        <div className="products-cta">
          <Link href="/products" className="btn-browse">
            Browse All Products
          </Link>
        </div>
      </div>
    </section>
  )
}
