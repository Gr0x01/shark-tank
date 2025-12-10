import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
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

const SharksOnlySchema = z.object({
  sharks: z.array(SharkInvestmentSchema),
});

const SHARK_NAME_MAP: Record<string, string> = {
  'mark cuban': 'mark-cuban',
  'barbara corcoran': 'barbara-corcoran',
  'daymond john': 'daymond-john',
  "kevin o'leary": 'kevin-oleary',
  'kevin oleary': 'kevin-oleary',
  'mr. wonderful': 'kevin-oleary',
  'lori greiner': 'lori-greiner',
  'robert herjavec': 'robert-herjavec',
  'daniel lubetzky': 'daniel-lubetzky',
  'kevin harrington': 'kevin-harrington',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const PROMPT = `Extract ONLY the sharks who invested in this Shark Tank product.

Return JSON:
{
  "sharks": [
    {"name": "Full Shark Name", "amount": dollars_or_null, "equity": percent_or_null, "isLead": true_or_false}
  ]
}

IMPORTANT:
- Use the shark's FULL REAL NAME (e.g., "Mark Cuban", "Lori Greiner", "Kevin O'Leary", "Robert Herjavec", "Barbara Corcoran", "Daymond John")
- For guest sharks, use their full name (e.g., "Michael Rubin", "Alex Rodriguez", "Rohan Oza")
- Do NOT use generic names like "Shark 1", "Shark 2", or first names only like "Robert" or "Kevin"
- Include ALL sharks who invested in the deal, not just the lead investor
- If multiple sharks invested together, list each one separately`;

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

async function enrichProductSharks(
  product: { id: string; name: string },
  sharkIds: Map<string, string>
): Promise<{ success: boolean; sharks: string[] }> {
  const detailsResponse = await searchProductDetails(product.name);
  const statusResponse = await searchProductStatus(product.name);

  const combinedContent = [
    '=== DEAL DETAILS ===',
    combineSearchResultsCompact(detailsResponse.results, 6000),
    '',
    '=== CURRENT STATUS ===',
    combineSearchResultsCompact(statusResponse.results, 6000),
  ].join('\n');

  const result = await synthesize(
    PROMPT,
    `Product: ${product.name}\n\nSearch Results:\n${combinedContent}`,
    SharksOnlySchema
  );

  if (!result.success || !result.data) {
    return { success: false, sharks: [] };
  }

  const tracker = TokenTracker.getInstance();
  tracker.trackUsage(result.usage);

  const sharks = result.data.sharks;
  
  if (sharks.length === 0) {
    return { success: false, sharks: [] };
  }

  await supabase.from('product_sharks').delete().eq('product_id', product.id);

  const linkedSharks: string[] = [];
  
  for (const shark of sharks) {
    const normalizedName = shark.name.toLowerCase();
    const sharkSlug = SHARK_NAME_MAP[normalizedName];
    let sharkId = sharkSlug ? sharkIds.get(sharkSlug) : sharkIds.get(normalizedName);
    
    if (!sharkId) {
      const newSlug = slugify(shark.name);
      sharkId = sharkIds.get(newSlug);
    }
    
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
        sharkIds.set(newSlug, sharkId);
      }
    }
    
    if (sharkId) {
      await supabase.from('product_sharks').insert({
        product_id: product.id,
        shark_id: sharkId,
        investment_amount: shark.amount,
        equity_percentage: shark.equity,
        is_lead_investor: shark.isLead || false,
      });
      linkedSharks.push(shark.name);
    }
  }

  return { success: true, sharks: linkedSharks };
}

async function processProduct(
  product: { id: string; name: string },
  sharkIds: Map<string, string>
): Promise<{ success: boolean; name: string; sharks: string[] }> {
  try {
    const result = await enrichProductSharks(product, sharkIds);
    return { success: result.success, name: product.name, sharks: result.sharks };
  } catch {
    return { success: false, name: product.name, sharks: [] };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const concurrency = 50;

  console.log('\n' + '━'.repeat(60));
  console.log('🦈 Re-enrich Deal Products (Sharks Only)');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${dryRun}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log('━'.repeat(60) + '\n');

  if (dryRun) {
    console.log('   DRY RUN - no changes will be made\n');
  }

  const sharkIds = await getSharkIds();
  console.log(`   Loaded ${sharkIds.size / 2} sharks\n`);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('deal_outcome', 'deal')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`❌ Failed to fetch products: ${error.message}`);
    return;
  }

  console.log(`   Found ${products?.length || 0} deal products to re-enrich\n`);

  if (!products || products.length === 0) {
    console.log('   Nothing to do!\n');
    return;
  }

  if (dryRun) {
    console.log('   Would process these products:');
    for (const p of products.slice(0, 10)) {
      console.log(`     - ${p.name}`);
    }
    if (products.length > 10) {
      console.log(`     ... and ${products.length - 10} more`);
    }
    return;
  }

  let success = 0;
  let failed = 0;
  let processed = 0;
  const tracker = TokenTracker.getInstance();

  for (let i = 0; i < products.length; i += concurrency) {
    const batch = products.slice(i, i + concurrency);
    
    const results = await Promise.all(
      batch.map(product => processProduct(product, sharkIds))
    );

    for (const result of results) {
      processed++;
      if (result.success) {
        success++;
        console.log(`   ✅ ${result.name} | ${result.sharks.join(', ')}`);
      } else {
        failed++;
        console.log(`   ❌ ${result.name}`);
      }
    }

    console.log(`   [${processed}/${products.length}] batch complete\n`);
  }

  console.log('━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Cost: $${tracker.estimateCost().toFixed(4)}`);
  console.log('━'.repeat(60) + '\n');
}

main().catch(console.error);
