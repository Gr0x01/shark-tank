import * as dotenv from 'dotenv';
import { z } from 'zod';
import { searchProductDetails, searchProductStatus, combineSearchResultsCompact } from './ingestion/enrichment/shared/tavily-client';
import { synthesize } from './ingestion/enrichment/shared/synthesis-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';

dotenv.config({ path: '.env.local' });

const EnrichedProductSchema = z.object({
  founders: z.array(z.string()).nullable(),
  founderStory: z.string().nullable(),
  askingAmount: z.number().nullable(),
  askingEquity: z.number().nullable(),
  dealAmount: z.number().nullable(),
  dealEquity: z.number().nullable(),
  dealOutcome: z.enum(['deal', 'no_deal', 'deal_fell_through', 'unknown']),
  sharks: z.array(z.string()),
  status: z.enum(['active', 'out_of_business', 'acquired', 'unknown']),
  websiteUrl: z.string().nullable(),
  amazonUrl: z.string().nullable(),
  revenueEstimate: z.string().nullable(),
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
  "dealAmount": final deal amount in dollars or null,
  "dealEquity": final deal equity percentage or null,
  "dealOutcome": "deal" | "no_deal" | "deal_fell_through" | "unknown",
  "sharks": ["shark names who invested"],
  "status": "active" | "out_of_business" | "acquired" | "unknown",
  "websiteUrl": "official website" or null,
  "amazonUrl": "amazon product page" or null,
  "revenueEstimate": "latest revenue/sales figures" or null,
  "pitchSummary": "2-3 sentence summary of the pitch and outcome" or null
}

Be precise with numbers. If information is not found, use null.`;

async function enrichProduct(productName: string): Promise<EnrichedProduct | null> {
  console.log(`\n🔍 Enriching: ${productName}\n`);
  const tracker = TokenTracker.getInstance();

  console.log('   Fetching deal details...');
  const detailsResponse = await searchProductDetails(productName);
  
  console.log('   Fetching current status...');
  const statusResponse = await searchProductStatus(productName);

  const combinedContent = [
    '=== DEAL DETAILS ===',
    combineSearchResultsCompact(detailsResponse.results, 6000),
    '',
    '=== CURRENT STATUS ===',
    combineSearchResultsCompact(statusResponse.results, 6000),
  ].join('\n');

  console.log(`\n   Combined search content: ${combinedContent.length} chars`);
  console.log(`   Cache hits: details=${detailsResponse.fromCache}, status=${statusResponse.fromCache}`);

  console.log('\n   Synthesizing with LLM...');
  const result = await synthesize(
    ENRICHMENT_PROMPT,
    `Product: ${productName}\n\nSearch Results:\n${combinedContent}`,
    EnrichedProductSchema
  );

  if (result.success && result.data) {
    tracker.trackUsage(result.usage);
    return result.data;
  }

  console.error(`   ❌ Synthesis failed: ${result.error}`);
  return null;
}

async function main() {
  const productName = process.argv[2] || 'Scrub Daddy';
  
  console.log('━'.repeat(60));
  console.log('🦈 Product Enrichment Test');
  console.log('━'.repeat(60));

  const enriched = await enrichProduct(productName);

  if (enriched) {
    console.log('\n📊 Enriched Data:\n');
    console.log(JSON.stringify(enriched, null, 2));
  }

  const tracker = TokenTracker.getInstance();
  console.log(`\n💰 Estimated cost: $${tracker.estimateCost().toFixed(4)}`);
  console.log('━'.repeat(60));
}

main().catch(console.error);
