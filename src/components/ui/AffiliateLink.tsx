'use client'

import posthog from 'posthog-js'
import type { ReactNode } from 'react'

type Placement = 'hero' | 'mid_page' | 'where_to_buy' | 'sticky_bar'

/**
 * Amazon affiliate clicks are the site's revenue path, so each one is captured
 * as a named event rather than left to generic autocapture. `placement` tells
 * the four CTAs on a product page apart; the product slug comes free from
 * PostHog's automatic $current_url property.
 */
export function AffiliateLink({
  href,
  placement,
  productName,
  className,
  ariaLabel,
  children,
}: {
  href: string
  placement: Placement
  productName: string
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      aria-label={ariaLabel}
      onClick={() =>
        posthog.capture('affiliate_link_clicked', {
          placement,
          product_name: productName,
          destination: 'amazon',
        })
      }
    >
      {children}
    </a>
  )
}
