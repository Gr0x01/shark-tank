import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { searchProductDetails, searchProductStatus, combineSearchResultsCompact } from './ingestion/enrichment/shared/tavily-client';
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

// Reuse schemas from batch-enrich
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

async function getOrCreateEpisode(season: number, episodeNumber: number): Promise<string> {
  // Check if episode exists
  const { data: existing } = await supabase
    .from('episodes')
    .select('id')
    .eq('season', season)
    .eq('episode_number', episodeNumber)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new episode
  const { data: newEpisode, error } = await supabase
    .from('episodes')
    .insert({
      season,
      episode_number: episodeNumber,
      title: `Season ${season}, Episode ${episodeNumber}`,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create episode: ${error.message}`);
  }

  return newEpisode.id;
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

async function updateProductWithEnrichment(
  productId: string,
  enriched: EnrichedProduct,
  sharkIds: Map<string, string>
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

  const { error: updateError } = await supabase
    .from('products')
    .update(productUpdate)
    .eq('id', productId);

  if (updateError) {
    console.error(`      ❌ Update failed: ${updateError.message}`);
    return false;
  }

  // Link sharks if deal
  if (enriched.sharks.length > 0 && enriched.dealOutcome === 'deal') {
    await supabase.from('product_sharks').delete().eq('product_id', productId);

    for (const shark of enriched.sharks) {
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
          sharkIds.set(newSlug, sharkId);
          console.log(`      🦈 Created guest shark: ${shark.name}`);
        }
      }

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

async function createProduct(
  name: string,
  season: number,
  episodeNumber: number,
  episodeId: string
): Promise<{ id: string; created: boolean } | null> {
  const slug = slugify(name);

  // Use upsert to handle race conditions
  const { data: result, error } = await supabase
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
    .select('id')
    .single();

  if (error) {
    // If upsert failed due to duplicate (ignoreDuplicates), fetch existing
    if (error.code === 'PGRST116') {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .single();
      if (existing) {
        return { id: existing.id, created: false };
      }
    }
    console.error(`   ❌ Failed to create product "${name}": ${error.message}`);
    return null;
  }

  // Check if this was an insert or if it was ignored
  // By checking if the product was recently created
  const { data: product } = await supabase
    .from('products')
    .select('id, created_at')
    .eq('slug', slug)
    .single();

  if (!product) {
    return null;
  }

  // If created within last 5 seconds, consider it newly created
  const createdAt = new Date(product.created_at);
  const isNew = Date.now() - createdAt.getTime() < 5000;

  return { id: product.id, created: isNew };
}

function printUsage() {
  console.log(`
Usage: npx tsx scripts/new-episode.ts <products...> --season <num> --episode <num> [options]

Arguments:
  <products...>       Product names (quoted if spaces)

Options:
  --season <num>      Season number (required)
  --episode <num>     Episode number (required)
  --dry-run           Preview without creating products
  --skip-enrich       Create products but skip enrichment

Examples:
  npx tsx scripts/new-episode.ts "Edible Architecture" "Cool Product" --season 17 --episode 8
  npx tsx scripts/new-episode.ts "Product Name" --season 17 --episode 8 --dry-run
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const skipEnrich = args.includes('--skip-enrich');

  // Parse season
  const seasonIndex = args.indexOf('--season');
  if (seasonIndex < 0 || !args[seasonIndex + 1]) {
    console.error('❌ --season is required');
    printUsage();
    return;
  }
  const season = parseInt(args[seasonIndex + 1], 10);

  // Parse episode
  const episodeIndex = args.indexOf('--episode');
  if (episodeIndex < 0 || !args[episodeIndex + 1]) {
    console.error('❌ --episode is required');
    printUsage();
    return;
  }
  const episodeNumber = parseInt(args[episodeIndex + 1], 10);

  // Extract product names (all args that aren't flags)
  const flagIndices = new Set([
    seasonIndex, seasonIndex + 1,
    episodeIndex, episodeIndex + 1,
  ]);
  if (args.includes('--dry-run')) flagIndices.add(args.indexOf('--dry-run'));
  if (args.includes('--skip-enrich')) flagIndices.add(args.indexOf('--skip-enrich'));

  const productNames = args.filter((arg, i) => {
    if (flagIndices.has(i)) return false;
    if (arg.startsWith('--')) return false;
    return true;
  });

  if (productNames.length === 0) {
    console.error('❌ At least one product name is required');
    printUsage();
    return;
  }

  console.log('\n' + '━'.repeat(60));
  console.log('🦈 New Episode Product Ingestion');
  console.log('━'.repeat(60));
  console.log(`   Season: ${season}`);
  console.log(`   Episode: ${episodeNumber}`);
  console.log(`   Products: ${productNames.length}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Skip enrichment: ${skipEnrich ? 'Yes' : 'No'}`);
  console.log('━'.repeat(60) + '\n');

  if (dryRun) {
    console.log('   [DRY RUN] Would create products:');
    for (const name of productNames) {
      console.log(`   - ${name} (slug: ${slugify(name)})`);
    }
    console.log('\n' + '━'.repeat(60) + '\n');
    return;
  }

  // Get or create episode
  const episodeId = await getOrCreateEpisode(season, episodeNumber);
  console.log(`   📺 Episode ID: ${episodeId}\n`);

  // Create products
  const created: { id: string; name: string }[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const name of productNames) {
    const result = await createProduct(name, season, episodeNumber, episodeId);
    if (result) {
      if (result.created) {
        created.push({ id: result.id, name });
        console.log(`   ✅ Created: ${name}`);
      } else {
        skipped.push(name);
        console.log(`   ⏭️  Skipped (exists): ${name}`);
      }
    } else {
      failed.push(name);
    }
  }

  console.log('');

  // Enrich new products
  if (!skipEnrich && created.length > 0) {
    console.log('   🔍 Starting enrichment...\n');

    const sharkIds = await getSharkIds();
    const tracker = TokenTracker.getInstance();

    for (const product of created) {
      console.log(`   📝 Enriching: ${product.name}`);

      try {
        const enriched = await enrichProduct(product.name);

        if (enriched) {
          const success = await updateProductWithEnrichment(product.id, enriched, sharkIds);
          if (success) {
            console.log(`      ✅ ${enriched.dealOutcome} | ${enriched.status} | ${enriched.sharks.length} sharks`);
          }
        } else {
          console.log(`      ⚠️  No enrichment data found`);
        }
      } catch (err) {
        console.log(`      ❌ Enrichment failed: ${err}`);
      }
    }

    console.log(`\n   💰 Estimated cost: $${tracker.estimateCost().toFixed(4)}`);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Created: ${created.length}`);
  console.log(`   Skipped: ${skipped.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log('━'.repeat(60) + '\n');
}

main().catch(console.error);
