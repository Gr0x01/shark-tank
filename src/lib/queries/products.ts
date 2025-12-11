import { createClient, createStaticClient } from '@/lib/supabase/server'
import type { ProductWithSharks, ProductStatus, DealOutcome, Category, Product } from '@/lib/supabase/types'
import { sanitizeSearchQuery } from '@/lib/utils/search'

export interface ProductFilters {
  status?: ProductStatus
  dealOutcome?: DealOutcome
  season?: number
  categorySlug?: string
  sharkSlug?: string
  search?: string
  limit?: number
  offset?: number
}

export async function getProducts(filters: ProductFilters = {}): Promise<ProductWithSharks[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('products_with_sharks')
    .select('*')
    .order('air_date', { ascending: false, nullsFirst: false })
  
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.dealOutcome) {
    query = query.eq('deal_outcome', filters.dealOutcome)
  }
  
  if (filters.season) {
    query = query.eq('season', filters.season)
  }
  
  if (filters.categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.categorySlug)
      .single()
    
    const cat = category as Category | null
    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }
  
  if (filters.sharkSlug) {
    query = query.contains('shark_slugs', [filters.sharkSlug])
  }
  
  if (filters.search) {
    const sanitizedSearch = sanitizeSearchQuery(filters.search)
    query = query.or(`name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%`)
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit)
  }
  
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

export async function getProductBySlug(slug: string): Promise<{
  product: ProductWithSharks
  sharkPhotos: Record<string, string>
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const product = data as ProductWithSharks
  const sharkNames = product.shark_names || []
  const sharkPhotos: Record<string, string> = {}

  // Fetch shark photos if there are sharks
  if (sharkNames.length > 0) {
    const { data: sharks } = await supabase
      .from('sharks')
      .select('name, photo_url')
      .in('name', sharkNames)

    if (sharks) {
      for (const shark of sharks as { name: string; photo_url: string | null }[]) {
        if (shark.photo_url) {
          sharkPhotos[shark.name] = shark.photo_url
        }
      }
    }
  }

  return { product, sharkPhotos }
}

export async function getProductsBySeason(season: number): Promise<ProductWithSharks[]> {
  return getProducts({ season })
}

export async function getProductsByEpisode(
  season: number,
  episodeNumber: number,
  excludeSlug: string
): Promise<ProductWithSharks[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('season', season)
    .eq('episode_number', episodeNumber)
    .neq('slug', excludeSlug)

  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

/**
 * Get product slugs for generateStaticParams (build-time, no cookies).
 */
export async function getProductSlugs(limit = 100): Promise<string[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .order('air_date', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map((p: { slug: string }) => p.slug)
}

export async function getActiveProducts(limit = 20): Promise<ProductWithSharks[]> {
  return getProducts({ status: 'active', limit })
}

export async function getRecentProducts(limit = 10): Promise<ProductWithSharks[]> {
  return getProducts({ limit })
}

export async function getProductStats() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('status, deal_outcome')
  
  if (error) throw error
  
  const products = (data as Pick<Product, 'status' | 'deal_outcome'>[]) || []
  
  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    outOfBusiness: products.filter(p => p.status === 'out_of_business').length,
    gotDeal: products.filter(p => p.deal_outcome === 'deal').length,
    noDeal: products.filter(p => p.deal_outcome === 'no_deal').length,
  }
  
  return stats
}

export async function getTopDeals(limit = 5): Promise<ProductWithSharks[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('deal_outcome', 'deal')
    .not('deal_amount', 'is', null)
    .order('deal_amount', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

export async function getFeaturedDeal(): Promise<ProductWithSharks | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('deal_outcome', 'deal')
    .eq('status', 'active')
    .not('deal_amount', 'is', null)
    .order('deal_amount', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as ProductWithSharks
}

export async function getSuccessStories(limit = 4): Promise<ProductWithSharks[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('deal_outcome', 'deal')
    .eq('status', 'active')
    .not('deal_amount', 'is', null)
    .order('deal_amount', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

export async function getLatestEpisodeProducts(limit = 4): Promise<{
  episode: { season: number; episode_number: number; air_date: string | null } | null
  products: ProductWithSharks[]
  sharkPhotos: Record<string, string>
}> {
  const supabase = await createClient()
  
  const { data: latestProduct, error: episodeError } = await supabase
    .from('products_with_sharks')
    .select('*')
    .not('season', 'is', null)
    .not('episode_number', 'is', null)
    .order('season', { ascending: false })
    .order('episode_number', { ascending: false })
    .limit(1)
    .single()
  
  if (episodeError || !latestProduct) {
    return { episode: null, products: [], sharkPhotos: {} }
  }
  
  const product = latestProduct as ProductWithSharks
  
  const { data: products, error: productsError } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('season', product.season as number)
    .eq('episode_number', product.episode_number as number)
    .limit(limit)
  
  if (productsError) throw productsError
  
  const typedProducts = (products as ProductWithSharks[]) || []
  const allSharkNames = [...new Set(typedProducts.flatMap(p => p.shark_names || []))]
  
  const sharkPhotos: Record<string, string> = {}
  
  if (allSharkNames.length > 0) {
    const { data: sharks } = await supabase
      .from('sharks')
      .select('name, photo_url')
      .in('name', allSharkNames)
    
    if (sharks) {
      for (const shark of sharks as { name: string; photo_url: string | null }[]) {
        if (shark.photo_url) {
          sharkPhotos[shark.name] = shark.photo_url
        }
      }
    }
  }
  
  return {
    episode: {
      season: product.season as number,
      episode_number: product.episode_number as number,
      air_date: product.air_date
    },
    products: typedProducts,
    sharkPhotos
  }
}

export async function getTrendingProducts(limit = 6): Promise<ProductWithSharks[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('status', 'active')
    .eq('deal_outcome', 'deal')
    .not('amazon_url', 'is', null)
    .order('deal_amount', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

export async function getSeasonProducts(season: number, limit = 24): Promise<{
  products: ProductWithSharks[]
  sharkPhotos: Record<string, string>
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('season', season)
    .order('episode_number', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit)

  if (error) throw error

  const products = (data as ProductWithSharks[]) || []
  const allSharkNames = [...new Set(products.flatMap(p => p.shark_names || []))]

  const sharkPhotos: Record<string, string> = {}

  if (allSharkNames.length > 0) {
    const { data: sharks } = await supabase
      .from('sharks')
      .select('name, photo_url')
      .in('name', allSharkNames)

    if (sharks) {
      for (const shark of sharks as { name: string; photo_url: string | null }[]) {
        if (shark.photo_url) {
          sharkPhotos[shark.name] = shark.photo_url
        }
      }
    }
  }

  return { products, sharkPhotos }
}

export async function getSharkPhotos(): Promise<Record<string, string>> {
  const supabase = await createClient()

  const { data: sharks } = await supabase
    .from('sharks')
    .select('name, photo_url')
    .not('photo_url', 'is', null)

  const sharkPhotos: Record<string, string> = {}
  if (sharks) {
    for (const shark of sharks as { name: string; photo_url: string | null }[]) {
      if (shark.photo_url) {
        sharkPhotos[shark.name] = shark.photo_url
      }
    }
  }
  return sharkPhotos
}
