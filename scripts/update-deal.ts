import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  return createClient(url, key);
}

const supabase = getSupabase();

const SHARK_NAME_MAP: Record<string, string> = {
  'mark cuban': 'mark-cuban',
  'mark': 'mark-cuban',
  'barbara corcoran': 'barbara-corcoran',
  'barbara': 'barbara-corcoran',
  'daymond john': 'daymond-john',
  'daymond': 'daymond-john',
  "kevin o'leary": 'kevin-oleary',
  'kevin oleary': 'kevin-oleary',
  'kevin': 'kevin-oleary',
  'mr. wonderful': 'kevin-oleary',
  'lori greiner': 'lori-greiner',
  'lori': 'lori-greiner',
  'robert herjavec': 'robert-herjavec',
  'robert': 'robert-herjavec',
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

async function findProduct(nameOrSlug: string): Promise<{ id: string; name: string } | null> {
  const slug = slugify(nameOrSlug);

  // Try by slug first
  const { data: bySlug } = await supabase
    .from('products')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (bySlug) return bySlug;

  // Try by name (case insensitive)
  const { data: byName } = await supabase
    .from('products')
    .select('id, name')
    .ilike('name', nameOrSlug)
    .single();

  return byName || null;
}

async function linkSharks(
  productId: string,
  sharkNames: string[],
  sharkIds: Map<string, string>,
  dealAmount?: number,
  dealEquity?: number
): Promise<void> {
  // Clear existing shark links
  await supabase.from('product_sharks').delete().eq('product_id', productId);

  for (const sharkName of sharkNames) {
    const normalizedName = sharkName.toLowerCase().trim();
    const sharkSlug = SHARK_NAME_MAP[normalizedName];
    let sharkId = sharkSlug ? sharkIds.get(sharkSlug) : sharkIds.get(normalizedName);

    if (!sharkId) {
      // Try to find by slug
      const guessedSlug = slugify(sharkName);
      sharkId = sharkIds.get(guessedSlug);
    }

    if (!sharkId) {
      // Create as guest shark
      const newSlug = slugify(sharkName);
      const { data: newShark, error: createError } = await supabase
        .from('sharks')
        .insert({
          name: sharkName,
          slug: newSlug,
          is_guest_shark: true,
        })
        .select('id')
        .single();

      if (!createError && newShark) {
        sharkId = newShark.id;
        sharkIds.set(normalizedName, sharkId);
        sharkIds.set(newSlug, sharkId);
        console.log(`   🦈 Created guest shark: ${sharkName}`);
      }
    }

    if (sharkId) {
      // For multi-shark deals, split evenly if no individual amounts known
      const numSharks = sharkNames.length;
      const individualAmount = dealAmount ? Math.round(dealAmount / numSharks) : null;
      const individualEquity = dealEquity ? dealEquity / numSharks : null;

      await supabase.from('product_sharks').insert({
        product_id: productId,
        shark_id: sharkId,
        investment_amount: individualAmount,
        equity_percentage: individualEquity,
        is_lead_investor: sharkNames.length === 1,
      });
      console.log(`   ✅ Linked: ${sharkName}`);
    } else {
      console.log(`   ⚠️  Could not find/create shark: ${sharkName}`);
    }
  }
}

function printUsage() {
  console.log(`
Usage: npx tsx scripts/update-deal.ts <product> [deal-options]

Arguments:
  <product>           Product name or slug

Deal Outcome (pick one):
  --deal              Product got a deal
  --no-deal           Product did not get a deal
  --fell-through      Deal was made but fell through after the show

Ask (the pitch):
  --ask <amount>      Asking amount in dollars
  --ask-equity <pct>  Asking equity percentage

Deal Terms (when --deal):
  --amount <dollars>  Deal amount
  --equity <pct>      Equity percentage
  --sharks <names>    Shark name(s) - can repeat or comma-separate

Royalty/Loan Deals:
  --royalty <pct>     Royalty percentage
  --royalty-terms     Royalty terms (e.g., "until 500k recouped")
  --loan              Mark as loan deal (sets deal_type)

Other:
  --status <status>   Business status: active | out_of_business | acquired | unknown
  --dry-run           Preview changes without saving

Examples:
  # Simple equity deal
  npx tsx scripts/update-deal.ts "Scrub Daddy" --deal --amount 200000 --equity 20 --sharks "Lori"

  # No deal
  npx tsx scripts/update-deal.ts "Failed Product" --no-deal

  # Multi-shark deal with ask
  npx tsx scripts/update-deal.ts "Cool Product" --deal --ask 100000 --ask-equity 10 --amount 150000 --equity 25 --sharks "Mark" "Barbara"

  # Royalty deal
  npx tsx scripts/update-deal.ts "Food Product" --deal --amount 100000 --royalty 5 --sharks "Kevin"
`);
}

interface DealUpdate {
  deal_outcome?: 'deal' | 'no_deal' | 'deal_fell_through';
  asking_amount?: number;
  asking_equity?: number;
  deal_amount?: number;
  deal_equity?: number;
  deal_type?: string;
  royalty_percent?: number;
  royalty_terms?: string;
  royalty_deal?: boolean;
  status?: string;
}

function parseArgs(args: string[]): {
  productName: string;
  update: DealUpdate;
  sharks: string[];
  dryRun: boolean;
} | null {
  if (args.length === 0) return null;

  const productName = args[0];
  if (productName.startsWith('--')) {
    console.error('❌ First argument must be product name');
    return null;
  }

  const update: DealUpdate = {};
  const sharks: string[] = [];
  let dryRun = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--deal':
        update.deal_outcome = 'deal';
        break;
      case '--no-deal':
        update.deal_outcome = 'no_deal';
        break;
      case '--fell-through':
        update.deal_outcome = 'deal_fell_through';
        break;
      case '--ask': {
        const val = parseInt(args[++i], 10);
        if (isNaN(val)) { console.error(`❌ Invalid --ask value: ${args[i]}`); return null; }
        update.asking_amount = val;
        break;
      }
      case '--ask-equity': {
        const val = parseFloat(args[++i]);
        if (isNaN(val)) { console.error(`❌ Invalid --ask-equity value: ${args[i]}`); return null; }
        update.asking_equity = val;
        break;
      }
      case '--amount': {
        const val = parseInt(args[++i], 10);
        if (isNaN(val)) { console.error(`❌ Invalid --amount value: ${args[i]}`); return null; }
        update.deal_amount = val;
        break;
      }
      case '--equity': {
        const val = parseFloat(args[++i]);
        if (isNaN(val)) { console.error(`❌ Invalid --equity value: ${args[i]}`); return null; }
        update.deal_equity = val;
        break;
      }
      case '--royalty': {
        const val = parseFloat(args[++i]);
        if (isNaN(val)) { console.error(`❌ Invalid --royalty value: ${args[i]}`); return null; }
        update.royalty_percent = val;
        update.royalty_deal = true;
        break;
      }
      case '--royalty-terms':
        update.royalty_terms = args[++i];
        break;
      case '--loan':
        update.deal_type = 'loan'; // Will be refined below
        break;
      case '--status':
        update.status = args[++i];
        break;
      case '--sharks':
        // Collect all following args until next flag
        while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          i++;
          // Handle comma-separated sharks
          const sharkArg = args[i];
          if (sharkArg.includes(',')) {
            sharks.push(...sharkArg.split(',').map(s => s.trim()));
          } else {
            sharks.push(sharkArg);
          }
        }
        break;
      case '--dry-run':
        dryRun = true;
        break;
    }
  }

  // Set deal_type based on all parsed args (order-independent)
  if (update.deal_outcome === 'deal') {
    if (update.royalty_percent) {
      update.deal_type = update.deal_equity ? 'equity_plus_royalty' : 'royalty';
    } else if (update.deal_type === 'loan') {
      update.deal_type = update.deal_equity ? 'equity_plus_loan' : 'loan';
    } else if (!update.deal_type) {
      update.deal_type = 'equity';
    }
  }

  return { productName, update, sharks, dryRun };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    return;
  }

  const parsed = parseArgs(args);
  if (!parsed) {
    printUsage();
    return;
  }

  const { productName, update, sharks, dryRun } = parsed;

  console.log('\n' + '━'.repeat(60));
  console.log('🦈 Update Deal Details');
  console.log('━'.repeat(60));
  console.log(`   Product: ${productName}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log('━'.repeat(60) + '\n');

  // Find product
  const product = await findProduct(productName);
  if (!product) {
    console.error(`   ❌ Product not found: ${productName}`);
    console.log('\n   Try searching with a different name or check the database.\n');
    return;
  }

  console.log(`   📦 Found: ${product.name} (ID: ${product.id})\n`);

  // Show what we're updating
  console.log('   📝 Updates:');
  for (const [key, value] of Object.entries(update)) {
    console.log(`      ${key}: ${value}`);
  }
  if (sharks.length > 0) {
    console.log(`      sharks: ${sharks.join(', ')}`);
  }
  console.log('');

  if (dryRun) {
    console.log('   [DRY RUN] No changes made.\n');
    return;
  }

  // Apply update
  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from('products')
      .update(update)
      .eq('id', product.id);

    if (error) {
      console.error(`   ❌ Update failed: ${error.message}`);
      return;
    }
    console.log('   ✅ Product updated');
  }

  // Link sharks if deal
  if (sharks.length > 0 && update.deal_outcome === 'deal') {
    const sharkIds = await getSharkIds();
    await linkSharks(product.id, sharks, sharkIds, update.deal_amount, update.deal_equity);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Done!');
  console.log('━'.repeat(60) + '\n');
}

main().catch(console.error);
