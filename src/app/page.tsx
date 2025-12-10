import Link from 'next/link'
import { getProductStats, getTopDeals, getTrendingProducts, getLatestEpisodeProducts } from '@/lib/queries/products'
import { getSharks } from '@/lib/queries/sharks'
import { getCategories } from '@/lib/queries/categories'
import { SharkImage } from '@/components/ui/SharkImage'
import { EpisodeHero } from '@/components/ui/EpisodeHero'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'

function formatMoney(amount: number | null): string {
  if (!amount) return '$0'
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export default async function Home() {
  const [stats, sharks, categories, topDeals, trending, latestEpisode] = await Promise.all([
    getProductStats(),
    getSharks(),
    getCategories(),
    getTopDeals(3),
    getTrendingProducts(6),
    getLatestEpisodeProducts(4),
  ])

  return (
    <main className="min-h-screen">
      <EpisodeHero episode={latestEpisode.episode} products={latestEpisode.products} />

      <section className="py-4 bg-[var(--ink-900)] overflow-hidden">
        <div className="stats-ticker">
          <div className="stats-ticker-content">
            <span className="ticker-stat"><strong>{stats.total}</strong> Products Tracked</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--gold)]">{stats.gotDeal}</strong> Deals Made</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--success-light)]">{stats.active}</strong> Still Active</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong>{stats.total}</strong> Products Tracked</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--gold)]">{stats.gotDeal}</strong> Deals Made</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--success-light)]">{stats.active}</strong> Still Active</span>
            <span className="ticker-divider">◆</span>
          </div>
        </div>
      </section>

      {trending.length > 0 && (
        <section className="trending-section">
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="trending-header">
              <div>
                <p className="section-label mb-3">Shop Now</p>
                <h2 className="trending-title">Trending Products</h2>
              </div>
              <Link href="/products?status=active" className="trending-link">
                View all →
              </Link>
            </div>
            
            <div className="product-grid asymmetric stagger-children">
              {trending.map((product, i) => (
                <ProductCardCommerce 
                  key={product.id} 
                  product={product} 
                  showTrending={i < 3}
                  rank={i < 3 ? i + 1 : undefined}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {topDeals.length > 0 && (
        <section className="deals-section">
          <div className="max-w-6xl mx-auto px-6">
            <div className="deals-header">
              <div>
                <p className="section-label mb-3">Biggest Investments</p>
                <h2 className="trending-title">Top Deals</h2>
              </div>
              <Link href="/products?deal=true" className="trending-link">
                All deals →
              </Link>
            </div>
            
            <div className="deals-grid stagger-children">
              {topDeals.map((deal, i) => (
                <Link
                  key={deal.id}
                  href={`/products/${deal.slug}`}
                  className="deal-card"
                >
                  <span className="rank">#{i + 1}</span>
                  <div className="deal-amount">
                    {formatMoney(deal.deal_amount)}
                  </div>
                  <h3 className="deal-name">{deal.name}</h3>
                  {deal.shark_names && deal.shark_names.length > 0 && (
                    <p className="deal-shark">{deal.shark_names.join(' & ')}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="sharks-section">
        <div className="max-w-6xl mx-auto px-6">
          <div className="sharks-header">
            <p className="section-label mb-3">The Investors</p>
            <h2 className="trending-title">Meet the Sharks</h2>
          </div>
          <div className="sharks-grid stagger-children">
            {sharks.map((shark) => (
              <Link
                key={shark.id}
                href={`/sharks/${shark.slug}`}
                className="shark-card"
              >
                <SharkImage 
                  src={shark.photo_url}
                  name={shark.name}
                  size="lg"
                  className="mx-auto shark-photo"
                />
                <p className="shark-name">{shark.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="category-section">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="section-label mb-3">Browse</p>
            <h2 className="trending-title">Shop by Category</h2>
          </div>
          <div className="category-pills">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="category-pill"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="max-w-4xl mx-auto px-6 cta-content">
          <h2 className="cta-title">
            Find Your Next Favorite Product
          </h2>
          <p className="cta-text">
            {stats.total} Shark Tank products. {stats.active} still in business. All in one place.
          </p>
          <Link href="/products" className="btn-shop">
            Browse All Products
          </Link>
        </div>
      </section>
    </main>
  )
}
