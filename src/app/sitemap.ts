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

interface EpisodeSlug {
  season: number
  episode_number: number
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

  // Fetch all episodes
  const { data: episodes } = await supabase
    .from('episodes')
    .select('season, episode_number')
    .order('season', { ascending: false })
    .order('episode_number', { ascending: false })

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
    {
      url: `${SITE_URL}/still-in-business`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/out-of-business`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/success-stories`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/how-to-apply`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.6,
    },

    // === Content Hubs ===
    {
      url: `${SITE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/best-deals`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // === Deal Filters ===
    {
      url: `${SITE_URL}/deals/under-100k`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/deals/100k-to-500k`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/deals/over-500k`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },

    // === Informational Pages ===
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // === Legal Pages ===
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
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

  // Episode pages
  const episodePages: MetadataRoute.Sitemap = (episodes as EpisodeSlug[] || []).map((episode) => ({
    url: `${SITE_URL}/episodes/${episode.season}/${episode.episode_number}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [
    ...staticPages,
    ...productPages,
    ...sharkPages,
    ...categoryPages,
    ...seasonPages,
    ...episodePages,
  ]
}
