import { Metadata } from 'next'
import Link from 'next/link'
import { getSeasons, getSeasonStats, getEpisodesBySeason } from '@/lib/queries/episodes'
import { getProductsBySeason } from '@/lib/queries/products'
import { StatusBadge } from '@/components/ui/StatusBadge'

type Props = {
  params: Promise<{ number: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params
  
  return {
    title: `Season ${number} | Shark Tank Products`,
    description: `All products from Shark Tank Season ${number}. See what deals were made and which companies are still in business.`,
  }
}

export async function generateStaticParams() {
  const seasons = await getSeasons()
  return seasons.map(n => ({ number: n.toString() }))
}

export default async function SeasonPage({ params }: Props) {
  const { number } = await params
  const seasonNum = parseInt(number)
  
  const [products, stats, episodes] = await Promise.all([
    getProductsBySeason(seasonNum),
    getSeasonStats(seasonNum),
    getEpisodesBySeason(seasonNum),
  ])

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/seasons" className="text-sm text-blue-600 hover:underline">
            ← All Seasons
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">Season {number}</h1>
        <p className="text-gray-600 mb-8">
          {stats.total} products • {stats.deals} deals • {stats.active} still active
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-gray-500">Products</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.deals}</div>
            <div className="text-gray-500">Got Deals</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <div className="text-gray-500">Still Active</div>
          </div>
        </div>

        {episodes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Episodes</h2>
            <div className="flex flex-wrap gap-2">
              {episodes.map(ep => (
                <Link
                  key={ep.id}
                  href={`/episodes/${ep.season}/${ep.episode_number}`}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  Ep {ep.episode_number}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4">Products</h2>
          
          {products.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="border rounded-lg p-4 hover:shadow transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    <StatusBadge status={product.status} />
                  </div>
                  {product.tagline && (
                    <p className="text-sm text-gray-600 mb-2">{product.tagline}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {product.deal_outcome === 'deal' ? (
                      <span className="text-green-600">Deal with {product.shark_names?.join(', ')}</span>
                    ) : product.deal_outcome === 'no_deal' ? (
                      <span className="text-red-600">No Deal</span>
                    ) : (
                      'Unknown'
                    )}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No products found for this season.</p>
          )}
        </section>
      </div>
    </main>
  )
}

