import { Metadata } from 'next'
import { getProducts, getSharkPhotos } from '@/lib/queries/cached'
import { loadSEOContent } from '@/lib/seo/seo-content'
import { ArticlePage } from '@/components/seo/ArticlePage'
import { SEOErrorBoundary } from '@/components/seo/SEOErrorBoundary'
import { createBreadcrumbSchema, createArticleSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

// ISR: Revalidate every 12 hours (SEO content)
export const revalidate = 43200

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent('success-stories')

  if (!content) {
    return {
      title: 'Most Successful Shark Tank Products | ' + SITE_NAME,
      description: 'Discover the biggest Shark Tank success stories and what made them winners.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.meta_description,
      url: `${SITE_URL}/success-stories`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Most Successful Shark Tank Products'
      }],
      type: 'article'
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.meta_description,
      images: [DEFAULT_OG_IMAGE]
    },
    alternates: {
      canonical: `${SITE_URL}/success-stories`
    }
  }
}

export default async function SuccessStoriesPage() {
  const [contentResult, topProductsResult, sharkPhotosResult] = await Promise.allSettled([
    loadSEOContent('success-stories'),
    getProducts({ status: 'active', dealOutcome: 'deal', limit: 10 }),
    getSharkPhotos()
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const topProducts = topProductsResult.status === 'fulfilled' ? topProductsResult.value : []
  const sharkPhotos = sharkPhotosResult.status === 'fulfilled' ? sharkPhotosResult.value : {}

  if (!content) {
    return (
      <main className="min-h-screen py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-medium mb-4">Content Not Available</h1>
          <p className="text-[var(--ink-600)]">
            Please run: <code className="bg-[var(--ink-100)] px-2 py-1 rounded text-sm">npx tsx scripts/enrich-seo-pages.ts --page success-stories</code>
          </p>
        </div>
      </main>
    )
  }

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Success Stories' }
  ])

  const articleSchema = createArticleSchema({
    headline: content.title,
    description: content.meta_description,
    url: `${SITE_URL}/success-stories`,
    datePublished: content.generated_at,
    dateModified: content.generated_at,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(articleSchema) }}
      />

      <SEOErrorBoundary>
        <ArticlePage
          title={content.title}
          description={content.meta_description}
          introduction={content.content.introduction}
          sections={content.content.sections || []}
          relatedProducts={topProducts}
          sharkPhotos={sharkPhotos}
        />
      </SEOErrorBoundary>
    </>
  )
}
