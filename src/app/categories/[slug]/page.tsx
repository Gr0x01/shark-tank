import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategoryBySlug, getCategoryProducts, getCategorySlugs, getSharkPhotos } from '@/lib/queries/cached'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'

// ISR: Revalidate every 24 hours (category products updated weekly)
export const revalidate = 86400
export const dynamicParams = false

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return { title: 'Category Not Found' }
  }

  const title = `${category.name} Products | tankd.io`
  const description = category.meta_description ||
    `Browse ${category.name} products from Shark Tank. See which businesses got deals, which are still active, and where to buy.`

  return {
    title,
    description,
    keywords: [
      category.name,
      `${category.name} Shark Tank`,
      `${category.name} Shark Tank products`,
      `${category.name} deals`,
      'Shark Tank',
      'still in business',
      'where to buy'
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/categories/${slug}`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${category.name} Products from Shark Tank`
      }],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    },
    alternates: {
      canonical: `/categories/${slug}`
    }
  }
}

export async function generateStaticParams() {
  const slugs = await getCategorySlugs()
  return slugs.map(slug => ({ slug }))
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const [category, products, sharkPhotos] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryProducts(slug),
    getSharkPhotos(),
  ])

  if (!category) {
    notFound()
  }

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Products', url: `${SITE_URL}/products` },
    { name: category.name }
  ])

  const collectionSchema = createCollectionPageSchema(
    `${category.name} Products`,
    category.description || `${category.name} products from Shark Tank`,
    `${SITE_URL}/categories/${slug}`,
    products.length
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/products" className="text-sm text-[var(--cyan-600)] hover:underline underline-offset-4 font-display">
            ← All Products
          </Link>
        </div>

        <div className="mb-10">
          <p className="section-label mb-2">Category</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-[var(--ink-600)] mb-4">{category.description}</p>
          )}
          <p className="text-[var(--ink-400)]">{products.length} products</p>
        </div>

        {products.length > 0 ? (
          <div className="products-grid-home">
            {products.map(product => (
              <ProductCardCommerce key={product.id} product={product} sharkPhotos={sharkPhotos} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[var(--ink-100)] p-12 text-center">
            <p className="text-[var(--ink-400)] font-display">No products in this category yet.</p>
          </div>
        )}
      </div>
    </main>
    </>
  )
}

