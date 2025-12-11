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

function formatSharkNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
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
    shark_names: i === 0 ? ['Mark Cuban', 'Lori Greiner', 'Robert Herjavec'] : i === 2 ? ['Daymond John'] : p.shark_names,
  })) : rawProducts
  
  const sharkPhotos = MOCK_MODE ? { 
    ...rawSharkPhotos, 
    'Mark Cuban': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/mark-cuban.jpg',
    'Lori Greiner': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/lori-greiner.jpg',
    'Robert Herjavec': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/robert-herjavec.jpg',
    'Daymond John': 'https://rhwfizaqeprgnslcagse.supabase.co/storage/v1/object/public/shark-photos/daymond-john.jpg',
  } : rawSharkPhotos

  const featured = products.find(p => p.deal_outcome === 'deal') || products[0]
  const others = products.filter(p => p.id !== featured.id)
  const showFeaturedDeal = !spoilersHidden || revealed[featured.id]
  const featuredGotDeal = featured.deal_outcome === 'deal'
  const featuredSharks = featured.shark_names || []

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

        <div className="ep-featured-layout">
          <Link href={`/products/${featured.slug}`} className="ep-featured-card">
            <div className="ep-featured-image">
              {featured.photo_url && !imgError[featured.id] ? (
                <Image
                  src={featured.photo_url}
                  alt={featured.name}
                  fill
                  className="object-cover"
                  onError={() => setImgError(prev => ({ ...prev, [featured.id]: true }))}
                />
              ) : (
                <div className="ep-featured-placeholder">
                  <svg className="w-16 h-16 text-[var(--ink-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
              <div className="ep-featured-overlay">
                {featured.founder_names && featured.founder_names.length > 0 && (
                  <p className="ep-featured-founders">by {featured.founder_names.join(' & ')}</p>
                )}
                <h3 className="ep-featured-name">{featured.name}</h3>
                {featured.asking_amount && featured.asking_equity && (
                  <p className="ep-featured-ask">
                    Asked {formatMoney(featured.asking_amount)} for {featured.asking_equity}%
                  </p>
                )}
              </div>
            </div>
            
            <div className={`ep-result-band ${showFeaturedDeal ? (featuredGotDeal ? 'deal revealed' : 'no-deal revealed') : 'hidden-result'}`}>
              {showFeaturedDeal ? (
                <>
                  {featuredGotDeal && featuredSharks.length > 0 && (
                    <div className="ep-shark-stack">
                      {featuredSharks.slice(0, 3).map((sharkName, idx) => (
                        <div key={sharkName} className="ep-shark-stack-item" style={{ zIndex: 3 - idx }}>
                          {sharkPhotos[sharkName] ? (
                            <Image
                              src={sharkPhotos[sharkName]}
                              alt={sharkName}
                              width={56}
                              height={56}
                              className="ep-result-shark-img"
                            />
                          ) : (
                            <div className="ep-result-shark-placeholder" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="ep-result-info">
                    {featuredGotDeal ? (
                      <>
                        <div className="ep-result-labels">
                          <span className="ep-result-label">DEAL</span>
                          {featured.royalty_deal && <span className="ep-result-badge royalty">ROYALTY</span>}
                        </div>
                        <span className="ep-result-amount">
                          {formatMoney(featured.deal_amount)}
                          {featured.deal_equity && <span className="ep-result-equity"> for {featured.deal_equity}%</span>}
                        </span>
                        {featuredSharks.length > 0 && (
                          <span className="ep-result-shark-name">with {formatSharkNames(featuredSharks)}</span>
                        )}
                      </>
                    ) : (
                      <span className="ep-result-no-deal">
                        {featured.deal_outcome === 'no_deal' ? 'NO DEAL' : featured.deal_outcome === 'deal_fell_through' ? 'DEAL FELL THROUGH' : 'UNKNOWN'}
                      </span>
                    )}
                  </div>
                  <span className="ep-result-cta">View Product →</span>
                </>
              ) : (
                <>
                  <button
                    className="ep-reveal-trigger"
                    onClick={(e) => {
                      e.preventDefault()
                      setRevealed(prev => ({ ...prev, [featured.id]: true }))
                    }}
                  >
                    <span className="ep-reveal-icon">?</span>
                    <span className="ep-reveal-label">Tap to reveal result</span>
                  </button>
                  <span className="ep-result-cta">View Product →</span>
                </>
              )}
            </div>
          </Link>

          <div className="ep-small-cards">
            {others.map((product) => {
              const showDeal = !spoilersHidden || revealed[product.id]
              const gotDeal = product.deal_outcome === 'deal'
              const productSharks = product.shark_names || []
              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="ep-small-card">
                  <div className="ep-small-image">
                    {product.photo_url && !imgError[product.id] ? (
                      <Image
                        src={product.photo_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        onError={() => setImgError(prev => ({ ...prev, [product.id]: true }))}
                      />
                    ) : (
                      <div className="ep-small-placeholder">
                        <svg className="w-8 h-8 text-[var(--ink-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="ep-small-content">
                    <h4 className="ep-small-name">{product.name}</h4>
                    {product.asking_amount && product.asking_equity && (
                      <p className="ep-small-ask">
                        {formatMoney(product.asking_amount)} for {product.asking_equity}%
                      </p>
                    )}
                  </div>
                  <div className={`ep-small-result-band ${showDeal ? (gotDeal ? 'deal revealed' : 'no-deal revealed') : 'hidden-result'}`}>
                    {showDeal ? (
                      <div className="ep-small-result-inner">
                        {gotDeal && productSharks.length > 0 && (
                          <div className="ep-small-shark-stack">
                            {productSharks.slice(0, 2).map((sharkName, idx) => (
                              sharkPhotos[sharkName] && (
                                <div key={sharkName} className="ep-small-shark-item" style={{ zIndex: 2 - idx }}>
                                  <Image
                                    src={sharkPhotos[sharkName]}
                                    alt={sharkName}
                                    width={28}
                                    height={28}
                                    className="ep-small-shark-img"
                                  />
                                </div>
                              )
                            ))}
                          </div>
                        )}
                        <span className={`ep-small-result-text ${gotDeal ? 'got-deal' : ''}`}>
                          {gotDeal ? 'DEAL' : product.deal_outcome === 'no_deal' ? 'NO DEAL' : 'UNKNOWN'}
                        </span>
                        {gotDeal && product.royalty_deal && (
                          <span className="ep-small-badge">+ROY</span>
                        )}
                      </div>
                    ) : (
                      <button
                        className="ep-small-reveal-btn"
                        onClick={(e) => {
                          e.preventDefault()
                          setRevealed(prev => ({ ...prev, [product.id]: true }))
                        }}
                      >
                        <span className="ep-small-reveal-icon">?</span>
                      </button>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
