#!/usr/bin/env tsx
/**
 * Page Generator for SEO Content Pages
 *
 * Usage:
 *   npx tsx scripts/create-seo-page.ts article "best-products" "Best Shark Tank Products"
 *   npx tsx scripts/create-seo-page.ts listing "biggest-deals" "Biggest Deals"
 */

import * as fs from 'fs'
import * as path from 'path'

const TEMPLATES = {
  article: (slug: string, title: string) => `import { Metadata } from 'next'
import { loadSEOContent } from '@/lib/seo/seo-content'
import { ArticlePage } from '@/components/seo/ArticlePage'
import { SEOErrorBoundary } from '@/components/seo/SEOErrorBoundary'
import { createBreadcrumbSchema, createArticleSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

const PAGE_SLUG = '${slug}'
const PAGE_TITLE = '${title}'

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent(PAGE_SLUG)

  if (!content) {
    return {
      title: \`\${PAGE_TITLE} | \${SITE_NAME}\`,
      description: 'Complete guide to ${title.toLowerCase()}.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.meta_description,
      url: \`\${SITE_URL}/\${PAGE_SLUG}\`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: PAGE_TITLE
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
      canonical: \`\${SITE_URL}/\${PAGE_SLUG}\`
    }
  }
}

export default async function ${toPascalCase(slug)}Page() {
  const content = await loadSEOContent(PAGE_SLUG)

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

  const articleSchema = createArticleSchema({
    headline: content.title,
    description: content.meta_description,
    url: \`\${SITE_URL}/\${PAGE_SLUG}\`,
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
`,

  listing: (slug: string, title: string) => `import { Metadata } from 'next'
import { getProducts, getProductStats, getSharkPhotos } from '@/lib/queries/products'
import { loadSEOContent } from '@/lib/seo/seo-content'
import { FilteredListingPage } from '@/components/seo/FilteredListingPage'
import { SEOErrorBoundary } from '@/components/seo/SEOErrorBoundary'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

const PAGE_SLUG = '${slug}'
const PAGE_TITLE = '${title}'

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent(PAGE_SLUG)

  if (!content) {
    return {
      title: \`\${PAGE_TITLE} | \${SITE_NAME}\`,
      description: 'Browse ${title.toLowerCase()} from Shark Tank.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.meta_description,
      url: \`\${SITE_URL}/\${PAGE_SLUG}\`,
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
      canonical: \`\${SITE_URL}/\${PAGE_SLUG}\`
    }
  }
}

export default async function ${toPascalCase(slug)}Page() {
  // TODO: Customize product filters as needed
  const [contentResult, productsResult, statsResult, sharkPhotosResult] = await Promise.allSettled([
    loadSEOContent(PAGE_SLUG),
    getProducts({ limit: 500 }), // CUSTOMIZE THIS FILTER
    getProductStats(),
    getSharkPhotos()
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const products = productsResult.status === 'fulfilled' ? productsResult.value : []
  const stats = statsResult.status === 'fulfilled' ? statsResult.value : {
    total: 0,
    active: 0,
    outOfBusiness: 0,
    gotDeal: 0,
    noDeal: 0,
    successRate: '0.0',
    failureRate: '0.0',
    dealRate: '0.0'
  }
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
    \`\${SITE_URL}/\${PAGE_SLUG}\`,
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
`
}

function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug)
}

async function main() {
  const [type, slug, title] = process.argv.slice(2)

  if (!type || !slug || !title) {
    console.error('Usage: npx tsx scripts/create-seo-page.ts <article|listing> <slug> <title>')
    console.error('')
    console.error('Examples:')
    console.error('  npx tsx scripts/create-seo-page.ts article "best-products" "Best Shark Tank Products"')
    console.error('  npx tsx scripts/create-seo-page.ts listing "biggest-deals" "Biggest Deals"')
    process.exit(1)
  }

  if (type !== 'article' && type !== 'listing') {
    console.error('Error: Type must be "article" or "listing"')
    process.exit(1)
  }

  if (!validateSlug(slug)) {
    console.error('Error: Slug must be lowercase with hyphens only (e.g., "best-products")')
    process.exit(1)
  }

  const targetDir = path.join(process.cwd(), 'src', 'app', slug)
  const targetFile = path.join(targetDir, 'page.tsx')

  if (fs.existsSync(targetFile)) {
    console.error(`Error: Page already exists at ${targetFile}`)
    process.exit(1)
  }

  // Create directory
  fs.mkdirSync(targetDir, { recursive: true })

  // Generate and write file
  const template = TEMPLATES[type](slug, title)
  fs.writeFileSync(targetFile, template, 'utf-8')

  console.log('✅ Page created successfully!')
  console.log('')
  console.log('📁 File:', targetFile)
  console.log('🔗 URL: http://localhost:3004/' + slug)
  console.log('')
  console.log('Next steps:')
  console.log('1. Review the generated file and customize product filters if needed')
  console.log('2. Generate content:')
  console.log(`   npx tsx scripts/enrich-seo-pages.ts --page ${slug}`)
  console.log('3. Test locally:')
  console.log('   npm run dev -- -p 3004')
}

main().catch(console.error)
