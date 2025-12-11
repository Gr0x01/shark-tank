import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ManualLink {
  slug: string;
  amazonUrl: string;
}

function parseManualLinks(filePath: string): ManualLink[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const links: ManualLink[] = [];

  // Split by lines
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, comments, headers, markdown formatting
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') ||
        trimmed.startsWith('```') || trimmed.startsWith('Product Slug') ||
        trimmed.startsWith('Add')) {
      continue;
    }

    // Parse "slug | url" format
    const parts = trimmed.split('|').map(p => p.trim());
    if (parts.length === 2) {
      const [slug, url] = parts;

      // Validate Amazon URL
      if (url.includes('amazon.com') && (url.includes('/dp/') || url.includes('/gp/product/'))) {
        links.push({ slug, amazonUrl: url });
      } else {
        console.warn(`⚠️  Invalid Amazon URL for ${slug}: ${url}`);
      }
    }
  }

  return links;
}

async function importManualLinks(filePath: string, dryRun: boolean = false) {
  console.log('\n📥 Importing Manual Amazon Links\n');
  console.log(`File: ${filePath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const links = parseManualLinks(filePath);

  if (links.length === 0) {
    console.log('⚠️  No valid links found in file');
    return;
  }

  console.log(`📦 Found ${links.length} links to import\n`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const link of links) {
    console.log(`\n${link.slug}`);
    console.log(`   URL: ${link.amazonUrl}`);

    if (dryRun) {
      console.log('   🔍 [DRY RUN] Would update database');
      updated++;
      continue;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .update({ amazon_url: link.amazonUrl })
        .eq('slug', link.slug)
        .select('id, name');

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      } else if (!data || data.length === 0) {
        console.log(`   ⚠️  Product not found with slug: ${link.slug}`);
        notFound++;
      } else {
        console.log(`   ✅ Updated: ${data[0].name}`);
        updated++;
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total: ${links.length}`);

  if (dryRun) {
    console.log('\n   🔍 [DRY RUN] No changes were saved');
  }

  console.log('');
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const customPath = args.find(arg => !arg.startsWith('--'));

const filePath = customPath || path.join(__dirname, 'data', 'manual-amazon-links.md');

if (args.includes('--help')) {
  console.log(`
Usage: npx tsx scripts/import-manual-amazon-links.ts [file] [options]

Arguments:
  file          Path to markdown file with links (default: scripts/data/manual-amazon-links.md)

Options:
  --dry-run     Preview changes without saving
  --help        Show this help

File Format:
  slug | https://www.amazon.com/product/dp/XXXXX
  another-slug | https://www.amazon.com/another/dp/YYYYY

Examples:
  # Test import
  npx tsx scripts/import-manual-amazon-links.ts --dry-run

  # Import from default file
  npx tsx scripts/import-manual-amazon-links.ts

  # Import from custom file
  npx tsx scripts/import-manual-amazon-links.ts /path/to/links.md
`);
  process.exit(0);
}

importManualLinks(filePath, dryRun).catch(console.error);
