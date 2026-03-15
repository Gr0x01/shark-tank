import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';
import {
  NarrativeContent,
  ProductForNarrative,
  searchForNarrative,
  generateNarrative,
} from './ingestion/enrichment/shared/narrative';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function enrichProductNarrative(
  product: ProductForNarrative,
  dryRun: boolean
): Promise<{ success: boolean; narrative?: NarrativeContent }> {
  console.log(`\n   📝 ${product.name}`);
  console.log(`      Status: ${product.status} | Outcome: ${product.deal_outcome}`);

  // Search
  console.log('      Searching...');
  const searchResults = await searchForNarrative(product.name);

  // Generate
  console.log('      Generating narrative (Flex processing - may take up to 5 min)...');
  const narrative = await generateNarrative(product, searchResults);

  if (!narrative) {
    return { success: false };
  }

  // Log summary
  const sections = Object.entries(narrative).filter(([, v]) => v !== null);
  console.log(`      ✅ Generated ${sections.length}/6 sections`);

  if (dryRun) {
    console.log('\n      --- PREVIEW ---');
    for (const [key, value] of sections) {
      const preview = value ? value.substring(0, 150) + '...' : 'null';
      console.log(`      ${key}: ${preview}`);
    }
    return { success: true, narrative };
  }

  // Save to database
  const { error } = await supabase
    .from('products')
    .update({
      narrative_content: narrative,
      narrative_version: 1,
      narrative_generated_at: new Date().toISOString(),
    })
    .eq('id', product.id);

  if (error) {
    console.error(`      ❌ Save failed: ${error.message}`);
    return { success: false };
  }

  console.log('      💾 Saved to database');
  return { success: true, narrative };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outputJson = args.includes('--json');

  // Get specific products by name
  const productNames: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--product' && args[i + 1]) {
      productNames.push(args[i + 1]);
      i++;
    }
  }

  let limit: number | undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📖 Narrative Content Enrichment');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Model: gpt-4.1-mini (Flex processing)`);
  if (productNames.length) console.log(`   Products: ${productNames.join(', ')}`);
  if (limit) console.log(`   Limit: ${limit}`);
  console.log('━'.repeat(60));

  // Build query
  let query = supabase
    .from('products')
    .select('id, name, season, episode_number, deal_outcome, status, asking_amount, asking_equity, deal_amount, deal_equity, founder_names');

  if (productNames.length > 0) {
    query = query.in('name', productNames);
  } else {
    // Default: get products without narrative content
    query = query.or('narrative_version.is.null,narrative_version.eq.0');
    if (limit) {
      query = query.limit(limit);
    }
  }

  const { data: products, error } = await query;

  if (error) {
    console.error(`❌ Failed to fetch products: ${error.message}`);
    return;
  }

  if (!products || products.length === 0) {
    console.log('\n   No products to process.\n');
    return;
  }

  console.log(`\n   Found ${products.length} products to enrich\n`);

  const tracker = TokenTracker.getInstance();
  const results: { name: string; success: boolean; narrative?: NarrativeContent }[] = [];

  for (const product of products) {
    const result = await enrichProductNarrative(product as ProductForNarrative, dryRun);
    results.push({ name: product.name, ...result });
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Summary');
  console.log('━'.repeat(60));
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Est. Cost: $${tracker.estimateCost().toFixed(4)}`);
  console.log('━'.repeat(60) + '\n');

  // Output JSON if requested
  if (outputJson) {
    const jsonOutput = results.map(r => ({
      name: r.name,
      success: r.success,
      narrative: r.narrative,
    }));
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(jsonOutput, null, 2));
  }
}

main().catch(console.error);
