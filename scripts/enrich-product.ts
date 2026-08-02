import * as dotenv from 'dotenv';
import { z } from 'zod';
import { searchProductDetails, searchProductStatus, combineSearchResultsCompact } from './ingestion/enrichment/shared/tavily-client';
import { synthesize } from './ingestion/enrichment/shared/synthesis-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';
// Read-only preview tool. The schema and prompt come from the shared module rather
// than a local copy — the copy that used to live here drifted and missed the Aug 2026
// offer-vs-deal fix, so this script printed sharks who never actually invested.
import { FullEnrichmentSchema, FULL_ENRICHMENT_PROMPT } from '../src/lib/services/enrichment';

dotenv.config({ path: '.env.local' });

type EnrichedProduct = z.infer<typeof FullEnrichmentSchema>;

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
    FULL_ENRICHMENT_PROMPT,
    `Product: ${productName}\n\nSearch Results:\n${combinedContent}`,
    FullEnrichmentSchema
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
