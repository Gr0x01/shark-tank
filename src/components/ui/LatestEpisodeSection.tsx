'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProductWithSharks } from '@/lib/supabase/types'

interface LatestEpisodeSectionProps {
  episode: { season: number; episode_number: number; air_date: string | null }
  products: ProductWithSharks[]
  sharkPhotos: Record<string, string>
}

function formatMoney(amount: number | null): string {
  if (!amount) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export function LatestEpisodeSection({ episode, products: rawProducts, sharkPhotos: rawSharkPhotos }: LatestEpisodeSectionProps) {
  const [spoilersHidden, setSpoilersHidden] = useState(true)
  const [imgError, setImgError] = useState<Record<string, boolean>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  if (rawProducts.length === 0) return null

  const MOCK_MODE = true
  
  const products = MOCK_MODE ? rawProducts.map((p, i) => ({
    ...p,
    deal_outcome: i === 0 ? 'deal' as const : i === 1 ? 'no_deal' as const : i === 2 ? 'deal' as const : p.deal_outcome,
    deal_amount: i === 0 ? 200000 : i === 2 ? 100000 : p.deal_amount,
    deal_equity: i === 0 ? 25 : i === 2 ? 30 : p.deal_equity,
    royalty_deal: i === 2 ? true : p.royalty_deal,
    royalty_terms: i === 2 ? '5% until $500K repaid' : p.royalty_terms,
    shark_names: i === 0 ? ['Mark Cuban', 'Lori Greiner'] : i === 2 ? ['Daymond John'] : p.shark_names,
  })) : rawProducts
  
  const sharkPhotos = MOCK_MODE ? { 
    ...rawSharkPhotos, 
    'Mark Cuban': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/mark-cuban.jpg',
    'Lori Greiner': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/lori-greiner.jpg',
    'Robert Herjavec': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/robert-herjavec.jpg',
    'Daymond John': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/daymond-john.jpg',
  } : rawSharkPhotos

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

        <div className="ep-cards-grid">
          {products.map((product) => {
            const isRevealed = !spoilersHidden || revealed[product.id]
            const gotDeal = product.deal_outcome === 'deal'
            const productSharks = product.shark_names || []
            const firstShark = productSharks[0]
            const firstSharkPhoto = firstShark ? sharkPhotos[firstShark] : null
            
            return (
              <Link key={product.id} href={`/products/${product.slug}`} className="ep-card">
                <div className="ep-card-image">
                  {product.photo_url && !imgError[product.id] ? (
                    <Image
                      src={product.photo_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      onError={() => setImgError(prev => ({ ...prev, [product.id]: true }))}
                    />
                  ) : (
                    <div className="ep-card-placeholder">
                      <svg className="w-12 h-12 text-[var(--ink-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  <div className="ep-card-overlay">
                    <h4 className="ep-card-name">{product.name}</h4>
                  </div>
                </div>
                
                <div className="ep-card-ask">
                  {product.asking_amount && product.asking_equity ? (
                    <span>{formatMoney(product.asking_amount)} for {product.asking_equity}%</span>
                  ) : (
                    <span className="ep-card-ask-unknown">Ask unknown</span>
                  )}
                </div>
                
                <button
                  className={`ep-card-spoiler ${isRevealed ? 'revealed' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    if (!isRevealed) {
                      setRevealed(prev => ({ ...prev, [product.id]: true }))
                    }
                  }}
                >
                  {!isRevealed ? (
                    <div className="ep-card-spoiler-hidden">
                      <div className="ep-card-spoiler-fake">
                        <div className="ep-card-spoiler-shark-placeholder" />
                        <span className="ep-card-spoiler-fake-deal">$???K / ??%</span>
                      </div>
                      <span className="ep-card-spoiler-hint">tap to reveal</span>
                    </div>
                  ) : (
                    <div className="ep-card-spoiler-content">
                      {gotDeal ? (
                        <>
                          <div className="ep-card-spoiler-shark">
                            {firstSharkPhoto ? (
                              <Image
                                src={firstSharkPhoto}
                                alt={firstShark || 'Shark'}
                                width={36}
                                height={36}
                                className="ep-card-spoiler-shark-img"
                              />
                            ) : (
                              <div className="ep-card-spoiler-shark-placeholder" />
                            )}
                            {productSharks.length > 1 && (
                              <span className="ep-card-spoiler-more">+{productSharks.length - 1}</span>
                            )}
                          </div>
                          <span className="ep-card-spoiler-deal">
                            {formatMoney(product.deal_amount)}
                            {product.deal_equity && ` / ${product.deal_equity}%`}
                          </span>
                        </>
                      ) : (
                        <span className="ep-card-spoiler-nodeal">NO DEAL</span>
                      )}
                    </div>
                  )}
                </button>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
