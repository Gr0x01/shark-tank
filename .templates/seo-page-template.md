# SEO Page Template Guide

## Overview
All SEO content pages follow one of two standardized patterns. **DO NOT** create custom layouts or variations.

## Pattern 1: ArticlePage (Editorial Content)

Use for: How-to guides, editorial articles, informational pages

### File Template
```tsx
import { Metadata } from 'next'
import { loadSEOContent } from '@/lib/seo/seo-content'
import { ArticlePage } from '@/components/seo/ArticlePage'
import { SEOErrorBoundary } from '@/components/seo/SEOErrorBoundary'
import { createBreadcrumbSchema, createArticleSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

// REQUIRED: Replace 'your-page-slug' with actual slug
const PAGE_SLUG = 'your-page-slug'
const PAGE_TITLE = 'Your Page Title'

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent(PAGE_SLUG)

  if (!content) {
    return {
      title: `${PAGE_TITLE} | ${SITE_NAME}`,
      description: 'Default description for this page.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.meta_description,
      url: `${SITE_URL}/${PAGE_SLUG}`,
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
      canonical: `${SITE_URL}/${PAGE_SLUG}`
    }
  }
}

export default async function YourPage() {
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
    url: `${SITE_URL}/${PAGE_SLUG}`,
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
```

### With Related Products (Optional)
```tsx
import { getProducts, getSharkPhotos } from '@/lib/queries/products'

export default async function YourPage() {
  const [contentResult, productsResult, sharkPhotosResult] = await Promise.allSettled([
    loadSEOContent(PAGE_SLUG),
    getProducts({ status: 'active', dealOutcome: 'deal', limit: 10 }),
    getSharkPhotos()
  ])

  const content = contentResult.status === 'fulfilled' ? contentResult.value : null
  const products = productsResult.status === 'fulfilled' ? productsResult.value : []
  const sharkPhotos = sharkPhotosResult.status === 'fulfilled' ? sharkPhotosResult.value : {}

  // ... (same error check and schemas)

  return (
    <>
      {/* schemas */}
      <SEOErrorBoundary>
        <ArticlePage
          title={content.title}
          description={content.meta_description}
          introduction={content.content.introduction}
          sections={content.content.sections || []}
          relatedProducts={products}
          sharkPhotos={sharkPhotos}
        />
      </SEOErrorBoundary>
    </>
  )
}
```

---

## Pattern 2: FilteredListingPage (Product Listings)

Use for: Pages that display filtered product lists with narrative intro

### File Template
```tsx
import { Metadata } from 'next'
import { getProducts, getProductStats, getSharkPhotos } from '@/lib/queries/products'
import { loadSEOContent } from '@/lib/seo/seo-content'
import { FilteredListingPage } from '@/components/seo/FilteredListingPage'
import { SEOErrorBoundary } from '@/components/seo/SEOErrorBoundary'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

// REQUIRED: Replace with actual values
const PAGE_SLUG = 'your-page-slug'
const PAGE_TITLE = 'Your Page Title'

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent(PAGE_SLUG)

  if (!content) {
    return {
      title: `${PAGE_TITLE} | ${SITE_NAME}`,
      description: 'Default description.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: {
      title: content.title,
      description: content.meta_description,
      url: `${SITE_URL}/${PAGE_SLUG}`,
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
      canonical: `${SITE_URL}/${PAGE_SLUG}`
    }
  }
}

export default async function YourPage() {
  // CUSTOMIZE: Adjust product filters as needed
  const [contentResult, productsResult, statsResult, sharkPhotosResult] = await Promise.allSettled([
    loadSEOContent(PAGE_SLUG),
    getProducts({ status: 'active', limit: 500 }),
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
    `${SITE_URL}/${PAGE_SLUG}`,
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
```

---

## Checklist for New Pages

### Before Creating a Page
1. ✅ Determine page type (Article vs Filtered Listing)
2. ✅ Choose appropriate template above
3. ✅ Update `PAGE_SLUG` constant (kebab-case)
4. ✅ Update `PAGE_TITLE` constant (Title Case)
5. ✅ Customize product filters (if using FilteredListingPage)

### Required Steps
1. ✅ Copy exact template code (no modifications to structure)
2. ✅ Replace constants: `PAGE_SLUG`, `PAGE_TITLE`
3. ✅ Update breadcrumb schema name
4. ✅ Update OpenGraph alt text
5. ✅ Verify imports are correct
6. ✅ Generate content: `npx tsx scripts/enrich-seo-pages.ts --page {PAGE_SLUG}`

### DO NOT
- ❌ Create custom layouts or components
- ❌ Modify the ArticlePage or FilteredListingPage components
- ❌ Add inline styles or custom HTML structures
- ❌ Forget the SEOErrorBoundary wrapper
- ❌ Skip the schema.org structured data
- ❌ Hardcode content (always use loadSEOContent)

---

## Component APIs

### ArticlePage Props
```tsx
interface ArticlePageProps {
  title: string                    // Page H1
  description?: string             // Optional subtitle
  introduction: string             // HTML string (sanitized)
  sections: SEOPageSection[]       // Array of {heading, content}
  relatedProducts?: ProductWithSharks[]  // Optional sidebar
  sharkPhotos?: Record<string, string>   // Shark photo URLs
}
```

### FilteredListingPage Props
```tsx
interface FilteredListingPageProps {
  title: string                    // Page H1
  introduction: string             // HTML string (sanitized)
  sections?: SEOPageSection[]      // Optional narrative sections
  products: ProductWithSharks[]    // Products to display
  stats: {
    total: number                  // Total products shown
    percentage: number             // % of all Shark Tank products
  }
  sharkPhotos?: Record<string, string>
}
```

---

## Common Product Filters

```tsx
// All active businesses
getProducts({ status: 'active', limit: 500 })

// Products with deals
getProducts({ dealOutcome: 'deal', limit: 500 })

// Failed businesses
getProducts({ status: 'out_of_business', limit: 500 })

// Specific shark's deals
getProducts({ sharkSlug: 'lori-greiner', limit: 500 })

// Specific category
getProducts({ category: 'food_and_beverage', limit: 500 })
```
