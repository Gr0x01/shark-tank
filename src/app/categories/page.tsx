import { Metadata } from 'next'
import Link from 'next/link'
import { getCategoriesWithCounts } from '@/lib/queries/cached'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'

// ISR: Revalidate every 24 hours (categories rarely change)
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Product Categories | Shark Tank Products by Industry',
  description: 'Browse Shark Tank products by category. Explore food & beverage, fashion, tech, beauty, fitness, pet, and more. See which categories get the most deals and succeed after the Tank.',

  keywords: [
    'Shark Tank categories',
    'Shark Tank products by category',
    'Shark Tank food products',
    'Shark Tank tech products',
    'Shark Tank fashion',
    'Shark Tank fitness',
    'product categories',
    'Shark Tank industries'
  ],

  openGraph: {
    title: 'Product Categories | Shark Tank Products',
    description: 'Browse all Shark Tank products by category - Food, Tech, Fashion, Beauty, Fitness, Pets, and more.',
    url: `${SITE_URL}/categories`,
    siteName: SITE_NAME,
    images: [{
      url: DEFAULT_OG_IMAGE,
      width: 1200,
      height: 630,
      alt: 'Shark Tank Product Categories'
    }],
    type: 'website'
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Product Categories | Shark Tank Products',
    description: 'Browse Shark Tank products by category - Food, Tech, Fashion, Beauty, Fitness, and more.',
    images: [DEFAULT_OG_IMAGE]
  },

  alternates: {
    canonical: '/categories'
  }
}

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts()

  // Sort by product count descending
  const sortedCategories = [...categories].sort((a, b) => b.product_count - a.product_count)

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Categories' }
  ])

  const collectionSchema = createCollectionPageSchema(
    'Product Categories',
    'Browse all Shark Tank products organized by category',
    `${SITE_URL}/categories`,
    categories.length
  )

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(collectionSchema) }}
      />

      <main className="min-h-screen py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="section-label mb-2">Browse</p>
            <h1 className="text-3xl md:text-4xl font-medium mb-2">Product Categories</h1>
            <p className="text-[var(--ink-500)]">
              Browse products by category
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCategories.map(category => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="card group"
              >
                <h2 className="text-2xl font-display font-medium mb-3 group-hover:text-[var(--cyan-600)] transition-colors">
                  {category.name}
                </h2>
                <div className="text-sm space-y-1">
                  <p className="text-[var(--ink-600)]">{category.product_count} products</p>
                </div>
              </Link>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-[var(--ink-400)] font-display">No categories available yet.</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
