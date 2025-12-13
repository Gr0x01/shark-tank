'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { ProductWithSharks } from '@/lib/supabase/types'
import { useSpoilerContext } from '@/contexts/SpoilerContext'

interface ProductCardCommerceProps {
  product: ProductWithSharks
  compact?: boolean
  spoiler?: boolean  // Override global spoiler setting for this card
  hideBadges?: boolean
  sharkPhotos?: Record<string, string>
  showEpisode?: boolean
}

function formatMoney(amount: number | null): string {
  if (!amount) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export function ProductCardCommerce({ product, compact = false, spoiler, hideBadges = false, sharkPhotos = {}, showEpisode = false }: ProductCardCommerceProps) {
  const { spoilersHidden } = useSpoilerContext()
  const [imgError, setImgError] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Use per-card spoiler prop if provided, otherwise fall back to global context
  const effectiveSpoilerState = spoiler !== undefined ? spoiler : spoilersHidden
  const showDealInfo = !effectiveSpoilerState || revealed
  const gotDeal = product.deal_outcome === 'deal'
  const productSharks = product.shark_names || []
  const firstShark = productSharks[0]
  const firstSharkPhoto = firstShark ? sharkPhotos[firstShark] : null
  
  return (
    <Link href={`/products/${product.slug}`} className={`season-card ${compact ? 'compact' : ''}`}>
      <div className="season-card-image">
        {product.photo_url && !imgError ? (
          <Image
            src={product.photo_url}
            alt={product.name}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="season-card-placeholder">
            <svg className="w-12 h-12 text-[var(--ink-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        
        {!hideBadges && product.status === 'active' && (
          <span className="season-card-badge">Active</span>
        )}
      </div>
      
      <div className="season-card-body">
        {showEpisode && product.episode_number && (
          <span className="season-card-episode">
            Episode {product.episode_number}
          </span>
        )}
        {product.founder_names && product.founder_names.length > 0 && (
          <span className="season-card-founders">
            by {product.founder_names.join(' & ')}
          </span>
        )}

        <h3 className="season-card-name">{product.name}</h3>
      </div>
      
      <button
        className={`season-card-spoiler ${showDealInfo ? 'revealed' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          if (!showDealInfo) {
            setRevealed(true)
          }
        }}
      >
        {!showDealInfo ? (
          <div className="season-card-spoiler-hidden">
            <div className="season-card-spoiler-fake">
              <div className="season-card-spoiler-shark-placeholder" />
              <span className="season-card-spoiler-fake-deal">$???K / ??%</span>
            </div>
            <span className="season-card-spoiler-hint">Reveal the Deal</span>
          </div>
        ) : (
          <div className="season-card-spoiler-content">
            {gotDeal ? (
              <>
                <div className="season-card-spoiler-shark">
                  {firstSharkPhoto ? (
                    <Image
                      src={firstSharkPhoto}
                      alt={firstShark || 'Shark'}
                      width={28}
                      height={28}
                      className="season-card-spoiler-shark-img"
                    />
                  ) : (
                    <div className="season-card-spoiler-shark-placeholder" />
                  )}
                  {productSharks.length > 1 && (
                    <span className="season-card-spoiler-more">+{productSharks.length - 1}</span>
                  )}
                </div>
                <span className="season-card-spoiler-deal">
                  {formatMoney(product.deal_amount)}
                  {product.deal_equity && ` / ${product.deal_equity}%`}
                </span>
              </>
            ) : product.deal_outcome === 'unknown' ? (
              <span className="season-card-spoiler-pending">DEAL PENDING</span>
            ) : (
              <span className="season-card-spoiler-nodeal">NO DEAL</span>
            )}
          </div>
        )}
      </button>
    </Link>
  )
}
