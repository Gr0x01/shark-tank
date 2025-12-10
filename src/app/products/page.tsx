import { Metadata } from 'next'
import Link from 'next/link'
import { getProducts, getProductStats } from '@/lib/queries/products'
import { getCategories } from '@/lib/queries/categories'
import { getSharks } from '@/lib/queries/sharks'
import { StatusBadge } from '@/components/ui/StatusBadge'

export const metadata: Metadata = {
  title: 'All Products | Shark Tank Products',
  description: 'Browse every product ever pitched on Shark Tank. Filter by status, shark, category, and more.',
}

export default async function ProductsPage() {
  const [products, stats, categories, sharks] = await Promise.all([
    getProducts({ limit: 50 }),
    getProductStats(),
    getCategories(),
    getSharks(),
  ])

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">All Products</h1>
        <p className="text-gray-600 mb-8">
          {stats.total} products pitched • {stats.gotDeal} got deals • {stats.active} still active
        </p>

        <div className="flex gap-8">
          <aside className="w-64 shrink-0">
            <div className="sticky top-8 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <div className="space-y-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" /> Active ({stats.active})
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" /> Out of Business ({stats.outOfBusiness})
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Deal</h3>
                <div className="space-y-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" /> Got a Deal ({stats.gotDeal})
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" /> No Deal ({stats.noDeal})
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Shark</h3>
                <div className="space-y-1 text-sm">
                  {sharks.map(shark => (
                    <label key={shark.id} className="flex items-center gap-2">
                      <input type="checkbox" /> {shark.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Category</h3>
                <div className="space-y-1 text-sm">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2">
                      <input type="checkbox" /> {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
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

            {products.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No products found. Run the seed script to populate data.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

