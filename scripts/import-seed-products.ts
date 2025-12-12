import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function importSeedProducts(dryRun: boolean = false) {
  console.log('\n' + '━'.repeat(60));
  console.log('🦈 Importing Seed Products');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}\n`);

  // Load seed file
  const seedPath = path.join(__dirname, 'data', 'seed-products.json');
  if (!fs.existsSync(seedPath)) {
    console.error('❌ seed-products.json not found');
    return;
  }

  const data: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log(`📦 Loaded ${data.products.length} products from seed file\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of data.products) {
    const slug = slugify(product.name);

    // Check if product already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping ${product.name} (already exists)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`✓ Would import: ${product.name} (S${product.season}E${product.episodeNumber})`);
      imported++;
      continue;
    }

    // Get category ID
    let categoryId: string | null = null;
    if (product.category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', product.category)
        .single();
      categoryId = categoryData?.id || null;
    }

    // Insert product
    const { data: insertedProduct, error: productError } = await supabase
      .from('products')
      .insert({
        name: product.name,
        slug,
        company_name: product.companyName,
        founder_names: product.founders,
        season: product.season,
        category_id: categoryId,
        asking_amount: product.askingAmount,
        asking_equity: product.askingEquity,
        deal_amount: product.dealAmount,
        deal_equity: product.dealEquity,
        deal_outcome: product.dealOutcome,
        description: product.description,
        status: 'active', // Default to active, can be updated later
      })
      .select()
      .single();

    if (productError) {
      console.error(`❌ Error importing ${product.name}:`, productError.message);
      errors++;
      continue;
    }

    // Link sharks if deal was made
    if (product.dealOutcome === 'deal' && product.sharks.length > 0) {
      for (const sharkName of product.sharks) {
        const { data: sharkData } = await supabase
          .from('sharks')
          .select('id')
          .eq('name', sharkName)
          .single();

        if (sharkData) {
          await supabase
            .from('product_sharks')
            .insert({
              product_id: insertedProduct.id,
              shark_id: sharkData.id,
            });
        }
      }
    }

    console.log(`✅ Imported: ${product.name} (S${product.season}E${product.episodeNumber})`);
    imported++;
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log('━'.repeat(60) + '\n');
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

importSeedProducts(dryRun).catch(console.error);
