import { MetadataRoute } from 'next'
import { createStaticClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'

interface ProductSlug {
  slug: string
  updated_at: string | null
}

interface SharkSlug {
  slug: string
  updated_at: string | null
}

interface CategorySlug {
  slug: string
}

interface SeasonData {
  season: number
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient()

  // Fetch all product slugs
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .order('slug')

  // Fetch all shark slugs
  const { data: sharks } = await supabase
    .from('sharks')
    .select('slug, updated_at')
    .order('slug')

  // Fetch all category slugs
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')
    .order('slug')

  // Fetch all seasons
  const { data: seasons } = await supabase
    .from('products')
    .select('season')
    .not('season', 'is', null)
    .order('season', { ascending: false })

  // Get unique seasons
  const uniqueSeasons = [...new Set((seasons as SeasonData[] || []).map(s => s.season))]

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sharks`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/seasons`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  // Product pages
  const productPages: MetadataRoute.Sitemap = (products as ProductSlug[] || []).map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Shark pages
  const sharkPages: MetadataRoute.Sitemap = (sharks as SharkSlug[] || []).map((shark) => ({
    url: `${SITE_URL}/sharks/${shark.slug}`,
    lastModified: shark.updated_at ? new Date(shark.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = (categories as CategorySlug[] || []).map((category) => ({
    url: `${SITE_URL}/categories/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Season pages
  const seasonPages: MetadataRoute.Sitemap = uniqueSeasons.map((season) => ({
    url: `${SITE_URL}/seasons/${season}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [
    ...staticPages,
    ...productPages,
    ...sharkPages,
    ...categoryPages,
    ...seasonPages,
  ]
}
