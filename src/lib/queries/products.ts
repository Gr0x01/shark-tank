import { createClient } from '@/lib/supabase/server'
import type { ProductWithSharks, ProductStatus, DealOutcome, Category, Product } from '@/lib/supabase/types'

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
    const escapedSearch = filters.search.replace(/[%_\\]/g, '\\$&')
    query = query.or(`name.ilike.%${escapedSearch}%,company_name.ilike.%${escapedSearch}%`)
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

export async function getProductBySlug(slug: string): Promise<ProductWithSharks | null> {
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
  
  return data as ProductWithSharks
}

export async function getProductsBySeason(season: number): Promise<ProductWithSharks[]> {
  return getProducts({ season })
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
