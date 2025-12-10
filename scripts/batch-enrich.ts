import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { searchProductDetails, searchProductStatus, combineSearchResultsCompact } from './ingestion/enrichment/shared/tavily-client';
import { synthesize } from './ingestion/enrichment/shared/synthesis-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SharkInvestmentSchema = z.object({
  name: z.string(),
  amount: z.number().nullable(),
  equity: z.number().nullable(),
  isLead: z.boolean().optional(),
});

const VALID_DEAL_TYPES = ['equity', 'royalty', 'loan', 'equity_plus_royalty', 'equity_plus_loan', 'contingent', 'unknown'] as const;
const normalizeDealType = (val: unknown) => {
  if (typeof val === 'string' && VALID_DEAL_TYPES.includes(val as typeof VALID_DEAL_TYPES[number])) return val;
  if (typeof val === 'string' && val.includes('contingent')) return 'contingent';
  return 'unknown';
};

const EnrichedProductSchema = z.object({
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
  sharks: z.array(SharkInvestmentSchema),
  status: z.enum(['active', 'out_of_business', 'acquired', 'unknown']),
  websiteUrl: z.string().nullable(),
  amazonUrl: z.string().nullable(),
  lifetimeRevenue: z.number().nullable(),
  annualRevenue: z.number().nullable(),
  revenueYear: z.number().nullable(),
  pitchSummary: z.string().nullable(),
});

type EnrichedProduct = z.infer<typeof EnrichedProductSchema>;

const ENRICHMENT_PROMPT = `You are a data extraction assistant. Extract structured information about a Shark Tank product from the provided search results.

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
- For revenue, extract ACTUAL NUMBERS. Do not use vague terms like "multi-million". If no specific number is found, use null.
- For sharks array, include each investing shark with their individual contribution if known.
- dealType should reflect the actual deal structure (many deals have royalties or loans in addition to equity).
- Be precise with all numbers. If information is not found, use null.`;

const SHARK_NAME_MAP: Record<string, string> = {
  'mark cuban': 'mark-cuban',
  'barbara corcoran': 'barbara-corcoran',
  'daymond john': 'daymond-john',
  "kevin o'leary": 'kevin-oleary',
  'kevin oleary': 'kevin-oleary',
  'lori greiner': 'lori-greiner',
  'robert herjavec': 'robert-herjavec',
};

async function getSharkIds(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('sharks').select('id, slug, name');
  if (error) throw error;
  
  const map = new Map<string, string>();
  for (const shark of data || []) {
    map.set(shark.slug, shark.id);
    map.set(shark.name.toLowerCase(), shark.id);
  }
  return map;
}

async function enrichProduct(productName: string): Promise<EnrichedProduct | null> {
  const tracker = TokenTracker.getInstance();

  const detailsResponse = await searchProductDetails(productName);
  const statusResponse = await searchProductStatus(productName);

  const combinedContent = [
    '=== DEAL DETAILS ===',
    combineSearchResultsCompact(detailsResponse.results, 6000),
    '',
    '=== CURRENT STATUS ===',
    combineSearchResultsCompact(statusResponse.results, 6000),
  ].join('\n');

  const result = await synthesize(
    ENRICHMENT_PROMPT,
    `Product: ${productName}\n\nSearch Results:\n${combinedContent}`,
    EnrichedProductSchema
  );

  if (result.success && result.data) {
    tracker.trackUsage(result.usage);
    return result.data;
  }

  return null;
}

async function updateProduct(
  productId: string,
  enriched: EnrichedProduct,
  sharkIds: Map<string, string>,
  dryRun: boolean
): Promise<boolean> {
  const nullIfZero = (val: number | null) => (val === 0 ? null : val);
  
  const productUpdate = {
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
  };

  if (dryRun) {
    console.log(`      Would update product with: ${JSON.stringify(productUpdate, null, 2).substring(0, 200)}...`);
    return true;
  }

  const { error: updateError } = await supabase
    .from('products')
    .update(productUpdate)
    .eq('id', productId);

  if (updateError) {
    console.error(`      ❌ Update failed: ${updateError.message}`);
    return false;
  }

  if (enriched.sharks.length > 0 && enriched.dealOutcome === 'deal') {
    await supabase.from('product_sharks').delete().eq('product_id', productId);

    for (const shark of enriched.sharks) {
      const sharkSlug = SHARK_NAME_MAP[shark.name.toLowerCase()];
      const sharkId = sharkSlug ? sharkIds.get(sharkSlug) : sharkIds.get(shark.name.toLowerCase());
      
      if (sharkId) {
        await supabase.from('product_sharks').insert({
          product_id: productId,
          shark_id: sharkId,
          investment_amount: shark.amount,
          equity_percentage: shark.equity,
          is_lead_investor: shark.isLead || false,
        });
      }
    }
  }

  return true;
}

async function processProduct(
  product: { id: string; name: string },
  sharkIds: Map<string, string>,
  dryRun: boolean
): Promise<{ success: boolean; name: string; outcome?: string; status?: string; sharks?: number }> {
  try {
    const data = await enrichProduct(product.name);
    
    if (data) {
      const success = await updateProduct(product.id, data, sharkIds, dryRun);
      if (success) {
        return { success: true, name: product.name, outcome: data.dealOutcome, status: data.status, sharks: data.sharks.length };
      }
    }
    return { success: false, name: product.name };
  } catch {
    return { success: false, name: product.name };
  }
}

async function batchEnrich(options: { limit?: number; dryRun?: boolean; concurrency?: number }) {
  const concurrency = options.concurrency || 15;
  
  console.log('\n' + '━'.repeat(60));
  console.log('🦈 Batch Product Enrichment');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`   Concurrency: ${concurrency}`);
  if (options.limit) console.log(`   Limit: ${options.limit}`);
  console.log('━'.repeat(60) + '\n');

  const sharkIds = await getSharkIds();
  console.log(`   Loaded ${sharkIds.size / 2} sharks\n`);

  let query = supabase
    .from('products')
    .select('id, name')
    .eq('enrichment_status', 'pending')
    .order('created_at', { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error(`❌ Failed to fetch products: ${error.message}`);
    return;
  }

  console.log(`   Found ${products?.length || 0} products to enrich\n`);

  if (!products || products.length === 0) {
    console.log('   Nothing to do!\n');
    return;
  }

  let enriched = 0;
  let failed = 0;
  let processed = 0;
  const tracker = TokenTracker.getInstance();

  for (let i = 0; i < products.length; i += concurrency) {
    const batch = products.slice(i, i + concurrency);
    
    const results = await Promise.all(
      batch.map(product => processProduct(product, sharkIds, options.dryRun || false))
    );

    for (const result of results) {
      processed++;
      if (result.success) {
        enriched++;
        console.log(`   ✅ ${result.name} | ${result.outcome} | ${result.status} | ${result.sharks} sharks`);
      } else {
        failed++;
        console.log(`   ❌ ${result.name}`);
      }
    }

    console.log(`   [${processed}/${products.length}] batch complete\n`);
  }

  console.log('━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Cost: $${tracker.estimateCost().toFixed(4)}`);
  console.log('━'.repeat(60) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  let limit: number | undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }

  let concurrency: number | undefined;
  const concurrencyIndex = args.indexOf('--concurrency');
  if (concurrencyIndex >= 0 && args[concurrencyIndex + 1]) {
    concurrency = parseInt(args[concurrencyIndex + 1], 10);
  }

  await batchEnrich({ limit, dryRun, concurrency });
}

main().catch(console.error);
