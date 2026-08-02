import { Metadata } from 'next'
import { ArticlePage } from '@/components/seo/ArticlePage'
import { createBreadcrumbSchema, createArticleSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { loadSEOContent } from '@/lib/seo/seo-content'

const PAGE_TITLE = 'About tankd.io'
const PAGE_DESCRIPTION = 'Learn about tankd.io - a spoiler-free directory of Shark Tank products built by a fan who hates getting spoiled while shopping.'

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent('about')
  const title = content?.title || PAGE_TITLE
  const description = content?.meta_description || PAGE_DESCRIPTION

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/about`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: title
      }],
      type: 'article'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    },
    alternates: {
      canonical: `${SITE_URL}/about`
    }
  }
}

export default async function AboutPage() {
  const content = await loadSEOContent('about')
  const title = content?.title || PAGE_TITLE
  const description = content?.meta_description || PAGE_DESCRIPTION
  const introduction = content?.content.introduction || PAGE_DESCRIPTION
  const sections = content?.content.sections || []
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'About' }
  ])

  const articleSchema = createArticleSchema({
    headline: title,
    description,
    url: `${SITE_URL}/about`,
    datePublished: content?.generated_at || '2025-12-12T00:00:00.000Z',
    dateModified: content?.generated_at || undefined,
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

      <ArticlePage
        title={title}
        description={description}
        introduction={introduction}
        sections={sections}
      />
    </>
  )
}
