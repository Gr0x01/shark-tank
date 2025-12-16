import { createClient, SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { z } from 'zod'
import crypto from 'crypto'
import type { Database } from '../supabase/types'

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
  schema: z.ZodSchema<T>
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
- Do NOT make up deal terms`

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
    sharkIds.set(shark.name.toLowerCase(), shark.id)
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
          const normalizedName = shark.name.toLowerCase()
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
      .eq('episode', ep.number)
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
