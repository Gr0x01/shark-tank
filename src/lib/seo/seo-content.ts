import { z } from 'zod'

export interface SEOPageSection {
  heading: string
  content: string
}

export interface SEOPageContent {
  slug: string
  title: string
  meta_description: string
  keywords?: string[]
  generated_at: string
  version: number
  content: {
    introduction: string
    sections?: SEOPageSection[]
  }
  stats?: Record<string, unknown>
}

const SEOPageContentSchema = z.object({
  slug: z.string(),
  title: z.string(),
  meta_description: z.string(),
  keywords: z.array(z.string()).optional(),
  generated_at: z.string(),
  version: z.number(),
  content: z.object({
    introduction: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      content: z.string()
    })).optional()
  }),
  stats: z.record(z.any()).optional()
})

// Map of valid SEO page slugs to their import functions
// Using dynamic imports ensures JSON files are bundled at build time
// Path is relative from src/lib/seo/ to content/seo-pages/
const seoContentLoaders: Record<string, () => Promise<unknown>> = {
  'still-in-business': () => import('../../../content/seo-pages/still-in-business.json'),
  'out-of-business': () => import('../../../content/seo-pages/out-of-business.json'),
  'best-deals': () => import('../../../content/seo-pages/best-deals.json'),
  'success-stories': () => import('../../../content/seo-pages/success-stories.json'),
  'deals-under-100k': () => import('../../../content/seo-pages/deals-under-100k.json'),
  'deals-100k-to-500k': () => import('../../../content/seo-pages/deals-100k-to-500k.json'),
  'deals-over-500k': () => import('../../../content/seo-pages/deals-over-500k.json'),
  'how-to-apply': () => import('../../../content/seo-pages/how-to-apply.json'),
  'about': () => import('../../../content/seo-pages/about.json'),
  'privacy': () => import('../../../content/seo-pages/privacy.json'),
  'terms': () => import('../../../content/seo-pages/terms.json'),
}

/**
 * Load SEO page content using dynamic imports
 * This ensures JSON files are bundled at build time and available on Vercel
 * @param slug - The page slug (e.g., 'still-in-business')
 * @returns The page content or null if not found
 */
export async function loadSEOContent(slug: string): Promise<SEOPageContent | null> {
  try {
    const loader = seoContentLoaders[slug]
    if (!loader) {
      console.error(`No SEO content loader found for slug: ${slug}`)
      return null
    }

    const module = await loader()
    // Handle both default export and direct export
    const content = (module as { default?: unknown }).default || module
    const validated = SEOPageContentSchema.parse(content)
    return validated
  } catch (error) {
    console.error(`Failed to load SEO content for ${slug}:`, error)
    return null
  }
}

/**
 * Check if SEO content exists for a given slug
 * @param slug - The page slug
 * @returns true if the content is available
 */
export async function seoContentExists(slug: string): Promise<boolean> {
  return slug in seoContentLoaders
}
