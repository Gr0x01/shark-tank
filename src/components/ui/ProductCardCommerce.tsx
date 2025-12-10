'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { ProductWithSharks } from '@/lib/supabase/types'

interface ProductCardCommerceProps {
  product: ProductWithSharks
  showTrending?: boolean
  rank?: number
}

function formatMoney(amount: number | null): string {
  if (!amount) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

function formatVerifiedDate(date: string | null): string {
  if (!date) return 'Unverified'
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Active', icon: '✓', className: 'status-active' }
    case 'out_of_business':
      return { label: 'Closed', icon: '✗', className: 'status-closed' }
    case 'acquired':
      return { label: 'Acquired', icon: '◆', className: 'status-acquired' }
    default:
      return { label: 'Unknown', icon: '?', className: 'status-unknown' }
  }
}

export function ProductCardCommerce({ product, showTrending = false, rank }: ProductCardCommerceProps) {
  const [imgError, setImgError] = useState(false)
  
  const hasShopLink = product.amazon_url || product.website_url
  const shopUrl = product.amazon_url || product.website_url || `/products/${product.slug}`
  const isExternal = product.amazon_url || product.website_url

  return (
    <div className="product-card-commerce group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="product-image-wrapper">
          {product.photo_url && !imgError ? (
            <Image
              src={product.photo_url}
              alt={product.name}
              width={400}
              height={300}
              className="w-full aspect-[4/3] object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-[var(--cream)] flex items-center justify-center">
              <svg className="w-12 h-12 text-[var(--ink-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
          
          <div className="badges">
            {showTrending && (
              <span className="badge-trending">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                Trending
              </span>
            )}
            {rank && rank <= 3 && (
              <span className="badge-rank">
                {rank}
              </span>
            )}
            {product.status === 'active' && !showTrending && !rank && (
              <span className="badge-active">Active</span>
            )}
          </div>

          {hasShopLink && (
            <div className="quick-shop-overlay">
              <a 
                href={shopUrl}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="btn-shop"
                onClick={(e) => e.stopPropagation()}
              >
                {product.amazon_url ? 'Shop on Amazon' : 'Visit Store'}
              </a>
            </div>
          )}
          
          <div className="freshness-indicator">
            <span className={`status-dot ${getStatusConfig(product.status).className}`} />
            <span className="verified-text">
              {getStatusConfig(product.status).label} · {formatVerifiedDate(product.last_enriched_at)}
            </span>
          </div>
        </div>

        <div className="card-body">
          {product.deal_outcome === 'deal' && product.shark_names && product.shark_names.length > 0 && (
            <p className="shark-attribution">
              {product.shark_names[0]}&apos;s Pick
            </p>
          )}
          
          <h3 className="product-name">
            {product.name}
          </h3>
          
          {product.tagline && (
            <p className="product-tagline">{product.tagline}</p>
          )}

          <div className="card-footer">
            <div className="footer-left">
              {product.deal_amount && (
                <span className="deal-info">
                  {formatMoney(product.deal_amount)} deal
                </span>
              )}
              {product.deal_outcome === 'no_deal' && (
                <span className="no-deal-info">No Deal</span>
              )}
            </div>
            
            {hasShopLink && (
              <a 
                href={shopUrl}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="shop-link"
                onClick={(e) => e.stopPropagation()}
              >
                Shop →
              </a>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
