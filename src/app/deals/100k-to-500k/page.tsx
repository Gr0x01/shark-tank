import { Metadata } from 'next'
import { getProducts, getProductStats, getSharkPhotos } from '@/lib/queries/products'
import { loadSEOContent } from '@/lib/seo/seo-content'
import { FilteredListingPage } from '@/components/seo/FilteredListingPage'
import { SEOErrorBoundary } from '@/components/seo/SEOErrorBoundary'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

const PAGE_SLUG = 'deals-100k-to-500k'
const PAGE_TITLE = 'Shark Tank Deals $100K-$500K'
const PAGE_URL = '/deals/100k-to-500k'

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent(PAGE_SLUG)

  if (!content) {
    return {
      title: `${PAGE_TITLE} | ${SITE_NAME}`,
      description: 'Browse Shark Tank deals between $100K-$500K.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.meta_description,
      url: `${SITE_URL}${PAGE_URL}`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: PAGE_TITLE
      }],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.meta_description,
      images: [DEFAULT_OG_IMAGE]
    },
    alternates: {
      canonical: `${SITE_URL}${PAGE_URL}`
    }
  }
}

export default async function Deals100kTo500kPage() {
  const [contentResult, productsResult, statsResult, sharkPhotosResult] = await Promise.allSettled([
    loadSEOContent(PAGE_SLUG),
    getProducts({
      dealOutcome: 'deal',
      dealAmountMin: 100000,   // >= $100K
      dealAmountMax: 499999,   // < $500K to match SEO content
      limit: 500
    }),
    getProductStats(),
    getSharkPhotos()
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const products = productsResult.status === 'fulfilled' ? productsResult.value : []
  const stats = statsResult.status === 'fulfilled' ? statsResult.value : { total: 0 }
  const sharkPhotos = sharkPhotosResult.status === 'fulfilled' ? sharkPhotosResult.value : {}

  if (!content) {
    return (
      <main className="min-h-screen py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-medium mb-4">Content Not Available</h1>
          <p className="text-[var(--ink-600)]">
            Please run: <code className="bg-[var(--ink-100)] px-2 py-1 rounded text-sm">
              npx tsx scripts/enrich-seo-pages.ts --page {PAGE_SLUG}
            </code>
          </p>
        </div>
      </main>
    )
  }

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: PAGE_TITLE }
  ])

  const collectionSchema = createCollectionPageSchema(
    content.title,
    content.meta_description,
    `${SITE_URL}${PAGE_URL}`,
    products.length
  )

  const percentage = stats.total > 0
    ? ((products.length / stats.total) * 100).toFixed(1)
    : '0'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(collectionSchema) }}
      />

      <SEOErrorBoundary>
        <FilteredListingPage
          title={content.title}
          introduction={content.content.introduction}
          sections={content.content.sections}
          products={products}
          stats={{
            total: products.length,
            percentage: parseFloat(percentage)
          }}
          sharkPhotos={sharkPhotos}
        />
      </SEOErrorBoundary>
    </>
  )
}
