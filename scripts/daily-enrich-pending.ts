import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { searchProductDetails, combineSearchResultsCompact } from './ingestion/enrichment/shared/tavily-client';
import { synthesize } from './ingestion/enrichment/shared/synthesis-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';

dotenv.config({ path: '.env.local' });

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  return createClient(url, key);
}

const supabase = getSupabase();

// Focused schema for deal info only
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
});

type DealInfo = z.infer<typeof DealInfoSchema>;

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
- Do NOT make up deal terms`;

const SHARK_NAME_MAP: Record<string, string> = {
  'mark cuban': 'mark-cuban',
  'barbara corcoran': 'barbara-corcoran',
  'daymond john': 'daymond-john',
  "kevin o'leary": 'kevin-oleary',
  'kevin oleary': 'kevin-oleary',
  'mr. wonderful': 'kevin-oleary',
  'lori greiner': 'lori-greiner',
  'robert herjavec': 'robert-herjavec',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

async function searchDealInfo(productName: string): Promise<DealInfo | null> {
  const tracker = TokenTracker.getInstance();

  // Search specifically for deal info
  const response = await searchProductDetails(productName);
  const content = combineSearchResultsCompact(response.results, 8000);

  const result = await synthesize(
    DEAL_SEARCH_PROMPT,
    `Product: ${productName}\n\nSearch Results:\n${content}`,
    DealInfoSchema
  );

  if (result.success && result.data) {
    tracker.trackUsage(result.usage);
    return result.data;
  }

  return null;
}

async function updateProductDeal(
  productId: string,
  productName: string,
  dealInfo: DealInfo,
  sharkIds: Map<string, string>
): Promise<boolean> {
  // Only update if we have high confidence
  if (dealInfo.confidence !== 'high') {
    console.log(`      ⚠️  Low confidence, skipping update`);
    return false;
  }

  // Only update if we found actual deal outcome
  if (dealInfo.dealOutcome === 'unknown') {
    console.log(`      ⚠️  Deal outcome still unknown`);
    return false;
  }

  const nullIfZero = (val: number | null) => (val === 0 ? null : val);

  const update: Record<string, unknown> = {
    deal_outcome: dealInfo.dealOutcome,
  };

  if (dealInfo.askingAmount) update.asking_amount = dealInfo.askingAmount;
  if (dealInfo.askingEquity) update.asking_equity = nullIfZero(dealInfo.askingEquity);
  if (dealInfo.dealAmount) update.deal_amount = dealInfo.dealAmount;
  if (dealInfo.dealEquity) update.deal_equity = nullIfZero(dealInfo.dealEquity);

  const { error } = await supabase
    .from('products')
    .update(update)
    .eq('id', productId);

  if (error) {
    console.error(`      ❌ Update failed: ${error.message}`);
    return false;
  }

  // Link sharks if deal
  if (dealInfo.sharks.length > 0 && dealInfo.dealOutcome === 'deal') {
    await supabase.from('product_sharks').delete().eq('product_id', productId);

    for (const shark of dealInfo.sharks) {
      const normalizedName = shark.name.toLowerCase();
      const sharkSlug = SHARK_NAME_MAP[normalizedName];
      let sharkId = sharkSlug ? sharkIds.get(sharkSlug) : sharkIds.get(normalizedName);

      if (!sharkId) {
        const newSlug = slugify(shark.name);
        const { data: newShark, error: createError } = await supabase
          .from('sharks')
          .insert({
            name: shark.name,
            slug: newSlug,
            is_guest_shark: true,
          })
          .select('id')
          .single();

        if (!createError && newShark) {
          sharkId = newShark.id;
          sharkIds.set(normalizedName, sharkId);
          console.log(`      🦈 Created guest shark: ${shark.name}`);
        }
      }

      if (sharkId) {
        await supabase.from('product_sharks').insert({
          product_id: productId,
          shark_id: sharkId,
          investment_amount: shark.amount,
          equity_percentage: shark.equity,
        });
      }
    }
  }

  return true;
}

function printUsage() {
  console.log(`
