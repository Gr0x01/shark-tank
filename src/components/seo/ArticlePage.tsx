import type { ProductWithSharks } from '@/lib/supabase/types'
import { ProductListCard } from '@/components/ui/ProductListCard'
import type { SEOPageSection } from '@/lib/seo/seo-content'
import DOMPurify from 'isomorphic-dompurify'

interface ArticlePageProps {
  title: string
  description?: string
  introduction: string
  sections: SEOPageSection[]
  relatedProducts?: ProductWithSharks[]
  sharkPhotos?: Record<string, string>
}

export function ArticlePage({
  title,
  description,
  introduction,
  sections,
  relatedProducts,
}: ArticlePageProps) {
  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Article Header */}
            <div className="mb-12">
              <p className="section-label mb-2">Shark Tank Guide</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4">{title}</h1>

              {description && (
                <p className="text-lg text-[var(--ink-600)] leading-relaxed">{description}</p>
              )}
            </div>

            {/* Article Content */}
            <article className="prose prose-lg max-w-none">
              {/* Introduction */}
              <div
                className="text-[var(--ink-700)] leading-relaxed mb-12 text-lg"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(introduction, {
                    ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br', 'h2', 'h3', 'h4'],
                    ALLOWED_ATTR: ['href', 'target', 'rel']
                  })
                }}
              />

              {/* Sections */}
              {sections.map((section, index) => (
                <section
                  key={index}
                  className="mb-12"
                  aria-labelledby={`article-section-${index}`}
                >
                  <h2
                    id={`article-section-${index}`}
                    className="text-2xl md:text-3xl font-medium text-[var(--ink-900)] mb-4 mt-8"
                  >
                    {section.heading}
                  </h2>
                  <div
                    className="text-[var(--ink-700)] leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(section.content, {
                        ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br', 'h3', 'h4'],
                        ALLOWED_ATTR: ['href', 'target', 'rel']
                      })
                    }}
                  />
                </section>
              ))}
            </article>
          </div>

          {/* Sidebar */}
          {relatedProducts && relatedProducts.length > 0 && (
            <aside className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="text-lg font-medium text-[var(--ink-900)] mb-4">
                  Related Products
                </h3>
                <div className="space-y-4">
                  {relatedProducts.slice(0, 5).map(product => (
                    <ProductListCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  )
}
