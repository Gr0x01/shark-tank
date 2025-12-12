import { SITE_URL, SCHEMA_CONTEXT, SCHEMA_ORG_NAME, SCHEMA_ORG_URL, SCHEMA_ORG_LOGO } from './constants'
import type { ProductStatus } from '@/lib/supabase/types'

interface BreadcrumbItem {
  name: string
  url?: string
}

export function createBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url })
    }))
  }
}

export function createCollectionPageSchema(
  name: string,
  description: string,
  url: string,
  numberOfItems: number
) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'CollectionPage',
    name,
    description,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems
    }
  }
}

export function createOrganizationSchema() {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Organization',
    name: SCHEMA_ORG_NAME,
    url: SCHEMA_ORG_URL,
    logo: SCHEMA_ORG_LOGO,
    description: 'tankd.io - Complete database of every Shark Tank product with business status tracking and deal information.',
    sameAs: [
      // Add social media URLs when available
    ]
  }
}

export function createSearchActionSchema() {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/products?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }
}

export function createTVEpisodeSchema(
  season: number,
  episodeNumber: number,
  airDate?: string,
  title?: string,
  description?: string
) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'TVEpisode',
    partOfSeries: {
      '@type': 'TVSeries',
      name: 'Shark Tank'
    },
    seasonNumber: season,
    episodeNumber,
    ...(title && { name: title }),
    ...(description && { description }),
    ...(airDate && { datePublished: airDate })
  }
}

export function createArticleSchema(params: {
  headline: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  image?: string
}) {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: params.headline,
    description: params.description,
    url: params.url,
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    author: {
      '@type': 'Organization',
      name: SCHEMA_ORG_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SCHEMA_ORG_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    ...(params.image && {
      image: {
        '@type': 'ImageObject',
        url: params.image,
      },
    }),
  }
}

// Helper to safely inject JSON-LD (prevents XSS)
export function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

// Product Offers Schema Generation
interface ProductOfferData {
  slug: string
  amazonUrl: string | null
  websiteUrl: string | null
  currentPrice: number | null
  status: ProductStatus
}

interface OfferSchema {
  '@type': 'Offer'
  url: string
  availability: string
  price?: string
  priceCurrency?: string
  itemCondition?: string
}

/**
 * Validates a URL for use in schema.org structured data
 * @param url - URL to validate
 * @returns Valid URL string or null if invalid
 */
function validateUrl(url: string | null): string | null {
  if (!url || typeof url !== 'string') return null

  try {
    const parsed = new URL(url)
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Creates schema.org Offer objects for Product structured data
 *
 * Implements priority order:
 * 1. Amazon URL (affiliate revenue priority)
 * 2. Official website URL
 * 3. Product page fallback (always valid per schema.org)
 *
 * @see https://schema.org/Offer
 * @see https://developers.google.com/search/docs/appearance/structured-data/product
 *
 * @param product - Product data for offer generation
 * @returns Array of Offer objects (minimum 1, guaranteed by fallback)
 */
export function createProductOffers(product: ProductOfferData): OfferSchema[] {
  const offers: OfferSchema[] = []
  const hasUrls = Boolean(product.amazonUrl || product.websiteUrl)
  const availability = getAvailability(product.status, hasUrls)

  // Validate price: must be positive, finite number
  const priceFields = product.currentPrice !== null &&
                      product.currentPrice !== undefined &&
                      product.currentPrice > 0 &&
                      Number.isFinite(product.currentPrice)
    ? {
        price: product.currentPrice.toFixed(2),
        priceCurrency: 'USD',
        itemCondition: 'https://schema.org/NewCondition' as const
      }
    : { itemCondition: 'https://schema.org/NewCondition' as const }

  // Validate and prioritize URLs
  const validAmazonUrl = validateUrl(product.amazonUrl)
  const validWebsiteUrl = validateUrl(product.websiteUrl)

  // Priority 1: Amazon (affiliate revenue)
  if (validAmazonUrl) {
    offers.push({
      '@type': 'Offer' as const,
      url: validAmazonUrl,
      availability,
      ...priceFields,
    })
  }

  // Priority 2: Official website
  if (validWebsiteUrl) {
    offers.push({
      '@type': 'Offer' as const,
      url: validWebsiteUrl,
      availability,
      ...priceFields,
    })
  }

  // Fallback: Product page (always valid per schema.org)
  if (offers.length === 0) {
    offers.push({
      '@type': 'Offer' as const,
      url: `${SITE_URL}/products/${product.slug}`,
      availability,
      ...priceFields,
    })
  }

  return offers
}

/**
 * Maps product status to schema.org availability enum
 * @param status - Product status from database
 * @param hasUrls - Whether product has buy links (Amazon/website)
 * @returns Schema.org availability URL
 */
function getAvailability(status: ProductStatus, hasUrls: boolean): string {
  switch (status) {
    case 'active':
      return 'https://schema.org/InStock'
    case 'out_of_business':
      return 'https://schema.org/Discontinued'
    case 'acquired':
      return 'https://schema.org/InStock' // Still available under new ownership
    case 'unknown':
      // If we have buy links, assume available; otherwise assume out of stock
      return hasUrls ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    default:
      return 'https://schema.org/OutOfStock'
  }
}
