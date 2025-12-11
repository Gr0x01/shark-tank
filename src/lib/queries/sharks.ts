import { createClient, createStaticClient } from '@/lib/supabase/server'
import type {
  Shark,
  SharkStats,
  ProductWithSharks,
  SharkCoInvestor,
  TimelineEntry,
  LeaderboardShark,
  ProductStatus,
  DealOutcome
} from '@/lib/supabase/types'

export async function getSharks(options?: { mainOnly?: boolean }): Promise<Shark[]> {
  const supabase = await createClient()

  let query = supabase
    .from('sharks')
    .select('*')
    .order('is_guest_shark', { ascending: true }) // Main sharks first
    .order('name')

  if (options?.mainOnly) {
    query = query.eq('is_guest_shark', false)
  }

  const { data, error } = await query

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

export interface SharkProductFilters {
  status?: ProductStatus
  dealOutcome?: DealOutcome
  season?: number
  categorySlug?: string
}

export async function getSharkProducts(
  slug: string,
  filters?: SharkProductFilters
): Promise<ProductWithSharks[]> {
  const supabase = await createClient()

  let query = supabase
    .from('products_with_sharks')
    .select('*')
    .contains('shark_slugs', [slug])
    .order('air_date', { ascending: false, nullsFirst: false })

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.dealOutcome) {
    query = query.eq('deal_outcome', filters.dealOutcome)
  }

  if (filters?.season) {
    query = query.eq('season', filters.season)
  }

  if (filters?.categorySlug) {
    // Need to join with categories table
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.categorySlug)
      .single()

    type CategoryData = { id: string }
    const cat = category as CategoryData | null

    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }

  const { data, error } = await query

  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

/**
 * Get top performing products for a shark (active companies with highest deal amounts)
 */
