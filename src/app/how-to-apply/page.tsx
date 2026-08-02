import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadSEOContent } from '@/lib/seo/seo-content'
import { ArticlePage } from '@/components/seo/ArticlePage'
import { SEOErrorBoundary } from '@/components/seo/SEOErrorBoundary'
import { createBreadcrumbSchema, createArticleSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent('how-to-apply')

  if (!content) {
    return {
      title: 'How to Get on Shark Tank: Application Guide | ' + SITE_NAME,
      description: 'Complete guide to applying for Shark Tank. Learn what casting looks for and how to prepare.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.meta_description,
      url: `${SITE_URL}/how-to-apply`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'How to Get on Shark Tank'
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
      canonical: `${SITE_URL}/how-to-apply`
    }
  }
}

export default async function HowToApplyPage() {
  const content = await loadSEOContent('how-to-apply')

  if (!content) {
    notFound()
  }

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'How to Apply' }
  ])

  const articleSchema = createArticleSchema({
    headline: content.title,
    description: content.meta_description,
    url: `${SITE_URL}/how-to-apply`,
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
        />
      </SEOErrorBoundary>
    </>
  )
}
