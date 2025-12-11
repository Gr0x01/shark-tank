import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { searchTavily } from './ingestion/enrichment/shared/tavily-client';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Product {
  id: string;
  name: string;
  slug: string;
  amazon_url: string | null;
  status: string | null;
  season: number | null;
}

function extractAmazonUrl(text: string): string | null {
  // Match various Amazon URL formats
  const amazonRegex = /https?:\/\/(?:www\.)?amazon\.com\/[^\s"'<>)]+/gi;
  const matches = text.match(amazonRegex);

  if (!matches || matches.length === 0) return null;

  // Return the first match, clean it up
  let url = matches[0];

  // Remove trailing punctuation
  url = url.replace(/[.,;!?]$/, '');

  // Ensure it has /dp/ or /gp/product/ (actual product pages)
  if (url.includes('/dp/') || url.includes('/gp/product/')) {
    return url;
  }

  return null;
}

async function findAmazonLink(productName: string, productId: string): Promise<string | null> {
  try {
    // Search Tavily for Amazon link
    const response = await searchTavily(`${productName} amazon`, {
      entityType: 'product',
      entityId: productId,
      entityName: productName,
      ttlDays: 90,
      maxResults: 5,
    });

    // Try to extract Amazon URL from results
    for (const result of response.results) {
      // Check URL first
      if (result.url.includes('amazon.com')) {
        const cleaned = extractAmazonUrl(result.url);
        if (cleaned) return cleaned;
      }

      // Check content
      const fromContent = extractAmazonUrl(result.content);
      if (fromContent) return fromContent;
    }

    return null;
  } catch (error) {
    console.error(`   ❌ Error searching for ${productName}:`, error);
    return null;
  }
}

async function enrichAmazonLinks(options: {
  limit?: number;
  dryRun?: boolean;
  season?: number;
  statusFilter?: string;
}) {
  console.log('\n🔗 Amazon Link Enrichment\n');
  console.log('Options:', {
    limit: options.limit || 'all',
    dryRun: options.dryRun || false,
    season: options.season || 'all seasons',
    statusFilter: options.statusFilter || 'all statuses',
  });
  console.log('');

  // Build query
  let query = supabase
    .from('products')
    .select('id, name, slug, amazon_url, status, season')
    .is('amazon_url', null);

  if (options.season) {
    query = query.eq('season', options.season);
  }

  if (options.statusFilter) {
    query = query.eq('status', options.statusFilter);
  }

  query = query.order('season', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('✅ No products need Amazon link enrichment');
    return;
  }

  console.log(`📦 Found ${products.length} products without Amazon links\n`);

  let found = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n[${i + 1}/${products.length}] ${product.name} (S${product.season || '?'})`);

    try {
      const amazonUrl = await findAmazonLink(product.name, product.id);

      if (amazonUrl) {
        console.log(`   ✅ Found: ${amazonUrl}`);
        found++;

        if (!options.dryRun) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ amazon_url: amazonUrl })
            .eq('id', product.id);

          if (updateError) {
            console.error(`   ❌ Failed to update database:`, updateError);
            errors++;
          } else {
            console.log(`   💾 Saved to database`);
          }
        } else {
          console.log(`   🔍 [DRY RUN] Would save to database`);
        }
      } else {
        console.log(`   ⚠️  No Amazon link found`);
        notFound++;
      }

      // Rate limiting - wait 1.5s between requests to avoid hitting API limits
      if (i < products.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${product.name}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Found: ${found}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total processed: ${products.length}`);

  if (options.dryRun) {
    console.log('\n   🔍 [DRY RUN] No changes were saved to the database');
  }

  console.log('');
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: {
  limit?: number;
  dryRun?: boolean;
  season?: number;
  statusFilter?: string;
} = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--season' && args[i + 1]) {
    options.season = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--status' && args[i + 1]) {
    options.statusFilter = args[i + 1];
    i++;
  } else if (arg === '--help') {
    console.log(`
Usage: npx tsx scripts/enrich-amazon-links.ts [options]

Options:
  --limit N        Process only N products
  --dry-run        Preview changes without saving
  --season N       Only process products from season N
  --status STATUS  Only process products with status (active, out_of_business, etc.)
  --help           Show this help

Examples:
  # Test on 5 products first
  npx tsx scripts/enrich-amazon-links.ts --limit 5 --dry-run

  # Process all active products
  npx tsx scripts/enrich-amazon-links.ts --status active

  # Process all Season 17 products
  npx tsx scripts/enrich-amazon-links.ts --season 17

  # Process 10 active products for real
  npx tsx scripts/enrich-amazon-links.ts --limit 10 --status active
`);
    process.exit(0);
  }
}

enrichAmazonLinks(options).catch(console.error);
