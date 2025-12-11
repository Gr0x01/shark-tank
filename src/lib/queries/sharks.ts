import { createClient, createStaticClient } from '@/lib/supabase/server'
import type { Shark, SharkStats, ProductWithSharks } from '@/lib/supabase/types'

export async function getSharks(): Promise<Shark[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sharks')
    .select('*')
    .eq('is_guest_shark', false)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Get shark slugs for generateStaticParams (build-time, no cookies).
 */
export async function getSharkSlugs(): Promise<string[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('sharks')
    .select('slug')
    .eq('is_guest_shark', false)

  if (error) throw error
  return (data || []).map((s: { slug: string }) => s.slug)
}

export async function getSharkBySlug(slug: string): Promise<Shark | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sharks')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data
}

export async function getSharkStats(slug: string): Promise<SharkStats | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('shark_stats')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data as SharkStats
}

export async function getAllSharkStats(): Promise<SharkStats[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('shark_stats')
    .select('*')
    .order('total_deals', { ascending: false })
  
  if (error) throw error
  return (data as SharkStats[]) || []
}

export async function getSharkProducts(slug: string): Promise<ProductWithSharks[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .contains('shark_slugs', [slug])
    .order('air_date', { ascending: false, nullsFirst: false })
  
  if (error) throw error
  return (data as ProductWithSharks[]) || []
}
