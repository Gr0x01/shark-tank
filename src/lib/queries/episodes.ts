import { createClient, createStaticClient } from '@/lib/supabase/server'
import type { Episode, ProductWithSharks, Product } from '@/lib/supabase/types'

export async function getSeasons(): Promise<number[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('season')
    .not('season', 'is', null)
    .order('season', { ascending: false })

  if (error) throw error

  const products = (data as Pick<Product, 'season'>[]) || []
  const seasons = [...new Set(products.map(p => p.season).filter((s): s is number => s !== null))]
  return seasons
}

/**
 * Get season numbers for generateStaticParams (build-time, no cookies).
 */
export async function getSeasonNumbers(): Promise<number[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('products')
    .select('season')
    .not('season', 'is', null)
    .order('season', { ascending: false })

  if (error) throw error

  const products = (data as Pick<Product, 'season'>[]) || []
  return [...new Set(products.map(p => p.season).filter((s): s is number => s !== null))]
}

export async function getEpisodesBySeason(season: number): Promise<Episode[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('season', season)
    .order('episode_number')
  
  if (error) throw error
  return (data as Episode[]) || []
}

export async function getEpisode(season: number, episodeNumber: number): Promise<Episode | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('season', season)
    .eq('episode_number', episodeNumber)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data as Episode
}

export async function getEpisodeProducts(season: number, episodeNumber: number): Promise<ProductWithSharks[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('season', season)
    .eq('episode_number', episodeNumber)
    .order('name')
  
  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

export async function getLatestEpisode(): Promise<Episode | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('air_date', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data as Episode
}

export async function getSeasonStats(season: number) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('status, deal_outcome')
    .eq('season', season)
  
  if (error) throw error
  
  const products = (data as Pick<Product, 'status' | 'deal_outcome'>[]) || []
  
  return {
    total: products.length,
    deals: products.filter(p => p.deal_outcome === 'deal').length,
    active: products.filter(p => p.status === 'active').length,
  }
}
