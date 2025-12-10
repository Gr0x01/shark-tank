import { z } from 'zod';
import { searchSeasonProducts, combineSearchResultsCompact } from '../shared/tavily-client';
import { synthesize } from '../shared/synthesis-client';
import { TokenTracker } from '../shared/token-tracker';

export interface DiscoveredProduct {
  name: string;
  companyName: string | null;
  founders: string[];
  season: number;
  episodeNumber: number | null;
  askingAmount: number | null;
  askingEquity: number | null;
  dealAmount: number | null;
  dealEquity: number | null;
  dealOutcome: 'deal' | 'no_deal' | 'unknown';
  sharks: string[];
  category: string | null;
  description: string | null;
}

export interface SeasonDiscoveryResult {
  season: number;
  products: DiscoveredProduct[];
  searchCacheHit: boolean;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

const DiscoveredProductSchema = z.object({
  name: z.string(),
  companyName: z.string().nullable(),
  founders: z.array(z.string()).default([]),
  episodeNumber: z.number().nullable(),
  askingAmount: z.number().nullable(),
  askingEquity: z.number().nullable(),
  dealAmount: z.number().nullable(),
  dealEquity: z.number().nullable(),
  dealOutcome: z.enum(['deal', 'no_deal', 'unknown']).default('unknown'),
  sharks: z.array(z.string()).default([]),
  category: z.string().nullable(),
  description: z.string().nullable(),
});

const SeasonProductsSchema = z.union([
  z.object({ products: z.array(DiscoveredProductSchema) }),
  z.array(DiscoveredProductSchema),
]).transform((data) => {
  if (Array.isArray(data)) {
    return { products: data };
  }
  return data;
});

const SYSTEM_PROMPT = `You are a Shark Tank expert. Given search results about a Shark Tank season, extract ALL products/companies that appeared in that season.

Return a JSON object with this exact structure:
{"products": [...]}

For each product in the array, include:
- name: The product or company name
- companyName: Company name if different from product name (or null)
- founders: Array of founder names
- episodeNumber: Episode number within the season (1-29 typically, or null)
- askingAmount: Dollar amount they asked for (number, or null if unknown)
- askingEquity: Percentage equity offered (number, or null if unknown)
- dealAmount: Final deal amount in dollars (number, or null if no deal)
- dealEquity: Final deal equity percentage (number, or null if no deal)
- dealOutcome: "deal", "no_deal", or "unknown"
- sharks: Array of shark names who invested (e.g., ["Mark Cuban", "Lori Greiner"])
- category: Product category (e.g., "Food & Beverage", "Technology", "Health & Wellness", or null)
- description: Brief description of the product (or null)

Important:
- Include ALL products mentioned, even if details are incomplete
- Use standard shark names: Mark Cuban, Barbara Corcoran, Daymond John, Kevin O'Leary, Lori Greiner, Robert Herjavec
- Amounts should be numbers (e.g., 100000 for $100,000)
- Return ONLY valid JSON, no other text`;

export async function discoverSeasonProducts(season: number): Promise<SeasonDiscoveryResult> {
  console.log(`   🔎 Discovering Season ${season} products...`);
  const tracker = TokenTracker.getInstance();

  try {
    const searchResponse = await searchSeasonProducts(season);
    const searchContent = combineSearchResultsCompact(searchResponse.results, 10000);

    if (!searchContent || searchContent.length < 100) {
      return {
        season,
        products: [],
        searchCacheHit: searchResponse.fromCache,
        tokensUsed: 0,
        success: false,
        error: 'No search results found',
      };
    }

    const userPrompt = `Extract all Shark Tank Season ${season} products from these search results:\n\n${searchContent}`;

    const result = await synthesize(SYSTEM_PROMPT, userPrompt, SeasonProductsSchema, {
      maxTokens: 4000,
      temperature: 0.2,
    });

    if (!result.success || !result.data) {
      return {
        season,
        products: [],
        searchCacheHit: searchResponse.fromCache,
        tokensUsed: result.usage.total,
        success: false,
        error: result.error || 'LLM synthesis failed',
      };
    }

    tracker.trackUsage(result.usage);

    const products: DiscoveredProduct[] = result.data.products.map(p => ({
      ...p,
      season,
    }));

    console.log(`   ✅ Found ${products.length} products in Season ${season}`);

    return {
      season,
      products,
      searchCacheHit: searchResponse.fromCache,
      tokensUsed: result.usage.total,
      success: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Season ${season} discovery failed: ${msg}`);
    return {
      season,
      products: [],
      searchCacheHit: false,
      tokensUsed: 0,
      success: false,
      error: msg,
    };
  }
}

export async function discoverAllSeasons(
  seasons: number[] = Array.from({ length: 16 }, (_, i) => i + 1),
  options: { delayMs?: number } = {}
): Promise<{
  results: SeasonDiscoveryResult[];
  totalProducts: number;
  totalTokens: number;
  estimatedCost: number;
}> {
  const results: SeasonDiscoveryResult[] = [];
  let totalProducts = 0;
  let totalTokens = 0;
  const delayMs = options.delayMs ?? 1000;

  for (const season of seasons) {
    const result = await discoverSeasonProducts(season);
    results.push(result);
    totalProducts += result.products.length;
    totalTokens += result.tokensUsed;

    if (season < seasons[seasons.length - 1]) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const tracker = TokenTracker.getInstance();
  const estimatedCost = tracker.estimateCost();

  return {
    results,
    totalProducts,
    totalTokens,
    estimatedCost,
  };
}
