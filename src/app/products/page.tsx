import { Metadata } from 'next'
import Link from 'next/link'
import { getProducts, getProductStats } from '@/lib/queries/products'
import { getCategories } from '@/lib/queries/categories'
import { getSharks } from '@/lib/queries/sharks'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProductImage } from '@/components/ui/ProductImage'

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
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <p className="section-label mb-2">Browse</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">All Products</h1>
          <p className="text-[var(--ink-500)]">
            {stats.total} products · {stats.gotDeal} deals · {stats.active} still active
          </p>
        </div>

        <div className="flex gap-10">
          <aside className="w-56 shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <div>
                <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Status</h3>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                    <input type="checkbox" className="rounded border-[var(--ink-300)]" /> Active ({stats.active})
                  </label>
                  <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                    <input type="checkbox" className="rounded border-[var(--ink-300)]" /> Out of Business ({stats.outOfBusiness})
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Deal</h3>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                    <input type="checkbox" className="rounded border-[var(--ink-300)]" /> Got a Deal ({stats.gotDeal})
                  </label>
                  <label className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                    <input type="checkbox" className="rounded border-[var(--ink-300)]" /> No Deal ({stats.noDeal})
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Shark</h3>
                <div className="space-y-2 text-sm">
                  {sharks.map(shark => (
                    <label key={shark.id} className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                      <input type="checkbox" className="rounded border-[var(--ink-300)]" /> {shark.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Category</h3>
                <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 text-[var(--ink-600)] cursor-pointer hover:text-[var(--ink-900)]">
                      <input type="checkbox" className="rounded border-[var(--ink-300)]" /> {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="card group"
                >
                  <div className="flex gap-4">
                    <ProductImage 
                      src={product.photo_url} 
                      alt={product.name}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h2 className="font-display font-medium text-[var(--ink-900)] truncate group-hover:text-[var(--cyan-600)] transition-colors">
                          {product.name}
                        </h2>
                        <StatusBadge status={product.status} />
                      </div>
                      {product.tagline && (
                        <p className="text-sm text-[var(--ink-500)] mb-2 line-clamp-2">{product.tagline}</p>
                      )}
                      <div className="text-xs text-[var(--ink-400)] font-display">
                        {product.season && <span>Season {product.season}</span>}
                        {product.shark_names?.length > 0 && (
                          <span className="text-[var(--cyan-600)]"> · {product.shark_names.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-16 text-[var(--ink-400)] card">
                <p className="font-display">No products found. Run the seed script to populate data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
