import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug, getProductSlugs, getProductsByEpisode, getSharkPhotos } from '@/lib/queries/products'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProductImage } from '@/components/ui/ProductImage'
import { DealRevealSection } from '@/components/ui/DealRevealSection'
import { MidPageCTA } from '@/components/ui/MidPageCTA'
import { WhereToBuySection } from '@/components/ui/WhereToBuySection'
import { StickyCTABar } from '@/components/ui/StickyCTABar'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import { addAmazonAffiliateTag } from '@/lib/utils'
import { createProductOffers, escapeJsonLd } from '@/lib/seo/schemas'

type Props = {
  params: Promise<{ slug: string }>
}

interface NarrativeContent {
  origin_story?: string | null
  pitch_journey?: string | null
  deal_dynamics?: string | null
  after_tank?: string | null
  current_status?: string | null
  where_to_buy?: string | null
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await getProductBySlug(slug)

  if (!result) {
    return { title: 'Product Not Found' }
  }

  const { product } = result

  // SEO-optimized title with deal status
  const dealStatus = product.deal_outcome === 'deal'
    ? product.deal_amount
      ? `Got $${product.deal_amount.toLocaleString()} Deal`
      : 'Got a Deal'
    : product.deal_outcome === 'no_deal'
      ? 'No Deal'
      : product.deal_outcome === 'unknown'
        ? 'Deal Pending on Shark Tank'
        : 'Deal Fell Through'

  const businessStatus = product.status === 'active'
    ? 'Still in Business'
    : product.status === 'out_of_business'
      ? 'Out of Business'
      : ''

  const titleParts = [product.name, 'Shark Tank', dealStatus, businessStatus].filter(Boolean)
  const title = product.seo_title || titleParts.slice(0, 3).join(' | ')

  const description = product.meta_description || product.pitch_summary || product.tagline ||
    `${product.name} appeared on Shark Tank Season ${product.season}. Find out what happened and where to buy.`

