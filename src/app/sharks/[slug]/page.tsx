import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSharkBySlug, getSharkStats, getSharkProducts, getSharks } from '@/lib/queries/sharks'
import { StatusBadge } from '@/components/ui/StatusBadge'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const shark = await getSharkBySlug(slug)
  
  if (!shark) {
    return { title: 'Shark Not Found' }
  }

  return {
    title: shark.seo_title || `${shark.name} | Shark Tank Products`,
    description: shark.meta_description || `Explore ${shark.name}'s Shark Tank portfolio and investments`,
  }
}

export async function generateStaticParams() {
  const sharks = await getSharks()
  return sharks.map(s => ({ slug: s.slug }))
}

export default async function SharkPage({ params }: Props) {
  const { slug } = await params
  const [shark, stats, products] = await Promise.all([
    getSharkBySlug(slug),
    getSharkStats(slug),
    getSharkProducts(slug),
  ])

  if (!shark) {
    notFound()
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/sharks" className="text-sm text-blue-600 hover:underline">
            ← All Sharks
          </Link>
        </div>

        <div className="flex items-start gap-6 mb-8">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-4xl shrink-0">
            {shark.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-4xl font-bold">{shark.name}</h1>
            {shark.investment_style && (
              <p className="text-xl text-gray-600 mt-1">{shark.investment_style}</p>
            )}
            {shark.bio && (
              <p className="text-gray-700 mt-3">{shark.bio}</p>
            )}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{stats.total_deals}</div>
              <div className="text-gray-500">Total Deals</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">
                {stats.total_invested ? `$${(stats.total_invested / 1000000).toFixed(1)}M` : '-'}
              </div>
              <div className="text-gray-500">Total Invested</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.active_companies}</div>
              <div className="text-gray-500">Active Companies</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">
                {stats.success_rate ? `${stats.success_rate}%` : '-'}
              </div>
              <div className="text-gray-500">Success Rate</div>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4">Portfolio ({products.length} companies)</h2>
          
          {products.length > 0 ? (
            <div className="space-y-3">
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="flex items-center justify-between border rounded-lg p-4 hover:shadow transition-shadow"
                >
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.tagline && (
                      <p className="text-sm text-gray-600">{product.tagline}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Season {product.season}
                      {product.deal_amount && ` • $${product.deal_amount.toLocaleString()} for ${product.deal_equity}%`}
                    </p>
                  </div>
                  <StatusBadge status={product.status} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No portfolio data available yet.</p>
          )}
        </section>
      </div>
    </main>
  )
}

