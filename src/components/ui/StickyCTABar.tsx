'use client'

import { useEffect, useState } from 'react'
import { addAmazonAffiliateTag } from '@/lib/utils'

interface StickyCTABarProps {
  productName: string
  amazonUrl?: string | null
  websiteUrl?: string | null
  dealOutcome?: string | null
  dealAmount?: number | null
}

export function StickyCTABar({
  productName,
  amazonUrl,
  websiteUrl,
  dealOutcome,
  dealAmount,
}: StickyCTABarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hero = document.querySelector('.product-hero')
    if (!hero) {
      // Hero element not found - component won't work but won't break the page
      return
    }

    // Use IntersectionObserver for better performance
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when hero is NOT intersecting (scrolled past)
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  // Don't render if no CTAs available
  if (!amazonUrl && !websiteUrl) {
    return null
  }

  // Convert Amazon URL to affiliate link
  const affiliateAmazonUrl = addAmazonAffiliateTag(amazonUrl)

  return (
    <div className={`sticky-cta-bar ${visible ? 'visible' : ''}`}>
      <div className="sticky-cta-content">
        <div className="sticky-cta-info">
          <span className="sticky-cta-name">{productName}</span>
          {dealOutcome === 'deal' && dealAmount && (
            <span className="sticky-cta-deal">
              Deal: ${dealAmount.toLocaleString()}
            </span>
          )}
        </div>
        <div className="sticky-cta-buttons">
          {affiliateAmazonUrl && (
            <a
              href={affiliateAmazonUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="btn-sticky-primary"
            >
              Amazon
            </a>
          )}
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sticky-secondary"
            >
              Website
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
