import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
    }
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilyResponse {
  results: TavilyResult[];
  query: string;
  fromCache: boolean;
  cachedAt?: Date;
}

export interface CacheOptions {
  entityType: 'product' | 'shark' | 'season';
  entityId?: string;
  entityName?: string;
  ttlDays?: number;
}

const DEFAULT_TTL_DAYS: Record<CacheOptions['entityType'], number> = {
  product: 30,
  shark: 90,
  season: 180,
};

function hashQuery(query: string): string {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

async function getCachedResults(queryHash: string): Promise<TavilyResponse | null> {
  try {
    const { data, error } = await getSupabase()
      .from('search_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      results: data.results as TavilyResult[],
      query: data.query,
      fromCache: true,
      cachedAt: new Date(data.fetched_at),
    };
  } catch {
    return null;
  }
}

async function cacheResults(
  query: string,
  queryHash: string,
  results: TavilyResult[],
  options: CacheOptions
): Promise<void> {
  const ttlDays = options.ttlDays ?? DEFAULT_TTL_DAYS[options.entityType];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  try {
    await getSupabase().from('search_cache').insert({
      entity_type: options.entityType,
      entity_id: options.entityId || null,
      entity_name: options.entityName || null,
      query,
      query_hash: queryHash,
      results,
      result_count: results.length,
      source: 'tavily',
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.warn(`   ⚠️ Failed to cache search results: ${err}`);
  }
}

export async function searchTavily(
  query: string,
  options: CacheOptions & { skipCache?: boolean; maxResults?: number } = { entityType: 'product' }
): Promise<TavilyResponse> {
  const queryHash = hashQuery(query);

  if (!options.skipCache) {
    const cached = await getCachedResults(queryHash);
    if (cached) {
      console.log(`      📦 Cache hit: "${query.substring(0, 40)}..."`);
      return cached;
    }
  }

  const apiKey = process.env.TAVILY_API_KEY || process.env.TAVILY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY or TAVILY not set');
  }

  console.log(`      🔍 Tavily search: "${query.substring(0, 40)}..."`);

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      include_raw_content: false,
      max_results: options.maxResults ?? 10,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const results: TavilyResult[] = data.results || [];

  await cacheResults(query, queryHash, results, options);

  return {
    results,
    query,
    fromCache: false,
  };
}

export async function searchSeasonProducts(season: number): Promise<TavilyResponse> {
  return searchTavily(`Shark Tank Season ${season} all products companies pitches deals list`, {
    entityType: 'season',
    entityName: `Season ${season}`,
    ttlDays: 180,
    maxResults: 15,
  });
}

export async function searchProductStatus(productName: string, productId?: string): Promise<TavilyResponse> {
  return searchTavily(`${productName} Shark Tank still in business 2024 2025 where to buy`, {
    entityType: 'product',
    entityId: productId,
    entityName: productName,
    ttlDays: 30,
  });
}

export async function searchProductDetails(productName: string, productId?: string): Promise<TavilyResponse> {
  return searchTavily(`${productName} Shark Tank deal details founders sharks invested`, {
    entityType: 'product',
    entityId: productId,
    entityName: productName,
    ttlDays: 90,
  });
}

export function combineSearchResultsCompact(results: TavilyResult[], maxLength: number = 12000): string {
  const allContent: string[] = [];
  let currentLength = 0;

  for (const item of results) {
    const entry = `[${item.title}]\n${item.content}`;
    if (currentLength + entry.length > maxLength) {
      break;
    }
    allContent.push(entry);
    currentLength += entry.length;
  }

  return allContent.join('\n\n');
}
