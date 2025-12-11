'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProductCardCommerce } from './ProductCardCommerce'
import type { ProductWithSharks } from '@/lib/supabase/types'

interface LatestEpisodeSectionProps {
  episode: { season: number; episode_number: number; air_date: string | null }
  products: ProductWithSharks[]
}

export function LatestEpisodeSection({ episode, products }: LatestEpisodeSectionProps) {
  const [spoilersHidden, setSpoilersHidden] = useState(true)

  if (products.length === 0) return null

  return (
    <section className="latest-ep-section">
      <div className="max-w-6xl mx-auto px-6">
        <div className="latest-ep-header">
          <div className="latest-ep-title">
            <span className="ep-badge">JUST AIRED</span>
            <h2>Season {episode.season}, Episode {episode.episode_number}</h2>
          </div>
          
          <div className="latest-ep-actions">
            <button
              onClick={() => setSpoilersHidden(!spoilersHidden)}
              className={`spoiler-toggle ${spoilersHidden ? '' : 'revealed'}`}
            >
              {spoilersHidden ? 'Show all deals' : 'Hide spoilers'}
            </button>
            <Link href={`/seasons/${episode.season}`} className="ep-view-all">
              All Season {episode.season} →
            </Link>
          </div>
        </div>

        <div className="products-grid-home">
          {products.map((product) => (
            <ProductCardCommerce
              key={product.id}
              product={product}
              spoiler={spoilersHidden}
              hideEpisodeInfo={true}
              hideBadges={true}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
