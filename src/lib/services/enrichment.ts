import { createClient, SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { z } from 'zod'
import crypto from 'crypto'
import type { Database } from '../supabase/types'
import { scrapeProductPhoto } from './photo-scraper'

// --- Supabase Admin Client ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabase = SupabaseClient<any, any, any>

function getAdminSupabase(): UntypedSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  // Use untyped client to access all tables including search_cache
  return createClient(url, key)
}

// --- OpenAI Client ---
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is required')
  return new OpenAI({
    apiKey,
    defaultHeaders: { 'X-Model-Tier': 'flex' },
  })
}

// --- Tavily Search ---
interface TavilyResult {
  title: string
  url: string
  content: string
  score?: number
}

async function searchTavily(query: string, maxResults = 10): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY is required')

  // Check cache first
  const supabase = getAdminSupabase()
  const queryHash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex')

  // Check cache
  const { data: cached } = await supabase
    .from('search_cache')
    .select('results')
    .eq('query_hash', queryHash)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (cached?.results) {
    console.log('[Enrichment] Cache hit for search')
    return cached.results as TavilyResult[]
  }

  console.log('[Enrichment] Tavily search:', query.substring(0, 50))

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      include_raw_content: false,
      max_results: maxResults,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Tavily error: ${response.status} ${text}`)
  }

  const data = await response.json()
  const results: TavilyResult[] = data.results || []

  // Cache results
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Cache results (ignore errors)
  try {
    await supabase.from('search_cache').insert({
      entity_type: 'product',
      query,
      query_hash: queryHash,
      results,
      result_count: results.length,
      source: 'tavily',
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
  } catch {
    // Ignore cache write errors
  }

  return results
}

// --- LLM Synthesis ---
function extractJsonFromText(text: string): string {
  let cleaned = text.trim()

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }

  cleaned = cleaned.trim()

  // Find matching brace for object
  if (cleaned.startsWith('{')) {
    let depth = 0
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++
      if (cleaned[i] === '}') {
        depth--
        if (depth === 0) return cleaned.substring(0, i + 1)
      }
    }
  }

  // Look for object start
  const objectStart = cleaned.indexOf('{')
  if (objectStart !== -1) {
    let depth = 0
    for (let i = objectStart; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++
      if (cleaned[i] === '}') {
        depth--
        if (depth === 0) return cleaned.substring(objectStart, i + 1)
      }
    }
  }

  return cleaned
}

async function synthesize<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>
): Promise<{ data: T | null; success: boolean; error?: string }> {
  const openai = getOpenAI()
  const model = 'gpt-4.1-mini'

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    })

    const text = response.choices[0]?.message?.content || ''
    if (!text.trim()) {
      return { data: null, success: false, error: 'Empty response' }
    }

    const jsonText = extractJsonFromText(text)
    const parsed = JSON.parse(jsonText)
    const validated = schema.parse(parsed)

    return { data: validated, success: true }
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// --- Deal Info Schema ---
const DealInfoSchema = z.object({
  dealOutcome: z.enum(['deal', 'no_deal', 'deal_fell_through', 'unknown']),
  askingAmount: z.number().nullable(),
  askingEquity: z.number().nullable(),
  dealAmount: z.number().nullable(),
  dealEquity: z.number().nullable(),
  sharks: z.array(z.object({
    name: z.string(),
    amount: z.number().nullable(),
    equity: z.number().nullable(),
  })),
  confidence: z.enum(['high', 'medium', 'low']),
})

type DealInfo = z.infer<typeof DealInfoSchema>

const DEAL_SEARCH_PROMPT = `You are extracting Shark Tank deal information. Based on the search results, extract ONLY the deal outcome and terms.

Return ONLY valid JSON:
{
  "dealOutcome": "deal" | "no_deal" | "deal_fell_through" | "unknown",
  "askingAmount": number in dollars or null,
  "askingEquity": percentage (e.g., 10 for 10%) or null,
  "dealAmount": number in dollars or null,
  "dealEquity": percentage or null,
  "sharks": [{"name": "Shark Name", "amount": dollars or null, "equity": percent or null}],
  "confidence": "high" | "medium" | "low"
}

