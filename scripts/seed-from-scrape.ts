import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ScrapedProduct {
  name: string;
  url: string;
  season: number | null;
  episode: number | null;
  category: string | null;
  entrepreneur: string | null;
  askingAmount: number | null;
  askingEquity: number | null;
  dealAmount: number | null;
  dealEquity: number | null;
  dealOutcome: 'deal' | 'no_deal' | 'unknown';
  sharks: string[];
  description: string | null;
  imageUrl: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
  'Clothing, Wearables & Accessories': 'fashion-apparel',
  'Home, Garden & Tools': 'home-garden',
  'Toys, Kids & Babies': 'children-baby',
  'Beauty & Health': 'beauty-personal-care',
  'Food & Drink': 'food-beverage',
  'Sports & Outdoors': 'sports-outdoors',
  'Entertainment & Arts': 'novelty-gifts',
  'Shark Tank Gift Ideas': 'novelty-gifts',
  'Automotive & Industrial': 'automotive',
  'Tech & Electronics': 'technology',
  'Apps': 'technology',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function mapDealOutcome(outcome: string): string {
  if (outcome === 'deal') return 'deal';
  if (outcome === 'no_deal') return 'no_deal';
  return 'unknown';
}

async function loadCategories(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('categories').select('id, slug');
  if (error) throw error;
  
  const map = new Map<string, string>();
  for (const cat of data || []) {
    map.set(cat.slug, cat.id);
  }
  return map;
}

async function seedProducts(options: { limit?: number; dryRun?: boolean }) {
  const dataPath = path.join(__dirname, 'data', 'scraped-products.json');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let products: ScrapedProduct[] = rawData.products;

  console.log('\n🦈 Seeding products from scrape');
  console.log(`   Total scraped: ${products.length}`);
  
  if (options.limit) {
    products = products.slice(0, options.limit);
    console.log(`   Limited to: ${products.length}`);
  }
  console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}\n`);

  const categoryMap = await loadCategories();
  console.log(`   Loaded ${categoryMap.size} categories\n`);

  const toInsert = products.map(p => {
    const categorySlug = p.category ? CATEGORY_MAP[p.category] : null;
    const categoryId = categorySlug ? categoryMap.get(categorySlug) : null;

    return {
      name: p.name,
      slug: slugify(p.name),
      description: p.description,
      season: p.season,
      episode_number: p.episode,
      category_id: categoryId,
      founder_names: p.entrepreneur ? [p.entrepreneur] : null,
      asking_amount: p.askingAmount,
      asking_equity: p.askingEquity,
      deal_outcome: mapDealOutcome(p.dealOutcome),
      deal_amount: p.dealAmount,
      deal_equity: p.dealEquity,
      photo_url: p.imageUrl,
      enrichment_status: 'pending',
      enrichment_source: 'allsharktankproducts.com',
    };
  });

  if (options.dryRun) {
    console.log('📝 Sample records to insert:\n');
    for (const record of toInsert.slice(0, 5)) {
      console.log(`   ${record.name}`);
      console.log(`      slug: ${record.slug}`);
      console.log(`      season: ${record.season}, episode: ${record.episode_number}`);
      console.log(`      category_id: ${record.category_id || 'null'}`);
      console.log(`      deal_outcome: ${record.deal_outcome}`);
      console.log('');
    }
    return;
  }

  console.log('   Inserting products...\n');
  
  let inserted = 0;
  let skipped = 0;
  const batchSize = 50;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error(`   ❌ Batch error: ${error.message}`);
      skipped += batch.length;
    } else {
      inserted += data?.length || 0;
      skipped += batch.length - (data?.length || 0);
    }

    if ((i + batchSize) % 100 === 0 || i + batchSize >= toInsert.length) {
      console.log(`   [${Math.min(i + batchSize, toInsert.length)}/${toInsert.length}] ${inserted} inserted, ${skipped} skipped`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  let limit: number | undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }

  await seedProducts({ limit, dryRun });
}

main().catch(console.error);
