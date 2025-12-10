import Link from 'next/link'
import { getRecentProducts, getProductStats } from '@/lib/queries/products'
import { getSharks } from '@/lib/queries/sharks'
import { getCategories } from '@/lib/queries/categories'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default async function Home() {
  const [products, stats, sharks, categories] = await Promise.all([
    getRecentProducts(6),
    getProductStats(),
    getSharks(),
    getCategories(),
  ])

  return (
    <main className="min-h-screen">
      <section className="py-16 px-8 text-center bg-gradient-to-b from-blue-50 to-white">
        <h1 className="text-5xl font-bold mb-4">Shark Tank Products</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Every product ever pitched. Find out what&apos;s still in business, where to buy, and which shark invested.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/products"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Browse Products
          </Link>
          <Link
            href="/sharks"
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
          >
            Meet the Sharks
          </Link>
        </div>
      </section>

      <section className="py-12 px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold">{stats.total}</div>
              <div className="text-gray-600">Products Pitched</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">{stats.gotDeal}</div>
              <div className="text-gray-600">Got Deals</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600">{stats.active}</div>
              <div className="text-gray-600">Still Active</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600">{stats.outOfBusiness}</div>
              <div className="text-gray-600">Out of Business</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Products</h2>
            <Link href="/products" className="text-blue-600 hover:underline">View all →</Link>
          </div>
          
          {products.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    <StatusBadge status={product.status} />
                  </div>
                  {product.tagline && (
                    <p className="text-sm text-gray-600 mb-2">{product.tagline}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {product.season && `Season ${product.season}`}
                    {product.shark_names?.length > 0 && ` • ${product.shark_names.join(', ')}`}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border rounded-lg">
              No products yet. Run the seed script to populate data.
            </div>
          )}
        </div>
      </section>

      <section className="py-12 px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">The Sharks</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sharks.map(shark => (
              <Link
                key={shark.id}
                href={`/sharks/${shark.slug}`}
                className="text-center p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-2xl mb-2">
                  {shark.name.charAt(0)}
                </div>
                <div className="font-semibold text-sm">{shark.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

