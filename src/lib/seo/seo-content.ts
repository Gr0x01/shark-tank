import { z } from 'zod'
import { hasStatTokens, substituteTokens, type ContentStats } from './tokens'

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
  stats: z.record(z.string(), z.any()).optional()
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
 * Resolve the stats used to fill catalogue figures in generated copy.
 *
 * Fetched lazily so the legal and About pages — which cite no figures — keep working
 * with no database dependency at all. If the live query fails, the snapshot saved when
 * the page was generated is used rather than shipping raw `{total}` tokens to readers.
 */
async function resolveStats(
  needsStats: boolean,
  snapshot: Record<string, unknown> | undefined
): Promise<ContentStats | undefined> {
  if (!needsStats) return undefined

  try {
    const { getProductStats } = await import('@/lib/queries/cached')
    return await getProductStats()
  } catch (error) {
    console.error('Live stats unavailable, falling back to generated snapshot:', error)
    return snapshot ? (snapshot as unknown as ContentStats) : undefined
  }
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

    const loadedModule = await loader()
    // Handle both default export and direct export
    const content = (loadedModule as { default?: unknown }).default || loadedModule
    const validated = SEOPageContentSchema.parse(content)

    const raw = JSON.stringify(validated.content)
    const stats = await resolveStats(hasStatTokens(raw), validated.stats)

    // Substituting here rather than in each template means a page can't render raw
    // tokens by forgetting to call it — there is exactly one path to this content.
    const sub = (text: string) => substituteTokens(text, stats)

    return {
      ...validated,
      title: sub(validated.title),
      meta_description: sub(validated.meta_description),
      content: {
        introduction: sub(validated.content.introduction),
        sections: validated.content.sections?.map(section => ({
          heading: sub(section.heading),
          content: sub(section.content),
        })),
      },
    }
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
