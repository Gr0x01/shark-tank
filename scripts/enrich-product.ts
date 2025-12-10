import * as dotenv from 'dotenv';
import { z } from 'zod';
import { searchProductDetails, searchProductStatus, combineSearchResultsCompact } from './ingestion/enrichment/shared/tavily-client';
import { synthesize } from './ingestion/enrichment/shared/synthesis-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';

dotenv.config({ path: '.env.local' });

const SharkInvestmentSchema = z.object({
  name: z.string(),
  amount: z.number().nullable(),
  equity: z.number().nullable(),
  isLead: z.boolean().optional(),
});

const EnrichedProductSchema = z.object({
  founders: z.array(z.string()).nullable(),
  founderStory: z.string().nullable(),
  askingAmount: z.number().nullable(),
  askingEquity: z.number().nullable(),
  dealType: z.enum(['equity', 'royalty', 'loan', 'equity_plus_royalty', 'equity_plus_loan', 'contingent', 'unknown']),
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