export async function getSharkTopPerformers(
  slug: string,
  limit = 3
): Promise<ProductWithSharks[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .contains('shark_slugs', [slug])
    .eq('status', 'active')
    .eq('deal_outcome', 'deal')
    .not('deal_amount', 'is', null)
    .order('deal_amount', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

/**
 * Get recent failures for a shark (out of business within last 2-3 years)
 */
export async function getSharkRecentFailures(
  slug: string,
  limit = 3
): Promise<ProductWithSharks[]> {
  const supabase = await createClient()

  // Get failures from the last 3 years
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .contains('shark_slugs', [slug])
    .eq('status', 'out_of_business')
    .eq('deal_outcome', 'deal')
    .gte('air_date', threeYearsAgo.toISOString())
    .order('air_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

/**
 * Get co-investors for a shark with deal counts and success rates
 */
export async function getSharkCoInvestors(slug: string): Promise<SharkCoInvestor[]> {
  const supabase = await createClient()

  // Get all products this shark invested in
  const { data: products, error } = await supabase
    .from('products_with_sharks')
    .select('id, slug, shark_names, shark_slugs, status')
    .contains('shark_slugs', [slug])

  if (error || !products) return []

  type PartialProduct = {
    id: string
    slug: string
    shark_names: string[]
    shark_slugs: string[]
    status: string
  }

  // Count co-investors
  const coInvestorMap = new Map<string, { count: number; active: number; name: string; slug: string }>()

  for (const product of products as PartialProduct[]) {
    const coSharks = product.shark_slugs.filter((s: string) => s !== slug)
    const coNames = product.shark_names.filter((_: string, i: number) => product.shark_slugs[i] !== slug)

    for (let i = 0; i < coSharks.length; i++) {
      const coSlug = coSharks[i]
      const coName = coNames[i]

      if (!coInvestorMap.has(coSlug)) {
        coInvestorMap.set(coSlug, { count: 0, active: 0, name: coName, slug: coSlug })
      }

      const stats = coInvestorMap.get(coSlug)!
      stats.count++
      if (product.status === 'active') {
        stats.active++
      }
    }
  }

  // Filter to co-investors with at least 3 deals and calculate success rate
  const coInvestors = Array.from(coInvestorMap.entries())
    .filter(([_, stats]) => stats.count >= 3)
    .map(([coSlug, stats]) => ({
      slug: coSlug,
      name: stats.name,
      deal_count: stats.count,
      success_rate: Math.round((stats.active / stats.count) * 1000) / 10 // Round to 1 decimal
    }))
    .sort((a, b) => b.deal_count - a.deal_count)
    .slice(0, 5)

  // Fetch full shark data for these co-investors
  if (coInvestors.length === 0) return []

  const { data: sharks } = await supabase
    .from('sharks')
    .select('id, name, slug, photo_url')
    .in('slug', coInvestors.map(c => c.slug))

  if (!sharks) return []

  type SharkData = { id: string; name: string; slug: string; photo_url: string | null }

  // Map full shark data to co-investor results
  return coInvestors
    .map(coInv => {
      const shark = (sharks as SharkData[]).find((s: SharkData) => s.slug === coInv.slug)
      if (!shark) return null

      return {
        id: shark.id,
        name: shark.name,
        slug: shark.slug,
        photo_url: shark.photo_url,
        deal_count: coInv.deal_count,
        success_rate: coInv.success_rate
      } as SharkCoInvestor
    })
    .filter((s: SharkCoInvestor | null): s is SharkCoInvestor => s !== null)
}

/**
 * Get investment timeline grouped by season
 */
export async function getSharkTimeline(slug: string): Promise<TimelineEntry[]> {
  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .contains('shark_slugs', [slug])
    .not('season', 'is', null)
    .order('season', { ascending: false })
    .order('air_date', { ascending: false })

  if (error) throw error

  const productList = (products as ProductWithSharks[]) || []

  // Group by season
  const timeline: TimelineEntry[] = []
  const seasonMap = new Map<number, ProductWithSharks[]>()

  for (const product of productList) {
    if (product.season) {
      if (!seasonMap.has(product.season)) {
        seasonMap.set(product.season, [])
      }
      seasonMap.get(product.season)!.push(product)
    }
  }

  // Convert to array and extract year from first product in each season
  for (const [season, products] of seasonMap.entries()) {
    const year = products[0]?.air_date
      ? new Date(products[0].air_date).getFullYear()
      : null

    timeline.push({
      season,
      year,
      products
    })
  }

  // Sort by season descending
  timeline.sort((a, b) => b.season - a.season)

  return timeline
}

/**
 * Get leaderboard sharks (top by deals, success rate, total invested)
 */
export async function getLeaderboardSharks(): Promise<{
  mostDeals: LeaderboardShark | null
  highestSuccess: LeaderboardShark | null
  biggestInvestor: LeaderboardShark | null
}> {
  const supabase = await createClient()

  type MostDealsData = { id: string; name: string; slug: string; total_deals: number }
  type HighestSuccessData = { id: string; name: string; slug: string; success_rate: number }
  type BiggestInvestorData = { id: string; name: string; slug: string; total_invested: number }

  // Most deals
  const { data: mostDealsRaw } = await supabase
    .from('shark_stats')
    .select('id, name, slug, total_deals')
    .order('total_deals', { ascending: false })
    .limit(1)
    .single()
  const mostDealsData = mostDealsRaw as MostDealsData | null

  // Highest success rate (only sharks with 10+ deals)
  const { data: highestSuccessRaw } = await supabase
    .from('shark_stats')
    .select('id, name, slug, success_rate')
    .gte('total_deals', 10)
    .not('success_rate', 'is', null)
    .order('success_rate', { ascending: false })
    .limit(1)
    .single()
  const highestSuccessData = highestSuccessRaw as HighestSuccessData | null

  // Biggest investor
  const { data: biggestInvestorRaw } = await supabase
    .from('shark_stats')
    .select('id, name, slug, total_invested')
    .not('total_invested', 'is', null)
    .order('total_invested', { ascending: false })
    .limit(1)
    .single()
  const biggestInvestorData = biggestInvestorRaw as BiggestInvestorData | null

  // Fetch photo URLs for each shark
  const sharkIds = [
    mostDealsData?.id,
    highestSuccessData?.id,
    biggestInvestorData?.id
  ].filter(Boolean) as string[]

  const { data: sharks } = await supabase
    .from('sharks')
    .select('id, photo_url')
    .in('id', sharkIds)

  type SharkPhoto = { id: string; photo_url: string | null }

  const photoMap = new Map(
    ((sharks as SharkPhoto[]) || []).map((s: SharkPhoto) => [s.id, s.photo_url])
  )

  return {
    mostDeals: mostDealsData
      ? {
          id: mostDealsData.id,
          name: mostDealsData.name,
          slug: mostDealsData.slug,
          photo_url: photoMap.get(mostDealsData.id) || null,
          stat_value: mostDealsData.total_deals,
          stat_type: 'deals' as const
        }
      : null,
    highestSuccess: highestSuccessData
      ? {
          id: highestSuccessData.id,
          name: highestSuccessData.name,
          slug: highestSuccessData.slug,
          photo_url: photoMap.get(highestSuccessData.id) || null,
          stat_value: highestSuccessData.success_rate || 0,
          stat_type: 'success_rate' as const
        }
      : null,
    biggestInvestor: biggestInvestorData
      ? {
          id: biggestInvestorData.id,
          name: biggestInvestorData.name,
          slug: biggestInvestorData.slug,
          photo_url: photoMap.get(biggestInvestorData.id) || null,
          stat_value: biggestInvestorData.total_invested || 0,
          stat_type: 'total_invested' as const
        }
      : null
  }
}