Usage: npx tsx scripts/daily-enrich-pending.ts [options]

Searches for deal information on products with unknown deal outcomes.

Options:
  --limit <num>       Maximum products to process (default: 10)
  --min-age <hours>   Only process products enriched at least this many hours ago (default: 24)
  --max-attempts <n>  Skip products that have been attempted this many times (default: 7)
  --dry-run           Preview without making changes
  --force             Process all unknown products regardless of age/attempts

Examples:
  npx tsx scripts/daily-enrich-pending.ts
  npx tsx scripts/daily-enrich-pending.ts --limit 5 --dry-run
  npx tsx scripts/daily-enrich-pending.ts --force --limit 20
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printUsage();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  let limit = 10;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }

  let minAgeHours = 24;
  const minAgeIndex = args.indexOf('--min-age');
  if (minAgeIndex >= 0 && args[minAgeIndex + 1]) {
    minAgeHours = parseInt(args[minAgeIndex + 1], 10);
  }

  let maxAttempts = 7;
  const maxAttemptsIndex = args.indexOf('--max-attempts');
  if (maxAttemptsIndex >= 0 && args[maxAttemptsIndex + 1]) {
    maxAttempts = parseInt(args[maxAttemptsIndex + 1], 10);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('🦈 Daily Deal Info Search');
  console.log('━'.repeat(60));
  console.log(`   Limit: ${limit}`);
  console.log(`   Min age: ${minAgeHours} hours`);
  console.log(`   Max attempts: ${maxAttempts}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Force: ${force ? 'Yes' : 'No'}`);
  console.log('━'.repeat(60) + '\n');

  // Find products with unknown deal outcomes
  let query = supabase
    .from('products')
    .select('id, name, last_enriched_at, deal_search_attempts')
    .eq('deal_outcome', 'unknown')
    .order('last_enriched_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (!force) {
    // Only get products last enriched more than minAgeHours ago
    const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString();
    query = query.or(`last_enriched_at.is.null,last_enriched_at.lt.${cutoff}`);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error(`❌ Failed to fetch products: ${error.message}`);
    return;
  }

  // Filter by max attempts (if column exists)
  const filteredProducts = force
    ? products
    : products?.filter(p => (p.deal_search_attempts || 0) < maxAttempts);

  console.log(`   Found ${filteredProducts?.length || 0} products with unknown deals\n`);

  if (!filteredProducts || filteredProducts.length === 0) {
    console.log('   Nothing to do!\n');
    return;
  }

  const sharkIds = await getSharkIds();
  const tracker = TokenTracker.getInstance();

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of filteredProducts) {
    console.log(`   🔍 Searching: ${product.name}`);

    if (dryRun) {
      console.log(`      [DRY RUN] Would search for deal info`);
      continue;
    }

    try {
      const dealInfo = await searchDealInfo(product.name);

      if (dealInfo) {
        console.log(`      Found: ${dealInfo.dealOutcome} (confidence: ${dealInfo.confidence})`);

        const success = await updateProductDeal(product.id, product.name, dealInfo, sharkIds);

        if (success) {
          updated++;
          console.log(`      ✅ Updated`);
        } else {
          skipped++;
        }
      } else {
        skipped++;
        console.log(`      ⚠️  No deal info found`);
      }

      // Track attempt (increment counter)
      // Note: deal_search_attempts column added in migration 00005
      const attemptUpdate: Record<string, unknown> = {
        last_enriched_at: new Date().toISOString(),
      };
      // Only update attempts if column exists (graceful degradation)
      if ('deal_search_attempts' in product) {
        attemptUpdate.deal_search_attempts = (product.deal_search_attempts || 0) + 1;
      }
      await supabase
        .from('products')
        .update(attemptUpdate)
        .eq('id', product.id);

    } catch (err) {
      failed++;
      console.log(`      ❌ Error: ${err}`);
    }

    console.log('');
  }

  console.log('━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Cost: $${tracker.estimateCost().toFixed(4)}`);
  console.log('━'.repeat(60) + '\n');
}

main().catch(console.error);
