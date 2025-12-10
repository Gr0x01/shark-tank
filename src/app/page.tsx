import Link from 'next/link'
import { getRecentProducts, getProductStats, getTopDeals, getFeaturedDeal, getSuccessStories } from '@/lib/queries/products'
import { getSharks } from '@/lib/queries/sharks'
import { getCategories } from '@/lib/queries/categories'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProductImage } from '@/components/ui/ProductImage'
import { SharkImage } from '@/components/ui/SharkImage'

function formatMoney(amount: number | null): string {
  if (!amount) return '$0'
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export default async function Home() {
  const [products, stats, sharks, categories, topDeals, featuredDeal, successStories] = await Promise.all([
    getRecentProducts(6),
    getProductStats(),
    getSharks(),
    getCategories(),
    getTopDeals(5),
    getFeaturedDeal(),
    getSuccessStories(4),
  ])

  return (
    <main className="min-h-screen">
      <section className="hero-gradient py-24 lg:py-32 px-6 relative overflow-hidden">
        <div className="hero-grid" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label mb-4 animate-in">The Complete Directory</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-6 animate-in animate-delay-1">
                Every <span className="text-gradient">Shark Tank</span> Product
              </h1>
              <p className="text-xl text-[var(--ink-500)] mb-10 animate-in animate-delay-2">
                Track deals, find what&apos;s still in business, and see which shark invested.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 animate-in animate-delay-3">
                <Link href="/products" className="btn-primary">
                  Browse All Products
                </Link>
                <Link href="/sharks" className="btn-secondary">
                  Meet the Sharks
                </Link>
              </div>
            </div>
            
            {featuredDeal && (
              <div className="animate-in animate-delay-2">
                <div className="featured-deal-card">
                  <div className="featured-deal-badge">Featured Deal</div>
                  <Link href={`/products/${featuredDeal.slug}`} className="block">
                    <div className="flex gap-5">
                      <ProductImage 
                        src={featuredDeal.photo_url} 
                        alt={featuredDeal.name}
                        size="lg"
                        className="shrink-0 featured-product-img"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-xl text-[var(--ink-900)] mb-1">
                          {featuredDeal.name}
                        </h3>
                        {featuredDeal.tagline && (
                          <p className="text-[var(--ink-500)] text-sm mb-3 line-clamp-2">{featuredDeal.tagline}</p>
                        )}
                        <div className="deal-amount-badge">
                          {formatMoney(featuredDeal.deal_amount)}
                        </div>
                        {featuredDeal.shark_names && featuredDeal.shark_names.length > 0 && (
                          <p className="text-[var(--cyan-600)] font-display text-sm mt-2">
                            {featuredDeal.shark_names.join(' & ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-8 bg-[var(--ink-900)] overflow-hidden">
        <div className="stats-ticker">
          <div className="stats-ticker-content">
            <span className="ticker-stat"><strong>{stats.total}</strong> Products Tracked</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--cyan-500)]">{stats.gotDeal}</strong> Deals Made</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--success)]">{stats.active}</strong> Still Active</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong>{stats.total}</strong> Products Tracked</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--cyan-500)]">{stats.gotDeal}</strong> Deals Made</span>
            <span className="ticker-divider">◆</span>
            <span className="ticker-stat"><strong className="text-[var(--success)]">{stats.active}</strong> Still Active</span>
            <span className="ticker-divider">◆</span>
          </div>
        </div>
      </section>

      {topDeals.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="section-label mb-2">Biggest Investments</p>
                <h2 className="text-2xl md:text-3xl font-medium">Top Deals</h2>
              </div>
              <Link 
                href="/products?deal=true" 
                className="text-[var(--cyan-600)] font-display text-sm font-medium hover:underline underline-offset-4"
              >
                View all deals →
              </Link>
            </div>
            
            <div className="top-deals-grid">
              {topDeals.map((deal, i) => (
                <Link
                  key={deal.id}
                  href={`/products/${deal.slug}`}
                  className={`top-deal-card ${i === 0 ? 'top-deal-featured' : ''}`}
                >
                  <div className="top-deal-rank">#{i + 1}</div>
                  <div className="flex items-center gap-4">
                    <ProductImage 
                      src={deal.photo_url} 
                      alt={deal.name}
                      size={i === 0 ? 'lg' : 'md'}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-display font-medium text-[var(--ink-900)] ${i === 0 ? 'text-xl' : 'text-base'}`}>
                        {deal.name}
                      </h3>
                      <div className={`deal-amount ${i === 0 ? 'text-2xl' : 'text-lg'}`}>
                        {formatMoney(deal.deal_amount)}
                      </div>
                      {deal.shark_names && deal.shark_names.length > 0 && (
                        <p className="text-[var(--ink-400)] font-display text-xs mt-1">
                          {deal.shark_names.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {i === 0 && deal.tagline && (
                    <p className="text-[var(--ink-500)] text-sm mt-3 line-clamp-2">{deal.tagline}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-6 bg-warm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-2">The Investors</p>
            <h2 className="text-2xl md:text-3xl font-medium">Meet the Sharks</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {sharks.map((shark) => (
              <Link
                key={shark.id}
                href={`/sharks/${shark.slug}`}
                className="shark-card group"
              >
                <SharkImage 
                  src={shark.photo_url}
                  name={shark.name}
                  size="lg"
                  className="mx-auto mb-4 shark-photo"
                />
                <div className="font-display font-medium text-sm text-[var(--ink-800)] group-hover:text-[var(--cyan-600)] transition-colors text-center">
                  {shark.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {successStories.length > 0 && (
        <section className="py-20 px-6 success-section">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="section-label-light mb-2">Thriving Businesses</p>
              <h2 className="text-2xl md:text-3xl font-medium text-white">Success Stories</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {successStories.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="success-card group"
                >
                  <div className="success-card-glow" />
                  <ProductImage 
                    src={product.photo_url} 
                    alt={product.name}
                    size="lg"
                    className="mx-auto mb-4"
                  />
                  <h3 className="font-display font-medium text-white text-center mb-1 group-hover:text-[var(--cyan-500)] transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <StatusBadge status="active" />
                    {product.deal_amount && (
                      <span className="text-[var(--cyan-500)] font-display text-sm font-medium">
                        {formatMoney(product.deal_amount)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="section-label mb-2">Latest Additions</p>
              <h2 className="text-2xl md:text-3xl font-medium">Recent Products</h2>
            </div>
            <Link 
              href="/products" 
              className="text-[var(--cyan-600)] font-display text-sm font-medium hover:underline underline-offset-4"
            >
              View all →
            </Link>
          </div>
          
          {products.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
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
                        <h3 className="font-display font-medium text-[var(--ink-900)] truncate group-hover:text-[var(--cyan-600)] transition-colors">
                          {product.name}
                        </h3>
                        <StatusBadge status={product.status} />
                      </div>
                      {product.tagline && (
                        <p className="text-[var(--ink-500)] text-sm mb-2 line-clamp-2">{product.tagline}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        {product.season && (
                          <span className="text-[var(--ink-400)] font-display text-xs">
                            S{product.season}
                          </span>
                        )}
                        {product.shark_names && product.shark_names.length > 0 && (
                          <>
                            <span className="text-[var(--ink-300)]">·</span>
                            <span className="text-[var(--cyan-600)] font-display text-xs truncate">
                              {product.shark_names.join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--ink-400)] card">
              <p className="font-display">No products yet. Run the seed script to populate data.</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-6 bg-warm">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <p className="section-label mb-2">Explore</p>
            <h2 className="text-2xl md:text-3xl font-medium">Browse by Category</h2>
          </div>
          <div className="flex flex-wrap gap-3">
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

      <section className="py-20 px-6 cta-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-medium text-white mb-4">
            Never Miss a Deal
          </h2>
          <p className="text-[var(--ink-300)] text-lg mb-8 max-w-xl mx-auto">
            Track every product from every episode with real-time status updates.
          </p>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div>
              <div className="cta-icon">✓</div>
              <h3 className="font-display font-medium text-white mb-2">Status Verified</h3>
              <p className="text-[var(--ink-400)] text-sm">Every product tracked with last-verified dates</p>
            </div>
            <div>
              <div className="cta-icon">$</div>
              <h3 className="font-display font-medium text-white mb-2">Deal Details</h3>
              <p className="text-[var(--ink-400)] text-sm">Investment amounts, equity, and valuations</p>
            </div>
            <div>
              <div className="cta-icon">→</div>
              <h3 className="font-display font-medium text-white mb-2">Where to Buy</h3>
              <p className="text-[var(--ink-400)] text-sm">Amazon, retail stores, and direct links</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
