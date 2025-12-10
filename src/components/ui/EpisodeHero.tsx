'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { ProductWithSharks } from '@/lib/supabase/types'

interface EpisodeHeroProps {
  episode: { season: number; episode_number: number; air_date: string | null } | null
  products: ProductWithSharks[]
}

function formatMoney(amount: number | null): string {
  if (!amount) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

function formatAirDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ProductImageWithFallback({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [error, setError] = useState(false)
  
  if (!src || error) {
    return (
      <div className={`bg-[var(--ink-700)] flex items-center justify-center ${className}`}>
        <svg className="w-16 h-16 text-[var(--ink-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    )
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-cover ${className}`}
      onError={() => setError(true)}
      sizes="(max-width: 1024px) 100vw, 60vw"
      priority
    />
  )
}

export function EpisodeHero({ episode, products }: EpisodeHeroProps) {
  if (!episode || products.length === 0) return null

  const featured = products[0]
  const others = products.slice(1, 4)

  return (
    <section className="episode-hero py-20 lg:py-28 px-6">
      <div className="max-w-6xl mx-auto episode-hero-content">
        <div className="episode-hero-grid">
          <div className="order-2 lg:order-1">
            <div className="episode-badge">
              <span className="badge-just-aired">Just Aired</span>
            </div>
            
            <Link href={`/products/${featured.slug}`} className="episode-featured-image block">
              <div className="relative w-full aspect-[4/3]">
                <ProductImageWithFallback src={featured.photo_url} alt={featured.name} />
              </div>
            </Link>
          </div>

          <div className="episode-info order-1 lg:order-2">
            <p className="text-white/40 font-display text-xs font-bold uppercase tracking-[0.2em] mb-4 animate-in">
              Season {episode.season} Episode {episode.episode_number}
              {episode.air_date && ` • ${formatAirDate(episode.air_date)}`}
            </p>
            
            <Link href={`/products/${featured.slug}`}>
              <h1 className="episode-title animate-in animate-delay-1">
                {featured.name}
              </h1>
            </Link>
            
            {featured.tagline && (
              <p className="episode-tagline animate-in animate-delay-2">{featured.tagline}</p>
            )}
            
            {featured.deal_amount && (
              <div className="animate-in animate-delay-3">
                <div className="episode-deal-amount">
                  {formatMoney(featured.deal_amount)}
                </div>
                {featured.shark_names && featured.shark_names.length > 0 && (
                  <p className="episode-shark">
                    Deal with {featured.shark_names.join(' & ')}
                  </p>
                )}
              </div>
            )}
            
            <div className="episode-ctas animate-in animate-delay-4">
              {featured.amazon_url && (
                <a 
                  href={featured.amazon_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-shop"
                >
                  Shop on Amazon
                </a>
              )}
              {featured.website_url && (
                <a 
                  href={featured.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary text-white/80 border-white/20 hover:border-white hover:bg-white hover:text-[var(--ink-900)]"
                >
                  Visit Brand
                </a>
              )}
              {!featured.amazon_url && !featured.website_url && (
                <Link href={`/products/${featured.slug}`} className="btn-shop">
                  View Product
                </Link>
              )}
            </div>

            {others.length > 0 && (
              <div className="episode-more animate-in animate-delay-5">
                <h3 className="episode-more-title">Also This Episode</h3>
                <div className="episode-more-grid">
                  {others.map((product) => (
                    <Link 
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="episode-more-card"
                    >
                      <div className="w-[60px] h-[60px] relative bg-[var(--ink-700)] shrink-0">
                        {product.photo_url ? (
                          <Image
                            src={product.photo_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="60px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-[var(--ink-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4>{product.name}</h4>
                        {product.deal_amount && (
                          <span>{formatMoney(product.deal_amount)}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
