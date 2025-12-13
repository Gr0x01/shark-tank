/**
 * Automated Episode Workflow
 *
 * Detects new episodes and imports products automatically:
 * 1. Check TVMaze API for recently aired episodes
 * 2. Scrape competitor site for product names
 * 3. Create products in database
 * 4. Run enrichment pipeline (backstory + deal search)
 *
 * Designed to run as daily cron job to catch missed episodes
 */

import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { checkForNewEpisodes } from './check-new-episodes';
import { scrapeEpisodeProducts, EpisodeProduct } from './scrape-episode-products';
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

// Reuse schemas from new-episode.ts
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

async function getOrCreateEpisode(season: number, episodeNumber: number, airDate?: string): Promise<string> {
  const { data: existing } = await supabase
    .from('episodes')
    .select('id')
    .eq('season', season)
    .eq('episode_number', episodeNumber)
    .single();

  if (existing) {
    return existing.id;
  }

  const { data: newEpisode, error } = await supabase
    .from('episodes')
    .insert({
      season,
      episode_number: episodeNumber,
      title: `Season ${season}, Episode ${episodeNumber}`,
      air_date: airDate || null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create episode: ${error.message}`);
  }

  console.log(`   ✓ Created episode: S${season}E${episodeNumber}`);
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
          equity_percent: nullIfZero(shark.equity),
          is_lead_investor: shark.isLead || false,
        });
      }
    }
  }

  return true;
}

async function createProduct(product: EpisodeProduct, episodeId: string): Promise<string | null> {
  const slug = slugify(product.name);

  // Use UPSERT to avoid race conditions
  // If slug already exists, we'll get the existing ID
  const { data: upsertedProduct, error } = await supabase
    .from('products')
    .upsert({
      name: product.name,
      slug,
      season: product.season,
      episode: product.episode,
      episode_id: episodeId,
      deal_outcome: 'unknown',
      enrichment_status: 'pending',
    }, {
      onConflict: 'slug',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`   ❌ Failed to create/update product "${product.name}": ${error.message}`);
    return null;
  }

  console.log(`   ✓ Product: ${product.name} (S${product.season}E${product.episode})`);
  return upsertedProduct.id;
}

async function runWorkflow(options: {
  lookbackHours?: number;
  skipEnrichment?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  const tracker = TokenTracker.getInstance();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🤖 Automated Episode Workflow`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Step 1: Check for new episodes
  console.log(`📡 Step 1: Checking TVMaze for new episodes...`);
  const missingEpisodes = await checkForNewEpisodes({
    lookbackHours: options.lookbackHours,
    dryRun: options.dryRun,
  });

  if (missingEpisodes.length === 0) {
    console.log(`\n✅ All caught up! No missing episodes found.`);
    return;
  }

  if (options.dryRun) {
    console.log(`\n🔍 Dry run complete. Would process ${missingEpisodes.length} episode(s)`);
    return;
  }

  // Step 2: Process each missing episode
  let totalProductsCreated = 0;
  let totalProductsEnriched = 0;

  for (const episode of missingEpisodes) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📺 Processing S${episode.season}E${episode.episode}: "${episode.name}"`);
    console.log(`   Air date: ${episode.airDate}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Step 2a: Scrape competitor for product names
    console.log(`🦈 Step 2: Scraping competitor site for products...`);
    let products: EpisodeProduct[] = [];

    try {
      products = await scrapeEpisodeProducts({
        season: episode.season,
        episode: episode.episode,
        timeout: 90000, // 90 second timeout
      });
    } catch (err) {
      console.error(`   ❌ Scraping failed:`, err);
      console.log(`   ⏭️  Skipping this episode (may not be on competitor site yet)`);
      continue;
    }

    if (products.length === 0) {
      console.log(`   ⚠️  No products found on competitor site`);
      console.log(`   ⏭️  Skipping (episode may not be published yet)`);
      continue;
    }

    // Step 3: Create episode and products in database
    console.log(`\n📝 Step 3: Creating products in database...`);
    const episodeId = await getOrCreateEpisode(episode.season, episode.episode, episode.airDate);

    const productIds: Array<{ id: string; name: string }> = [];

    for (const product of products) {
      const productId = await createProduct(product, episodeId);
      if (productId) {
        productIds.push({ id: productId, name: product.name });
        totalProductsCreated++;
      }
    }

    if (options.skipEnrichment) {
      console.log(`\n⏭️  Skipping enrichment (--skip-enrichment flag)`);
      continue;
    }

    // Step 4: Run enrichment pipeline
    console.log(`\n🔍 Step 4: Running enrichment pipeline...`);
    const sharkIds = await getSharkIds();

    for (const { id, name } of productIds) {
      console.log(`\n   Enriching: ${name}`);

      try {
        const enriched = await enrichProduct(name);

        if (enriched) {
          const success = await updateProductWithEnrichment(id, enriched, sharkIds);
          if (success) {
            console.log(`      ✓ Enriched successfully`);
            totalProductsEnriched++;
          }
        } else {
          console.log(`      ⚠️  Enrichment returned null`);
        }
      } catch (err) {
        console.error(`      ❌ Enrichment failed:`, err);
      }

      // Rate limiting: 1.5s between requests
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Final summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Workflow Complete`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Episodes processed: ${missingEpisodes.length}`);
  console.log(`   Products created: ${totalProductsCreated}`);
  console.log(`   Products enriched: ${totalProductsEnriched}`);
  console.log(`   ${tracker.getSummary()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  let lookbackHours: number | undefined;
  const lookbackIndex = args.indexOf('--lookback');
  if (lookbackIndex >= 0 && args[lookbackIndex + 1]) {
    lookbackHours = parseInt(args[lookbackIndex + 1], 10);
  }

  const skipEnrichment = args.includes('--skip-enrichment');
  const dryRun = args.includes('--dry-run');

  try {
    await runWorkflow({ lookbackHours, skipEnrichment, dryRun });
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Workflow failed:`, err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runWorkflow };