  // Generate SEO keywords
  const keywords = [
    product.name,
    'Shark Tank',
    `Season ${product.season}`,
    ...(product.shark_names || []),
    product.deal_outcome === 'deal' ? 'got deal' : product.deal_outcome === 'no_deal' ? 'no deal' : '',
    product.status === 'active' ? 'still in business' : product.status === 'out_of_business' ? 'out of business' : '',
    'where to buy',
    'update',
  ].filter(Boolean).join(', ')

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: `${product.name} - Shark Tank`,
      description: product.pitch_summary || product.tagline || '',
      images: product.photo_url ? [{ url: product.photo_url }] : [],
      type: 'website',
      siteName: 'Shark Tank Products',
      url: `/products/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} - Shark Tank`,
      description: product.pitch_summary || product.tagline || description,
      images: product.photo_url ? [product.photo_url] : [],
    },
    alternates: {
      canonical: `/products/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  const slugs = await getProductSlugs(100)
  return slugs.map(slug => ({ slug }))
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const result = await getProductBySlug(slug)

  if (!result) {
    notFound()
  }

  const { product } = result
  const narrative = product.narrative_content as NarrativeContent | null
  const hasNarrative = narrative && Object.values(narrative).some(v => v)

  // Fetch related products and all shark photos in parallel
  const [relatedProducts, sharkPhotos] = await Promise.all([
    product.season && product.episode_number
      ? getProductsByEpisode(product.season, product.episode_number, slug)
      : Promise.resolve([]),
    getSharkPhotos(),
  ])

  // Build sharks array for DealRevealSection
  const sharks = (product.shark_names || []).map((name, i) => ({
    name,
    slug: product.shark_slugs?.[i] || '',
    photoUrl: sharkPhotos[name] || null,
  }))

  // JSON-LD Structured Data
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.meta_description || product.tagline || product.pitch_summary,
    image: product.photo_url,
    brand: {
      '@type': 'Brand',
      name: product.company_name || product.name,
    },
    offers: createProductOffers({
      slug: product.slug,
      amazonUrl: product.amazon_url,
      websiteUrl: product.website_url,
      currentPrice: product.current_price,
      status: product.status,
    }),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: product.name },
    ],
  }

  const faqJsonLd = narrative?.current_status ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: `Is ${product.name} still in business?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: narrative.current_status,
      },
    }],
  } : null

  // Get best available date for "last updated"
  const lastUpdatedDate = product.last_verified || product.last_enriched_at || product.updated_at

  // Convert Amazon URL to affiliate link
  const affiliateAmazonUrl = addAmazonAffiliateTag(product.amazon_url)

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLd(productJsonLd)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLd(breadcrumbJsonLd)
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: escapeJsonLd(faqJsonLd)
          }}
        />
      )}

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="product-hero">
          <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="product-breadcrumb-list">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/products">Products</Link></li>
                <li aria-current="page">{product.name}</li>
              </ol>
            </nav>

          <div className="grid lg:grid-cols-[340px_1fr] gap-10 lg:gap-16">
            {/* Product Image */}
            <div className="product-hero-image">
              <ProductImage
                src={product.photo_url}
                alt={product.name}
                size="xl"
              />
            </div>

            {/* Product Info */}
            <div className="product-hero-info">
              {/* Episode Badge + Status Badge */}
              <div className="product-episode-meta">
                {product.season && (
                  <span className="product-episode-badge">
                    Season {product.season}{product.episode_number ? `, Episode ${product.episode_number}` : ''}
                  </span>
                )}
                {product.status && (
                  <StatusBadge status={product.status} verbose />
                )}
              </div>
              {product.air_date && (
                <time className="product-air-date" dateTime={product.air_date}>
                  Aired {new Date(product.air_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </time>
              )}

              <h1 className="product-title">{product.name}</h1>

              {product.company_name && product.company_name !== product.name && (
                <p className="product-company">by {product.company_name}</p>
              )}

              {product.tagline && (
                <p className="product-tagline">{product.tagline}</p>
              )}

              {/* Deal Reveal Section - Spoiler Protected */}
              <DealRevealSection
                dealOutcome={product.deal_outcome}
                dealAmount={product.deal_amount}
                dealEquity={product.deal_equity}
                askingAmount={product.asking_amount}
                askingEquity={product.asking_equity}
                sharks={sharks}
              />

              {/* CTA Buttons */}
              {(affiliateAmazonUrl || product.website_url) && (
                <div className="product-cta-row">
                  {affiliateAmazonUrl ? (
                    <a
                      href={affiliateAmazonUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="btn-amazon"
                    >
                      <svg className="btn-amazon-icon" viewBox="0 0 35.418 35.418" fill="currentColor">
                        <path d="M20.948,9.891c-0.857,0.068-1.847,0.136-2.837,0.269c-1.516,0.195-3.032,0.461-4.284,1.053c-2.439,0.994-4.088,3.105-4.088,6.209c0,3.898,2.506,5.875,5.669,5.875c1.057,0,1.913-0.129,2.703-0.328c1.255-0.396,2.31-1.123,3.562-2.441c0.727,0.99,0.923,1.453,2.177,2.509c0.329,0.133,0.658,0.133,0.922-0.066c0.791-0.659,2.174-1.848,2.901-2.508c0.328-0.267,0.263-0.66,0.066-0.992c-0.727-0.924-1.45-1.718-1.45-3.498v-5.943c0-2.513,0.195-4.822-1.647-6.537c-1.518-1.391-3.891-1.916-5.735-1.916c-0.264,0-0.527,0-0.792,0c-3.362,0.197-6.921,1.647-7.714,5.811c-0.13,0.525,0.267,0.726,0.53,0.793l3.691,0.464c0.396-0.07,0.593-0.398,0.658-0.73c0.333-1.449,1.518-2.176,2.836-2.309c0.067,0,0.133,0,0.265,0c0.79,0,1.646,0.332,2.109,0.987c0.523,0.795,0.461,1.853,0.461,2.775L20.948,9.891L20.948,9.891z M20.223,17.749c-0.461,0.925-1.253,1.519-2.11,1.718c-0.131,0-0.327,0.068-0.526,0.068c-1.45,0-2.31-1.123-2.31-2.775c0-2.11,1.254-3.104,2.836-3.565c0.857-0.197,1.847-0.265,2.836-0.265v0.793C20.948,15.243,21.01,16.43,20.223,17.749z M35.418,26.918v0.215c-0.035,1.291-0.716,3.768-2.328,5.131c-0.322,0.25-0.645,0.107-0.503-0.254c0.469-1.145,1.541-3.803,1.04-4.412c-0.355-0.465-1.826-0.43-3.079-0.322c-0.572,0.072-1.075,0.105-1.469,0.183c-0.357,0.033-0.431-0.287-0.071-0.537c0.466-0.323,0.969-0.573,1.541-0.756c2.039-0.608,4.406-0.25,4.729,0.146C35.348,26.414,35.418,26.629,35.418,26.918z M32.016,29.428c-0.466,0.357-0.965,0.682-1.468,0.973c-3.761,2.261-8.631,3.441-12.856,3.441c-6.807,0-12.895-2.512-17.514-6.709c-0.396-0.324-0.073-0.789,0.393-0.539C5.549,29.5,11.709,31.26,18.084,31.26c4.013,0,8.342-0.754,12.463-2.371c0.285-0.104,0.608-0.252,0.895-0.356C32.087,28.242,32.661,28.965,32.016,29.428z"/>
                      </svg>
                      Buy on Amazon
                    </a>
                  ) : null}
                  {product.website_url && (
                    <a
                      href={product.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={affiliateAmazonUrl ? "btn-cta-secondary" : "btn-cta-primary"}
                    >
                      Official Website
                    </a>
                  )}
                </div>
              )}

              {lastUpdatedDate && (
                <p className="product-verified">
                  {product.last_verified ? 'Last verified' : 'Last updated'}{' '}
                  {new Date(lastUpdatedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Narrative Content */}
      {hasNarrative && (
        <article className="product-narrative">
          <div className="max-w-3xl mx-auto px-6">
            {narrative?.origin_story && (
              <section className="narrative-section">
                <h2 className="narrative-heading">The Origin Story</h2>
                <p className="narrative-text">{narrative.origin_story}</p>
              </section>
            )}

            {/* Mid-page CTA - catch scrollers after emotional hook */}
            <MidPageCTA
              productName={product.name}
              season={product.season}
              amazonUrl={product.amazon_url}
              websiteUrl={product.website_url}
              lastVerified={product.last_verified}
            />

            {narrative?.pitch_journey && (
              <section className="narrative-section">
                <h2 className="narrative-heading">Inside the Tank</h2>
                <p className="narrative-text">{narrative.pitch_journey}</p>
              </section>
            )}

            {narrative?.deal_dynamics && (
              <section className="narrative-section">
                <h2 className="narrative-heading">
                  {product.deal_outcome === 'deal' ? 'Making the Deal' :
                   product.deal_outcome === 'no_deal' ? 'Why No Deal' :
                   'The Negotiation'}
                </h2>
                <p className="narrative-text">{narrative.deal_dynamics}</p>
              </section>
            )}

            {narrative?.after_tank && (
              <section className="narrative-section">
                <h2 className="narrative-heading">{product.name} After Shark Tank</h2>
                <p className="narrative-text">{narrative.after_tank}</p>
              </section>
            )}

            {narrative?.current_status && (
              <section className="narrative-section">
                <h2 className="narrative-heading">Is {product.name} Still in Business?</h2>
                <p className="narrative-text">{narrative.current_status}</p>
              </section>
            )}

            {narrative?.where_to_buy && (
              <section className="narrative-section">
                <p className="narrative-text">{narrative.where_to_buy}</p>
              </section>
            )}
          </div>
        </article>
      )}

      {/* Fallback content if no narrative */}
      {!hasNarrative && (
        <div className="max-w-3xl mx-auto px-6 py-12">
          {product.pitch_summary && (
            <section className="narrative-section">
              <h2 className="narrative-heading">About {product.name}</h2>
              <p className="narrative-text">{product.pitch_summary}</p>
            </section>
          )}

          {product.founder_names && product.founder_names.length > 0 && (
            <section className="narrative-section">
              <h2 className="narrative-heading">The Founders</h2>
              <p className="text-[var(--ink-700)] font-display font-medium mb-2">
                {product.founder_names.join(', ')}
              </p>
              {product.founder_story && (
                <p className="narrative-text">{product.founder_story}</p>
              )}
            </section>
          )}

          {product.description && (
            <section className="narrative-section">
              <h2 className="narrative-heading">Product Description</h2>
              <p className="narrative-text">{product.description}</p>
            </section>
          )}
        </div>
      )}

      {/* Where to Buy Section - Final conversion zone */}
      <WhereToBuySection
        productName={product.name}
        season={product.season}
        amazonUrl={product.amazon_url}
        websiteUrl={product.website_url}
        lastVerified={product.last_verified}
      />

      {/* Revenue Stats (if available) */}
      {(product.lifetime_revenue || product.annual_revenue) && (
        <section className="product-revenue-section">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="narrative-heading">Business Performance</h2>
            <div className="product-revenue-grid">
              {product.lifetime_revenue && (
                <div className="product-revenue-stat">
                  <span className="product-revenue-value">
                    ${(product.lifetime_revenue / 1000000).toFixed(1)}M
                  </span>
                  <span className="product-revenue-label">Lifetime Revenue</span>
                </div>
              )}
              {product.annual_revenue && (
                <div className="product-revenue-stat">
                  <span className="product-revenue-value">
                    ${(product.annual_revenue / 1000000).toFixed(1)}M
                  </span>
                  <span className="product-revenue-label">
                    Annual Revenue {product.revenue_year ? `(${product.revenue_year})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* More From This Episode */}
      {product.season && relatedProducts.length > 0 && (
        <section className="product-related-section">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="related-heading">More from This Episode</h2>
            <div className="related-products-grid">
              {relatedProducts.map(p => (
                <ProductCardCommerce key={p.id} product={p} sharkPhotos={sharkPhotos} />
              ))}
            </div>

            <Link href={`/seasons/${product.season}`} className="btn-cta-primary mt-6">
              View All Season {product.season} Products
            </Link>
          </div>
        </section>
      )}

      {/* Sticky CTA Bar - Mobile only */}
      <StickyCTABar
        productName={product.name}
        amazonUrl={product.amazon_url}
        websiteUrl={product.website_url}
        dealOutcome={product.deal_outcome}
        dealAmount={product.deal_amount}
      />
    </main>
    </>
  )
}
