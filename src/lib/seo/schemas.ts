import { SITE_URL, SCHEMA_CONTEXT, SCHEMA_ORG_NAME, SCHEMA_ORG_URL, SCHEMA_ORG_LOGO } from './constants'

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
    description: 'The complete directory of Shark Tank products with business status tracking and deal information.',
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

// Helper to safely inject JSON-LD (prevents XSS)
export function escapeJsonLd(obj: any): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}
