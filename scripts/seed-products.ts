import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { discoverSeasonProducts, DiscoveredProduct } from './ingestion/enrichment/services/product-discovery-service';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';

dotenv.config({ path: '.env.local' });

interface SeedProduct {
  name: string;
  companyName: string | null;
  founders: string[];
  season: number;
  episodeNumber: number | null;
  askingAmount: number | null;
  askingEquity: number | null;
  dealAmount: number | null;
  dealEquity: number | null;
  dealOutcome: 'deal' | 'no_deal' | 'unknown';
  sharks: string[];
  category: string | null;
  description: string | null;
}

interface SeedData {
  products: SeedProduct[];
}

function loadManualSeed(): SeedProduct[] {
  const seedPath = path.join(__dirname, 'data', 'seed-products.json');
  if (!fs.existsSync(seedPath)) {
    console.log('   ⚠️  No manual seed file found');
    return [];
  }
  const data: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log(`   📦 Loaded ${data.products.length} products from manual seed`);
  return data.products;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mergeProducts(
  manualSeed: SeedProduct[],
  discovered: DiscoveredProduct[]
): SeedProduct[] {
  const merged = new Map<string, SeedProduct>();

  for (const product of manualSeed) {
    const key = slugify(product.name);
    merged.set(key, product);
  }

  for (const product of discovered) {
    const key = slugify(product.name);
    if (!merged.has(key)) {
      merged.set(key, product);
    }
  }

  return Array.from(merged.values());
}

function printProductSummary(products: SeedProduct[]) {
  console.log('\n📊 Product Summary:');
  console.log(`   Total: ${products.length}`);
  
  const byOutcome = products.reduce((acc, p) => {
    acc[p.dealOutcome] = (acc[p.dealOutcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`   By outcome: ${JSON.stringify(byOutcome)}`);

  const bySeason = products.reduce((acc, p) => {
    acc[p.season] = (acc[p.season] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  console.log(`   Seasons covered: ${Object.keys(bySeason).length}`);

  const uniqueSharks = new Set(products.flatMap(p => p.sharks));
  console.log(`   Unique sharks: ${uniqueSharks.size}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDiscovery = args.includes('--skip-discovery');
  const onlySeed = args.includes('--only-seed');
  
  let seasonsToDiscover: number[] = [];
  const seasonIndex = args.indexOf('--season');
  if (seasonIndex >= 0 && args[seasonIndex + 1]) {
    seasonsToDiscover = [parseInt(args[seasonIndex + 1], 10)];
  }
  
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    const limit = parseInt(args[limitIndex + 1], 10);
    seasonsToDiscover = Array.from({ length: limit }, (_, i) => i + 1);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('🦈 Shark Tank Product Seeder');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Skip discovery: ${skipDiscovery || onlySeed ? 'Yes' : 'No'}`);
  if (seasonsToDiscover.length > 0) {
    console.log(`   Seasons: ${seasonsToDiscover.join(', ')}`);
  }
  console.log('━'.repeat(60) + '\n');

  const manualSeed = loadManualSeed();
  let allDiscovered: DiscoveredProduct[] = [];

  if (!skipDiscovery && !onlySeed && seasonsToDiscover.length > 0) {
    console.log('\n🔍 Running LLM-based discovery...\n');
    
    for (const season of seasonsToDiscover) {
      const result = await discoverSeasonProducts(season);
      if (result.success) {
        allDiscovered.push(...result.products);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const allProducts = mergeProducts(manualSeed, allDiscovered);
  printProductSummary(allProducts);

  const tracker = TokenTracker.getInstance();
  const cost = tracker.estimateCost();
  console.log(`\n💰 Estimated LLM cost: $${cost.toFixed(4)}`);

  if (dryRun) {
    console.log('\n📝 Dry run - sample products:\n');
    for (const product of allProducts.slice(0, 10)) {
      console.log(`   ${product.name} (S${product.season})`);
      console.log(`      Founders: ${product.founders.join(', ') || 'Unknown'}`);
      console.log(`      Outcome: ${product.dealOutcome}`);
      if (product.sharks.length > 0) {
        console.log(`      Sharks: ${product.sharks.join(', ')}`);
      }
      console.log('');
    }
    
    if (allProducts.length > 10) {
      console.log(`   ... and ${allProducts.length - 10} more\n`);
    }
  } else {
    console.log('\n⚠️  Database write not implemented yet');
    console.log('   Run with --dry-run to preview data\n');
  }

  console.log('━'.repeat(60));
  console.log('✅ Done');
  console.log('━'.repeat(60) + '\n');
}

main().catch(console.error);
