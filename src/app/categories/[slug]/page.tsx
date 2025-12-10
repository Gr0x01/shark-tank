import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategoryBySlug, getCategoryProducts, getCategories } from '@/lib/queries/categories'
import { StatusBadge } from '@/components/ui/StatusBadge'

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
  const categories = await getCategories()
  return categories.map(c => ({ slug: c.slug }))
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
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/products" className="text-sm text-blue-600 hover:underline">
            ← All Products
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 mb-8">{category.description}</p>
        )}
        <p className="text-gray-500 mb-8">{products.length} products</p>

        {products.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="border rounded-lg p-4 hover:shadow transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold">{product.name}</h2>
                  <StatusBadge status={product.status} />
                </div>
                {product.tagline && (
                  <p className="text-sm text-gray-600 mb-2">{product.tagline}</p>
                )}
                <div className="text-xs text-gray-500">
                  {product.season && <span>Season {product.season}</span>}
                  {product.shark_names?.length > 0 && (
                    <span className="ml-2">• {product.shark_names.join(', ')}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No products in this category yet.</p>
        )}
      </div>
    </main>
  )
}