IMPORTANT:
- Only extract information you are CONFIDENT about from the search results
- Set confidence to "high" only if the deal outcome is explicitly stated
- Set confidence to "low" if information is ambiguous or conflicting
- If truly unknown, use "unknown" for dealOutcome and "low" for confidence
- Do NOT make up deal terms
- In "sharks", list ONLY those who closed the final accepted deal and actually invested. Exclude any shark who merely made an offer that was declined or beaten, counter-offered, negotiated, or expressed interest without being part of the accepted deal. Most deals involve exactly one shark; only list several when they explicitly went in together`

const SHARK_NAME_MAP: Record<string, string> = {
  'mark cuban': 'mark-cuban',
  'barbara corcoran': 'barbara-corcoran',
  'daymond john': 'daymond-john',
  "kevin o'leary": 'kevin-oleary',
  'kevin oleary': 'kevin-oleary',
  'mr. wonderful': 'kevin-oleary',
  'lori greiner': 'lori-greiner',
  'robert herjavec': 'robert-herjavec',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Shark names arrive from the model with curly apostrophes and occasional honorifics
 * ("Kevin O’Leary", "Sir Richard Branson") while the tables hold straight ones. Any
 * lookup miss silently creates a duplicate guest shark, which is how a second Kevin
 * O'Leary record collected 17 deals during the Aug 2026 catalogue backfill.
 * Use this for BOTH sides of a name comparison.
 */
export function normalizeSharkName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    // Only real honorifics — "Mr. Wonderful" is O'Leary's nickname and a SHARK_NAME_MAP key,
    // so stripping "Mr." there would break the alias it exists to resolve.
    .replace(/^(sir|dame|dr\.?)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Main Enrichment Function ---
export interface EnrichmentResult {
  processed: number
  updated: number
  skipped: number
  failed: number
  products: Array<{ name: string; status: 'updated' | 'skipped' | 'failed'; reason?: string }>
}

export async function enrichPendingDeals(options: {
  limit?: number
  minAgeHours?: number
  maxAttempts?: number
  force?: boolean
} = {}): Promise<EnrichmentResult> {
  const { limit = 10, minAgeHours = 24, maxAttempts = 7, force = false } = options
  const supabase = getAdminSupabase()

  console.log('[Enrichment] Starting deal enrichment:', { limit, minAgeHours, maxAttempts, force })

  // Find products with unknown deal outcomes
  let query = supabase
    .from('products')
    .select('id, name, last_enriched_at, deal_search_attempts')
    .eq('deal_outcome', 'unknown')
    .order('last_enriched_at', { ascending: true, nullsFirst: true })
    .limit(limit)

  if (!force) {
    const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString()
    query = query.or(`last_enriched_at.is.null,last_enriched_at.lt.${cutoff}`)
  }

  const { data: products, error } = await query

  if (error) {
    console.error('[Enrichment] Failed to fetch products:', error.message)
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  // Filter by max attempts
  const filteredProducts = force
    ? products
    : products?.filter(p => (p.deal_search_attempts || 0) < maxAttempts)

  console.log(`[Enrichment] Found ${filteredProducts?.length || 0} products with unknown deals`)

  if (!filteredProducts || filteredProducts.length === 0) {
    return { processed: 0, updated: 0, skipped: 0, failed: 0, products: [] }
  }

  // Get shark IDs for linking
  const { data: sharks } = await supabase.from('sharks').select('id, slug, name')
  const sharkIds = new Map<string, string>()
  for (const shark of sharks || []) {
    sharkIds.set(shark.slug, shark.id)
    sharkIds.set(normalizeSharkName(shark.name), shark.id)
  }

  const result: EnrichmentResult = {
    processed: filteredProducts.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    products: [],
  }

  for (const product of filteredProducts) {
    console.log(`[Enrichment] Processing: ${product.name}`)

    try {
      // Search for deal info
      const searchResults = await searchTavily(
        `${product.name} Shark Tank deal details founders sharks invested`
      )

      if (searchResults.length === 0) {
        result.skipped++
        result.products.push({ name: product.name, status: 'skipped', reason: 'No search results' })
        continue
      }

      // Combine search content
      const content = searchResults
        .slice(0, 8)
        .map(r => `[${r.title}]\n${r.content}`)
        .join('\n\n')
        .substring(0, 8000)

      // Synthesize deal info
      const synthesis = await synthesize(
        DEAL_SEARCH_PROMPT,
        `Product: ${product.name}\n\nSearch Results:\n${content}`,
        DealInfoSchema
      )

      if (!synthesis.success || !synthesis.data) {
        result.skipped++
        result.products.push({ name: product.name, status: 'skipped', reason: synthesis.error || 'Synthesis failed' })

        // Update attempt counter
        await supabase.from('products').update({
          last_enriched_at: new Date().toISOString(),
          deal_search_attempts: (product.deal_search_attempts || 0) + 1,
        }).eq('id', product.id)

        continue
      }

      const dealInfo = synthesis.data

      // Only update if high confidence and known outcome
      if (dealInfo.confidence !== 'high' || dealInfo.dealOutcome === 'unknown') {
        result.skipped++
        result.products.push({
          name: product.name,
          status: 'skipped',
          reason: `${dealInfo.dealOutcome} (confidence: ${dealInfo.confidence})`
        })

        await supabase.from('products').update({
          last_enriched_at: new Date().toISOString(),
          deal_search_attempts: (product.deal_search_attempts || 0) + 1,
        }).eq('id', product.id)

        continue
      }

      // Update product with deal info
      const nullIfZero = (val: number | null) => (val === 0 ? null : val)
      const update: Record<string, unknown> = {
        deal_outcome: dealInfo.dealOutcome,
        last_enriched_at: new Date().toISOString(),
        deal_search_attempts: (product.deal_search_attempts || 0) + 1,
      }

      if (dealInfo.askingAmount) update.asking_amount = dealInfo.askingAmount
      if (dealInfo.askingEquity) update.asking_equity = nullIfZero(dealInfo.askingEquity)
      if (dealInfo.dealAmount) update.deal_amount = dealInfo.dealAmount
      if (dealInfo.dealEquity) update.deal_equity = nullIfZero(dealInfo.dealEquity)

      const { error: updateError } = await supabase
        .from('products')
        .update(update)
        .eq('id', product.id)

      if (updateError) {
        result.failed++
        result.products.push({ name: product.name, status: 'failed', reason: updateError.message })
        continue
      }

      // Link sharks if deal
      if (dealInfo.sharks.length > 0 && dealInfo.dealOutcome === 'deal') {
        await supabase.from('product_sharks').delete().eq('product_id', product.id)

        for (const shark of dealInfo.sharks) {
          const normalizedName = normalizeSharkName(shark.name)
          const sharkSlug = SHARK_NAME_MAP[normalizedName]
          let sharkId = sharkSlug ? sharkIds.get(sharkSlug) : sharkIds.get(normalizedName)

          if (!sharkId) {
            const newSlug = slugify(shark.name)
            const { data: newShark } = await supabase
              .from('sharks')
              .insert({
                name: shark.name,
                slug: newSlug,
                is_guest_shark: true,
              })
              .select('id')
              .single()

            if (newShark?.id) {
              sharkId = newShark.id as string
              sharkIds.set(normalizedName, sharkId)
              console.log(`[Enrichment] Created guest shark: ${shark.name}`)
            }
          }

          if (sharkId) {
            await supabase.from('product_sharks').insert({
              product_id: product.id,
              shark_id: sharkId,
              investment_amount: shark.amount,
              equity_percentage: shark.equity,
            })
          }
        }
      }

      result.updated++
      result.products.push({ name: product.name, status: 'updated' })
      console.log(`[Enrichment] Updated: ${product.name} -> ${dealInfo.dealOutcome}`)
    } catch (err) {
      result.failed++
      result.products.push({
        name: product.name,
        status: 'failed',
        reason: err instanceof Error ? err.message : String(err)
      })
      console.error(`[Enrichment] Error processing ${product.name}:`, err)
    }
  }

  console.log('[Enrichment] Complete:', result)
  return result
}

// --- Episode Check Functions ---
const TVMAZE_SHOW_ID = 329 // Shark Tank

interface MissingEpisode {
  season: number
  episode: number
  airDate: string
  name: string
  tvmazeUrl: string
}

export interface EpisodeCheckResult {
  recentEpisodes: number
  missingEpisodes: MissingEpisode[]
  message: string
}

export async function checkForNewEpisodes(options: {
  lookbackHours?: number
} = {}): Promise<EpisodeCheckResult> {
  const { lookbackHours = 72 } = options
  const supabase = getAdminSupabase()

  console.log('[EpisodeCheck] Checking TVMaze for new episodes, lookback:', lookbackHours, 'hours')

  // Fetch all episodes from TVMaze
  const response = await fetch(`https://api.tvmaze.com/shows/${TVMAZE_SHOW_ID}/episodes`)

  if (!response.ok) {
    throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`)
  }

  interface TVMazeEpisode {
    id: number
    url: string
    name: string
    season: number
    number: number
    airdate: string
    airstamp: string
  }

  const allEpisodes: TVMazeEpisode[] = await response.json()

  // Filter to recently aired episodes
  const cutoffDate = new Date()
  cutoffDate.setHours(cutoffDate.getHours() - lookbackHours)

  const recentEpisodes = allEpisodes.filter(ep => {
    if (!ep.airstamp) return false
    const airDate = new Date(ep.airstamp)
    return airDate >= cutoffDate && airDate <= new Date()
  })

  console.log(`[EpisodeCheck] Found ${recentEpisodes.length} episode(s) aired in last ${lookbackHours} hours`)

  if (recentEpisodes.length === 0) {
    return {
      recentEpisodes: 0,
      missingEpisodes: [],
      message: 'No new episodes found',
    }
  }

  // Check database for missing episodes
  const missingEpisodes: MissingEpisode[] = []

  for (const ep of recentEpisodes) {
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
      .eq('season', ep.season)
      .eq('episode_number', ep.number)
      .limit(1)

    if (!existingProducts || existingProducts.length === 0) {
      console.log(`[EpisodeCheck] Missing: S${ep.season}E${ep.number} - no products in database`)
      missingEpisodes.push({
        season: ep.season,
        episode: ep.number,
        airDate: ep.airdate,
        name: ep.name,
        tvmazeUrl: ep.url,
      })
    } else {
      console.log(`[EpisodeCheck] Found: S${ep.season}E${ep.number} already in database`)
    }
  }

  const message = missingEpisodes.length > 0
    ? `Found ${missingEpisodes.length} episode(s) needing import: ${missingEpisodes.map(e => `S${e.season}E${e.episode}`).join(', ')}`
    : 'All recent episodes already in database'

  console.log('[EpisodeCheck]', message)

  return {
    recentEpisodes: recentEpisodes.length,
    missingEpisodes,
    message,
  }
}

// --- Auto Episode Import Functions ---

const EpisodeProductsSchema = z.object({
  products: z.array(z.object({
    name: z.string(),
  })),
})

const VALID_DEAL_TYPES = ['equity', 'royalty', 'loan', 'equity_plus_royalty', 'equity_plus_loan', 'contingent', 'unknown'] as const
const normalizeDealType = (val: unknown) => {
  if (typeof val === 'string' && (VALID_DEAL_TYPES as readonly string[]).includes(val)) return val
  if (typeof val === 'string' && val.includes('contingent')) return 'contingent'
  return 'unknown'
}

export const FullEnrichmentSchema = z.object({
  founders: z.array(z.string()).nullable(),
  founderStory: z.string().nullable(),
  askingAmount: z.number().nullable(),
  askingEquity: z.number().nullable(),
  dealType: z.preprocess(normalizeDealType, z.enum(VALID_DEAL_TYPES)),
  dealAmount: z.number().nullable(),
  dealEquity: z.number().nullable(),
  royaltyPercent: z.number().nullable(),
  royaltyTerms: z.string().nullable(),
  dealOutcome: z.enum(['deal', 'no_deal', 'deal_fell_through', 'unknown']),
  sharks: z.array(z.object({
    name: z.string(),
    amount: z.number().nullable(),
    equity: z.number().nullable(),
    isLead: z.boolean().optional(),
  })),
  status: z.enum(['active', 'out_of_business', 'acquired', 'unknown']),
  websiteUrl: z.string().nullable(),
  amazonUrl: z.string().nullable(),
  lifetimeRevenue: z.number().nullable(),
  annualRevenue: z.number().nullable(),
  revenueYear: z.number().nullable(),
  pitchSummary: z.string().nullable(),
})

type FullEnrichment = z.infer<typeof FullEnrichmentSchema>

export const FULL_ENRICHMENT_PROMPT = `You are a data extraction assistant. Extract structured information about a Shark Tank product from the provided search results.

Return ONLY valid JSON matching this schema:
{
  "founders": ["name1", "name2"] or null,
  "founderStory": "brief background on founders" or null,
  "askingAmount": number in dollars or null,
  "askingEquity": percentage as number (e.g., 10 for 10%) or null,
  "dealType": "equity" | "royalty" | "loan" | "equity_plus_royalty" | "equity_plus_loan" | "contingent" | "unknown",
  "dealAmount": total investment in dollars or null,
  "dealEquity": total equity percentage or null,
  "royaltyPercent": royalty percentage if applicable or null,
  "royaltyTerms": "e.g. $1 per unit until $X repaid" or null,
  "dealOutcome": "deal" | "no_deal" | "deal_fell_through" | "unknown",
  "sharks": [
    {"name": "Shark Name", "amount": dollars or null, "equity": percent or null, "isLead": true/false}
  ],
  "status": "active" | "out_of_business" | "acquired" | "unknown",
  "websiteUrl": "official website" or null,
  "amazonUrl": "amazon product page" or null,
  "lifetimeRevenue": total lifetime revenue in dollars or null,
  "annualRevenue": most recent annual revenue in dollars or null,
  "revenueYear": year of annualRevenue figure or null,
  "pitchSummary": "2-3 sentence summary of the pitch and outcome" or null
}

IMPORTANT:
- For revenue, extract ACTUAL NUMBERS. If no specific number is found, use null.
- For sharks array, include ONLY the sharks who closed the final accepted deal and actually invested. Exclude any shark who merely made an offer that was declined or beaten, counter-offered, negotiated, or expressed interest without being part of the accepted deal. Most deals involve exactly one shark; only list several when they explicitly went in together.
- dealType should reflect the actual deal structure.
- Be precise with all numbers. If information is not found, use null.`

/**
 * Discover product names for a Shark Tank episode using Tavily web search + OpenAI extraction.
 */
export async function discoverEpisodeProducts(season: number, episode: number): Promise<string[]> {
  console.log(`[AutoImport] Discovering products for S${season}E${episode}`)

  const results = await searchTavily(
    `Shark Tank Season ${season} Episode ${episode} products companies pitched businesses`
  )

  if (results.length === 0) {
    console.log('[AutoImport] No search results found')
    return []
  }

  const content = results
    .slice(0, 8)
    .map(r => `[${r.title}]\n${r.content}`)
    .join('\n\n')
    .substring(0, 8000)

  // Step 1: Extract product names
  const result = await synthesize(
    `Extract the names of all products or companies that were pitched on this specific Shark Tank episode. Return ONLY valid JSON: {"products": [{"name": "Product Name"}]}. Only include products/companies actually pitched on the show in this specific episode. Typically there are 3-5 products per episode. Use the SHORT official brand/company name only (e.g. "Flightpath" not "Flightpath Golf Tees", "Somnia+" not "SOMNIA+ Dorm Bed Expander Kit"). Do not include product descriptions in the name.`,
    `Shark Tank Season ${season} Episode ${episode}\n\nSearch Results:\n${content}`,
    EpisodeProductsSchema
  )

  if (!result.success || !result.data || result.data.products.length === 0) {
    console.log('[AutoImport] Failed to extract product names:', result.error)
    return []
  }

  const rawNames = result.data.products.map(p => p.name)
  console.log(`[AutoImport] Raw discovery:`, rawNames)

  // Step 2: Validate and clean names against the source data
  const cleanResult = await synthesize(
    `You are verifying Shark Tank product/company names. Given a list of discovered names and the original search results, return the canonical short brand name for each. Fix any issues:
- Remove product category suffixes (e.g. "Flightpath Golf" → "Flightpath", "Rip Tie Hair" → "Rip Tie")
- Use proper capitalization as the brand uses it (e.g. "SOMNIA+" → "Somnia+", "BRCĒ" stays "BRCĒ")
- Merge duplicates if any
- Remove any entries that are NOT actual pitched products (e.g. sponsor names, shark names)
Return ONLY valid JSON: {"products": [{"name": "Canonical Name"}]}`,
    `Discovered names: ${JSON.stringify(rawNames)}\n\nSource data:\n${content}`,
    EpisodeProductsSchema
  )

  if (!cleanResult.success || !cleanResult.data) {
    console.log('[AutoImport] Name cleanup failed, using raw names')
    return rawNames
  }

  const names = cleanResult.data.products.map(p => p.name)
  console.log(`[AutoImport] Cleaned names:`, names)
  return names
}

/**
 * Full enrichment for a single product using Tavily search + OpenAI synthesis.
 */
async function enrichProductFull(productName: string): Promise<FullEnrichment | null> {
  // Search for deal details
  const detailsResults = await searchTavily(
    `${productName} Shark Tank deal details founders sharks invested`
  )
  // Search for current status
  const statusResults = await searchTavily(
    `${productName} Shark Tank still in business 2025 2026 where to buy`
  )

  const combinedContent = [
    '=== DEAL DETAILS ===',
    detailsResults.slice(0, 6).map(r => `[${r.title}]\n${r.content}`).join('\n\n').substring(0, 6000),
    '',
    '=== CURRENT STATUS ===',
    statusResults.slice(0, 6).map(r => `[${r.title}]\n${r.content}`).join('\n\n').substring(0, 6000),
  ].join('\n')

  const result = await synthesize(
    FULL_ENRICHMENT_PROMPT,
    `Product: ${productName}\n\nSearch Results:\n${combinedContent}`,
    FullEnrichmentSchema
  )

  if (!result.success || !result.data) {
    console.log(`[AutoImport] Enrichment failed for ${productName}:`, result.error)
    return null
  }

  return result.data
}

/**
 * Create a product in the database and run full enrichment.
 */
export async function createAndEnrichProduct(
  name: string,
  season: number,
  episodeNumber: number,
  episodeId: string,
  sharkIds: Map<string, string>,
  supabase: UntypedSupabase
): Promise<{ created: boolean; enriched: boolean; dealOutcome?: string }> {
  const slug = slugify(name)

  // Upsert product (skip if exists)
  const { error } = await supabase
    .from('products')
    .upsert({
      name,
      slug,
      season,
      episode_number: episodeNumber,
      episode_id: episodeId,
      enrichment_status: 'pending',
      deal_outcome: 'unknown',
    }, {
      onConflict: 'slug',
      ignoreDuplicates: true,
    })

  if (error && error.code !== 'PGRST116') {
    console.error(`[AutoImport] Failed to create ${name}:`, error.message)
    return { created: false, enriched: false }
  }

  // Fetch the product (may have existed already)
  const { data: product } = await supabase
    .from('products')
    .select('id, created_at, enrichment_status')
    .eq('slug', slug)
    .single()

  if (!product) {
    return { created: false, enriched: false }
  }

  const isNew = Date.now() - new Date(product.created_at).getTime() < 10000
  if (!isNew) {
    console.log(`[AutoImport] Skipped (exists): ${name}`)
    return { created: false, enriched: false }
  }

  console.log(`[AutoImport] Created: ${name}`)

  // Run full enrichment
  const enriched = await enrichProductFull(name)
  if (!enriched) {
    return { created: true, enriched: false }
  }

  // Update product with enrichment data
  const nullIfZero = (val: number | null) => (val === 0 ? null : val)
  const { error: updateError } = await supabase
    .from('products')
    .update({
      founder_names: enriched.founders,
      founder_story: enriched.founderStory,
      asking_amount: enriched.askingAmount,
      asking_equity: nullIfZero(enriched.askingEquity),
      deal_type: enriched.dealType,
      deal_amount: enriched.dealAmount,
      deal_equity: nullIfZero(enriched.dealEquity),
      royalty_percent: nullIfZero(enriched.royaltyPercent),
      royalty_terms: enriched.royaltyTerms,
      royalty_deal: enriched.dealType.includes('royalty'),
      deal_outcome: enriched.dealOutcome,
      status: enriched.status,
      website_url: enriched.websiteUrl,
      amazon_url: enriched.amazonUrl,
      lifetime_revenue: enriched.lifetimeRevenue,
      annual_revenue: enriched.annualRevenue,
      revenue_year: enriched.revenueYear,
      pitch_summary: enriched.pitchSummary,
      enrichment_status: 'enriched',
      last_enriched_at: new Date().toISOString(),
    })
    .eq('id', product.id)

  if (updateError) {
    console.error(`[AutoImport] Update failed for ${name}:`, updateError.message)
    return { created: true, enriched: false }
  }

  // Link sharks if deal
  if (enriched.sharks.length > 0 && enriched.dealOutcome === 'deal') {
    await supabase.from('product_sharks').delete().eq('product_id', product.id)

    for (const shark of enriched.sharks) {
      const normalizedName = normalizeSharkName(shark.name)
      const sharkSlug = SHARK_NAME_MAP[normalizedName]
      let sharkId = sharkSlug ? sharkIds.get(sharkSlug) : sharkIds.get(normalizedName)

      if (!sharkId) {
        const newSlug = slugify(shark.name)
        const { data: newShark } = await supabase
          .from('sharks')
          .insert({ name: shark.name, slug: newSlug, is_guest_shark: true })
          .select('id')
          .single()

        if (newShark?.id) {
          sharkId = newShark.id as string
          sharkIds.set(normalizedName, sharkId)
          sharkIds.set(newSlug, sharkId)
          console.log(`[AutoImport] Created guest shark: ${shark.name}`)
        }
      }

      if (sharkId) {
        await supabase.from('product_sharks').insert({
          product_id: product.id,
          shark_id: sharkId,
          investment_amount: shark.amount,
          equity_percentage: shark.equity,
          is_lead_investor: shark.isLead || false,
        })
      }
    }
  }

  console.log(`[AutoImport] Enriched: ${name} -> ${enriched.dealOutcome} | ${enriched.status}`)

  // Scrape product photo
  const photoResult = await scrapeProductPhoto({
    productId: product.id,
    productName: name,
    slug,
    websiteUrl: enriched.websiteUrl,
  })
  if (photoResult.success) {
    console.log(`[AutoImport] Photo scraped: ${name} (${photoResult.source})`)
  } else {
    console.log(`[AutoImport] No photo found: ${name}`)
  }

  // Generate narrative content
  await generateNarrativeForProduct(product.id, name, supabase)

  return { created: true, enriched: true, dealOutcome: enriched.dealOutcome }
}

// --- Narrative Generation for Auto-Import ---
// Note: Prompt and schema are duplicated from scripts/ingestion/enrichment/shared/narrative.ts
// because this service runs in Vercel serverless and cannot import from scripts/.
// Keep parameters in sync: maxTokens=2500, temperature=0.5
const NarrativeContentSchema = z.object({
  origin_story: z.string().nullable(),
  pitch_journey: z.string().nullable(),
  deal_dynamics: z.string().nullable(),
  after_tank: z.string().nullable(),
  current_status: z.string().nullable(),
  where_to_buy: z.string().nullable(),
})

const NARRATIVE_PROMPT = `You are a Shark Tank expert writer creating SEO-optimized product pages. Generate compelling, factual narrative content about the product.

Write in a journalistic, engaging style. Include specific details, numbers, and quotes when available. Each section should be a complete narrative paragraph (not bullet points).

Return ONLY valid JSON matching this schema:
{
  "origin_story": "150-250 words about the founder's background, what problem they discovered, and how they created their solution. Include their profession, location, and the 'aha moment' that led to the product. Make it personal and relatable. Naturally include the phrase '[Product Name] Shark Tank' somewhere in this section.",

  "pitch_journey": "150-200 words describing the pitch episode. Include the ask amount/equity, which sharks showed interest, key questions asked, memorable moments, and the overall dynamic in the tank. Reference the season and episode if known.",

  "deal_dynamics": "100-150 words about the deal negotiation (or why no deal happened). Include competing offers, counter-offers, and the final terms. For no-deal products, explain what went wrong - was it valuation, the sharks not believing in the product, or something else?",

  "after_tank": "150-200 words about what happened after the episode aired. Include the 'Shark Tank effect' on sales, growth milestones, product expansion, any challenges overcome, and major business developments. Use phrases like 'after Shark Tank' and 'since appearing on Shark Tank' naturally.",

  "current_status": "100-150 words about where the company is today. Include current revenue if known, number of products sold, retail partnerships, and overall business health. Be specific with dates and numbers. Include the phrase 'still in business' if the company is active, or explain closure if not.",

  "where_to_buy": "50-100 words about purchase options. Include official website, Amazon availability, retail store locations (Target, Walmart, etc.), and price range. Focus on helping readers find and buy the product."
}

CRITICAL GUIDELINES:
- Write for SEO: naturally include "[Product Name] Shark Tank", "after Shark Tank", "still in business" phrases
- Be factual: only include information supported by the search results
- Be specific: use actual numbers, dates, and names when available
- For sections with no information, return null (don't fabricate)
- Write in third person, present tense for current status
- Each section should stand alone as a readable paragraph
- NO bullet points - flowing narrative paragraphs only`

async function synthesizeNarrative(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<z.infer<typeof NarrativeContentSchema>>
): Promise<{ data: z.infer<typeof NarrativeContentSchema> | null; success: boolean; error?: string }> {
  const openai = getOpenAI()
  const model = 'gpt-4.1-mini'

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2500,
      temperature: 0.5,
    })

    const text = response.choices[0]?.message?.content || ''
    if (!text.trim()) {
      return { data: null, success: false, error: 'Empty response' }
    }

    const jsonText = extractJsonFromText(text)
    const parsed = JSON.parse(jsonText)
    const validated = schema.parse(parsed)

    return { data: validated, success: true }
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function generateNarrativeForProduct(
  productId: string,
  productName: string,
  supabase: UntypedSupabase
): Promise<boolean> {
  try {
    // Fetch product context
    const { data: product } = await supabase
      .from('products')
      .select('season, episode_number, deal_outcome, status, asking_amount, asking_equity, deal_amount, deal_equity, founder_names')
      .eq('id', productId)
      .single()

    if (!product) return false

    // Run 3 parallel searches for narrative content
    const year = new Date().getFullYear()
    const [detailResults, statusResults, afterResults] = await Promise.all([
      searchTavily(`${productName} Shark Tank deal details founders pitch episode`),
      searchTavily(`${productName} Shark Tank still in business ${year - 1} ${year} where to buy`),
      searchTavily(`${productName} after Shark Tank update revenue growth sales success`),
    ])

    const combinedContent = [
      '=== PITCH & DEAL DETAILS ===',
      detailResults.slice(0, 6).map(r => `[${r.title}]\n${r.content}`).join('\n\n').substring(0, 4000),
      '',
      '=== CURRENT STATUS & WHERE TO BUY ===',
      statusResults.slice(0, 6).map(r => `[${r.title}]\n${r.content}`).join('\n\n').substring(0, 4000),
      '',
      '=== AFTER SHARK TANK UPDATES ===',
      afterResults.slice(0, 6).map(r => `[${r.title}]\n${r.content}`).join('\n\n').substring(0, 4000),
    ].join('\n')

    const productContext = [
      `Product: ${productName}`,
      product.season ? `Season: ${product.season}` : null,
      product.episode_number ? `Episode: ${product.episode_number}` : null,
      product.deal_outcome ? `Deal Outcome: ${product.deal_outcome}` : null,
      product.status ? `Current Status: ${product.status}` : null,
      product.asking_amount ? `Asking: $${product.asking_amount.toLocaleString()} for ${product.asking_equity}%` : null,
      product.deal_amount ? `Deal: $${product.deal_amount.toLocaleString()} for ${product.deal_equity}%` : null,
      product.founder_names?.length ? `Founders: ${product.founder_names.join(', ')}` : null,
    ].filter(Boolean).join('\n')

    const result = await synthesizeNarrative(
      NARRATIVE_PROMPT,
      `${productContext}\n\nSearch Results:\n${combinedContent}`,
      NarrativeContentSchema
    )

    if (!result.success || !result.data) {
      console.log(`[AutoImport] Narrative generation failed for ${productName}: ${result.error}`)
      return false
    }

    const sections = Object.values(result.data).filter(v => v !== null).length

    const { error } = await supabase
      .from('products')
      .update({
        narrative_content: result.data,
        narrative_version: 1,
        narrative_generated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (error) {
      console.log(`[AutoImport] Narrative save failed for ${productName}: ${error.message}`)
      return false
    }

    console.log(`[AutoImport] Narrative generated: ${productName} (${sections}/6 sections)`)
    return true
  } catch (err) {
    console.log(`[AutoImport] Narrative error for ${productName}: ${err}`)
    return false
  }
}

export interface EpisodeImportResult {
  season: number
  episode: number
  productsDiscovered: number
  productsCreated: number
  productsEnriched: number
  productNames: string[]
}

/**
 * Full auto-import pipeline for a missing episode:
 * 1. Discover product names via Tavily search
 * 2. Create episode record
 * 3. Create and enrich each product
 */
export async function importMissingEpisode(
  season: number,
  episode: number
): Promise<EpisodeImportResult> {
  const supabase = getAdminSupabase()

  console.log(`[AutoImport] Starting import for S${season}E${episode}`)

  // Safety check: skip if episode already has products
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id')
    .eq('season', season)
    .eq('episode_number', episode)
    .limit(1)

  if (existingProducts && existingProducts.length > 0) {
    console.log(`[AutoImport] S${season}E${episode} already has products, skipping`)
    return { season, episode, productsDiscovered: 0, productsCreated: 0, productsEnriched: 0, productNames: [] }
  }

  // Step 1: Discover product names
  const productNames = await discoverEpisodeProducts(season, episode)
  if (productNames.length === 0) {
    console.log(`[AutoImport] No products found for S${season}E${episode}, skipping`)
    return { season, episode, productsDiscovered: 0, productsCreated: 0, productsEnriched: 0, productNames: [] }
  }

  // Step 2: Get or create episode record
  const { data: existing } = await supabase
    .from('episodes')
    .select('id')
    .eq('season', season)
    .eq('episode_number', episode)
    .single()

  let episodeId: string
  if (existing) {
    episodeId = existing.id
  } else {
    const { data: newEp, error } = await supabase
      .from('episodes')
      .insert({ season, episode_number: episode, title: `Season ${season}, Episode ${episode}` })
      .select('id')
      .single()

    if (error || !newEp) throw new Error(`Failed to create episode: ${error?.message}`)
    episodeId = newEp.id
  }

  // Step 3: Load shark IDs for linking
  const { data: sharks } = await supabase.from('sharks').select('id, slug, name')
  const sharkIds = new Map<string, string>()
  for (const shark of sharks || []) {
    sharkIds.set(shark.slug, shark.id)
    sharkIds.set(normalizeSharkName(shark.name), shark.id)
  }

  // Step 4: Create and enrich each product
  let created = 0
  let enriched = 0

  for (const name of productNames) {
    const result = await createAndEnrichProduct(name, season, episode, episodeId, sharkIds, supabase)
    if (result.created) created++
    if (result.enriched) enriched++
  }

  console.log(`[AutoImport] S${season}E${episode} complete: ${created} created, ${enriched} enriched`)

  return {
    season,
    episode,
    productsDiscovered: productNames.length,
    productsCreated: created,
    productsEnriched: enriched,
    productNames,
  }
}

// --- Narrative Refresh Functions ---
export interface NarrativeRefreshResult {
  flagged: number
  products: string[]
}

export async function processNarrativeRefreshes(): Promise<NarrativeRefreshResult> {
  const supabase = getAdminSupabase()

  console.log('[NarrativeRefresh] Processing scheduled refreshes')

  // Find products with scheduled refresh that is due (1+ hours old)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, narrative_refresh_scheduled_at')
    .not('narrative_refresh_scheduled_at', 'is', null)
    .lt('narrative_refresh_scheduled_at', oneHourAgo)
    .limit(50)

  if (error) {
    console.error('[NarrativeRefresh] Failed to fetch products:', error.message)
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  if (!products || products.length === 0) {
    console.log('[NarrativeRefresh] No products ready for refresh')
    return { flagged: 0, products: [] }
  }

  console.log(`[NarrativeRefresh] Found ${products.length} products ready for refresh`)

  // Flag each product for re-enrichment by setting narrative_version to 0
  const productIds = products.map(p => p.id)
  const productNames = products.map(p => p.name)

  const { error: updateError } = await supabase
    .from('products')
    .update({
      narrative_version: 0,
      narrative_refresh_scheduled_at: null,
    })
    .in('id', productIds)

  if (updateError) {
    console.error('[NarrativeRefresh] Failed to flag products:', updateError.message)
    throw new Error(`Failed to flag products: ${updateError.message}`)
  }

  console.log(`[NarrativeRefresh] Flagged ${products.length} products for narrative refresh`)
  return { flagged: products.length, products: productNames }
}
