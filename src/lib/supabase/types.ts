export type ProductStatus = 'active' | 'out_of_business' | 'acquired' | 'unknown'
export type EnrichmentStatus = 'pending' | 'enriched' | 'failed' | 'stale'
export type DealOutcome = 'deal' | 'no_deal' | 'deal_fell_through' | 'unknown'
export type DealType = 'equity' | 'royalty' | 'loan' | 'equity_plus_royalty' | 'equity_plus_loan' | 'contingent' | 'unknown'

export interface NarrativeContent {
  origin_story?: string | null
  pitch_journey?: string | null
  deal_dynamics?: string | null
  after_tank?: string | null
  current_status?: string | null
  where_to_buy?: string | null
}

export interface SharkNarrativeContent {
  biography?: string | null
  investment_philosophy?: string | null
  shark_tank_journey?: string | null
  notable_deals?: string | null
  beyond_the_tank?: string | null
}

export function isSharkNarrative(content: unknown): content is SharkNarrativeContent {
  if (!content || typeof content !== 'object') return false
  const obj = content as Record<string, unknown>
  return Object.values(obj).some(v => typeof v === 'string' && v.length > 0)
}

export interface Shark {
  id: string
  name: string
  slug: string
  bio: string | null
  seo_title: string | null
  meta_description: string | null
  investment_style: string | null
  photo_url: string | null
  seasons_active: number[] | null
  is_guest_shark: boolean
  social_urls: Record<string, string>
  narrative_content: SharkNarrativeContent | null
  narrative_version: number | null
  narrative_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  meta_description: string | null
  parent_id: string | null
  created_at: string
}

export interface Episode {
  id: string
  season: number
  episode_number: number
  air_date: string | null
  title: string | null
  description: string | null
  seo_title: string | null
  meta_description: string | null
  guest_sharks: string[]
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  company_name: string | null
  tagline: string | null
  description: string | null
  episode_id: string | null
  season: number | null
  episode_number: number | null
  air_date: string | null
  founder_names: string[] | null
  founder_story: string | null
  category_id: string | null
  asking_amount: number | null
  asking_equity: number | null
  asking_valuation: number | null
  deal_outcome: DealOutcome
  deal_amount: number | null
  deal_equity: number | null
  deal_valuation: number | null
  royalty_deal: boolean
  royalty_terms: string | null
  deal_notes: string | null
  status: ProductStatus
  last_verified: string | null
  verification_notes: string | null
  last_activity_date: string | null
  revenue_estimate: string | null
  website_url: string | null
  amazon_url: string | null
  retail_availability: Record<string, unknown>
  social_urls: Record<string, string>
  price_range: string | null
  current_price: number | null
  original_pitch_price: number | null
  photo_url: string | null
  video_url: string | null
  seo_title: string | null
  meta_description: string | null
  pitch_summary: string | null
  outcome_story: string | null
  affiliate_links: Record<string, string>
  enrichment_status: EnrichmentStatus
  enrichment_source: string | null
  last_enriched_at: string | null
  deal_type: DealType
  royalty_percent: number | null
  lifetime_revenue: number | null
  annual_revenue: number | null
  revenue_year: number | null
  narrative_content: NarrativeContent | null
  narrative_version: number | null
  narrative_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface ProductWithSharks extends Product {
  shark_names: string[]
  shark_slugs: string[]
}

export interface SharkStats {
  id: string
  name: string
  slug: string
  total_deals: number
  total_invested: number | null
  active_companies: number
  failed_companies: number
  success_rate: number | null
}

export interface ProductShark {
  id: string
  product_id: string
  shark_id: string
  investment_amount: number | null
  equity_percentage: number | null
  is_lead_investor: boolean
  notes: string | null
  created_at: string
}

export interface SharkCoInvestor {
  id: string
  name: string
  slug: string
  photo_url: string | null
  deal_count: number
  success_rate: number | null
}

export interface TimelineEntry {
  season: number
  year: number | null
  products: ProductWithSharks[]
}

export interface LeaderboardShark {
  id: string
  name: string
  slug: string
  photo_url: string | null
  stat_value: number
  stat_type: 'deals' | 'success_rate' | 'total_invested'
}

export type Database = {
  public: {
    Tables: {
      sharks: {
        Row: Shark
        Insert: Omit<Shark, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Shark, 'id'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id'>>
      }
      episodes: {
        Row: Episode
        Insert: Omit<Episode, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Episode, 'id'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'asking_valuation' | 'deal_valuation'>
        Update: Partial<Omit<Product, 'id' | 'asking_valuation' | 'deal_valuation'>>
      }
      product_sharks: {
        Row: ProductShark
        Insert: Omit<ProductShark, 'id' | 'created_at'>
        Update: Partial<Omit<ProductShark, 'id'>>
      }
    }
    Views: {
      products_with_sharks: {
        Row: ProductWithSharks
      }
      shark_stats: {
        Row: SharkStats
      }
    }
  }
}
