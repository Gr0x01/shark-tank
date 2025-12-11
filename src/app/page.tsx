import Link from 'next/link'
import { getProductStats, getRecentProducts, getLatestEpisodeProducts } from '@/lib/queries/products'
import { getCategories } from '@/lib/queries/categories'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import { LatestEpisodeSection } from '@/components/ui/LatestEpisodeSection'

export default async function Home() {
  const [stats, categories, products, latestEpisode] = await Promise.all([
    getProductStats(),
    getCategories(),
    getRecentProducts(12),
    getLatestEpisodeProducts(4),
  ])

  const currentSeason = latestEpisode.episode?.season || 16

  return (
    <main className="min-h-screen bg-[var(--warm-white)]">
      <section className="hero-search">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="hero-headline">
            Every Shark Tank Product.<br />
            <span className="text-[var(--coral)]">Know What&apos;s Still in Business.</span>
          </h1>
          <p className="hero-subtext">
            {stats.total} products tracked &middot; {stats.active} still active &middot; Updated weekly
          </p>
          <form action="/products" method="GET" className="hero-search-form">
            <div className="hero-search-wrapper">
              <svg className="hero-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                name="q"
                placeholder="Search Scrub Daddy, Bombas, Ring..."
                className="hero-search-input"
              />
              <button type="submit" className="hero-search-btn">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="category-nav">
        <div className="max-w-6xl mx-auto px-6">
          <div className="category-nav-inner">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="category-nav-link"
              >
                {cat.name}
              </Link>
            ))}
            <Link href={`/seasons/${currentSeason}`} className="category-nav-link category-nav-season">
              Season {currentSeason}
            </Link>
            <Link href="/products" className="category-nav-link category-nav-all">
              All Products
            </Link>
          </div>
        </div>
      </section>

      {latestEpisode.episode && (
        <LatestEpisodeSection 
          episode={latestEpisode.episode} 
          products={latestEpisode.products} 
        />
      )}

      <section className="products-main">
        <div className="max-w-6xl mx-auto px-6">
          <div className="products-header">
            <h2 className="products-title">Recently Aired</h2>
            <Link href="/products" className="products-link">
              View all {stats.total} →
            </Link>
          </div>
          
          <div className="products-grid-home">
            {products.map((product) => (
              <ProductCardCommerce 
                key={product.id} 
                product={product}
              />
            ))}
          </div>

          <div className="products-cta">
            <Link href="/products" className="btn-browse">
              Browse All Products
            </Link>
          </div>
        </div>
      </section>

      <section className="season-browser">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="season-browser-title">Browse by Season</h3>
          <div className="season-browser-list">
            {Array.from({ length: currentSeason }, (_, i) => currentSeason - i).map((season) => (
              <Link
                key={season}
                href={`/seasons/${season}`}
                className={`season-browser-link ${season === currentSeason ? 'current' : ''}`}
              >
                Season {season}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bottom-cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="bottom-cta-text">
            <span className="text-[var(--success)]">{stats.active}</span> active businesses · 
            <span className="text-[var(--gold)]"> {stats.gotDeal}</span> got deals · 
            <span className="text-[var(--ink-400)]"> {stats.outOfBusiness}</span> out of business
          </p>
        </div>
      </section>
    </main>
  )
}
