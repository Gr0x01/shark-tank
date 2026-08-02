import { MetadataRoute } from 'next'
import { createStaticClient } from '@/lib/supabase/server'
import { PRODUCTS_PER_PAGE } from '@/lib/seo/constants'

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

/**
 * PostgREST caps an unbounded select at 1000 rows. The catalogue passed that on
 * Aug 2, 2026 and the sitemap silently dropped ~595 products — no error, just a
 * short list. Page through explicitly so the sitemap can't quietly truncate again.
 */
async function selectAll<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: () => any,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1)
    if (error) throw new Error(`sitemap query failed: ${error.message}`)
    if (!data?.length) break
    rows.push(...(data as T[]))
    if (data.length < pageSize) break
  }
  return rows
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient()

  // Fetch all product slugs
  const products = await selectAll<ProductSlug>(() =>
    supabase.from('products').select('slug, updated_at').order('slug')
  )

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

  // Fetch all seasons. This reads one row per product, so the 1000-row cap bit here
  // too: ordered by season descending, the first 1000 rows only reached season 7 and
  // the sitemap advertised 12 seasons instead of 17.
  const seasons = await selectAll<SeasonData>(() =>
    supabase.from('products').select('season').not('season', 'is', null).order('season', { ascending: false })
  )

  // Get unique seasons
  const uniqueSeasons = [...new Set(seasons.map(s => s.season))]

  // Fetch all episodes
  const episodes = await selectAll<EpisodeSlug>(() =>
    supabase
      .from('episodes')
      .select('season, episode_number')
      .order('season', { ascending: false })
      .order('episode_number', { ascending: false })
  )

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Pages 2..N of the unfiltered directory. Without these the only route to the back of
    // the catalogue is clicking Next repeatedly, which buries those products however many
    // pages deep they happen to sit.
    ...Array.from(
      { length: Math.max(0, Math.ceil((products?.length || 0) / PRODUCTS_PER_PAGE) - 1) },
      (_, i): MetadataRoute.Sitemap[number] => ({
        url: `${SITE_URL}/products?page=${i + 2}`,
        changeFrequency: 'daily',
        priority: 0.5,
      })
    ),
    {
      url: `${SITE_URL}/sharks`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/seasons`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/still-in-business`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/out-of-business`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/success-stories`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/how-to-apply`,
      changeFrequency: 'yearly',
      priority: 0.6,
    },

    // === Content Hubs ===
    {
      url: `${SITE_URL}/categories`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/best-deals`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // === Deal Filters ===
    {
      url: `${SITE_URL}/deals/under-100k`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/deals/100k-to-500k`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/deals/over-500k`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },

    // === Informational Pages ===
    {
      url: `${SITE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // === Legal Pages ===
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Product pages
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    ...(product.updated_at && { lastModified: new Date(product.updated_at) }),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Shark pages
  const sharkPages: MetadataRoute.Sitemap = (sharks as SharkSlug[] || []).map((shark) => ({
    url: `${SITE_URL}/sharks/${shark.slug}`,
    ...(shark.updated_at && { lastModified: new Date(shark.updated_at) }),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = (categories as CategorySlug[] || []).map((category) => ({
    url: `${SITE_URL}/categories/${category.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Season pages
  const seasonPages: MetadataRoute.Sitemap = uniqueSeasons.map((season) => ({
    url: `${SITE_URL}/seasons/${season}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Episode pages
  const episodePages: MetadataRoute.Sitemap = episodes.map((episode) => ({
    url: `${SITE_URL}/episodes/${episode.season}/${episode.episode_number}`,
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
