import { promises as fs } from 'fs'
import path from 'path'
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

/**
 * Load SEO page content from JSON file
 * @param slug - The page slug (e.g., 'still-in-business')
 * @returns The page content or null if not found
 */
export async function loadSEOContent(slug: string): Promise<SEOPageContent | null> {
  try {
    const filePath = path.join(process.cwd(), 'content', 'seo-pages', `${slug}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content)
    const validated = SEOPageContentSchema.parse(parsed)
    return validated
  } catch (error) {
    console.error(`Failed to load SEO content for ${slug}:`, error)
    return null
  }
}

/**
 * Check if SEO content exists for a given slug
 * @param slug - The page slug
 * @returns true if the content file exists
 */
export async function seoContentExists(slug: string): Promise<boolean> {
  try {
    const filePath = path.join(process.cwd(), 'content', 'seo-pages', `${slug}.json`)
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
