import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategoryBySlug, getCategoryProducts, getCategorySlugs } from '@/lib/queries/categories'
import { ProductListCard } from '@/components/ui/ProductListCard'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return { title: 'Category Not Found' }
  }

  return {
    title: `${category.name} Products | Shark Tank Products`,
    description: category.meta_description || `Browse ${category.name} products from Shark Tank`,
  }
}

export async function generateStaticParams() {
  const slugs = await getCategorySlugs()
  return slugs.map(slug => ({ slug }))
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryProducts(slug),
  ])

  if (!category) {
    notFound()
  }

  return (
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map(product => (
              <ProductListCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-[var(--ink-400)] font-display">No products in this category yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}

