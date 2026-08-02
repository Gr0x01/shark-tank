/**
 * Manual runner for the same deal enrichment the daily cron performs.
 *
 * This used to be a 347-line reimplementation with its own copy of the deal schema,
 * prompt, and shark-linking logic. That copy drifted: it missed both Aug 2026 shark
 * fixes (offer≠deal, and name normalisation) while the cron path had them. It is now
 * a thin wrapper over the same `enrichPendingDeals()` the cron calls, so there is one
 * implementation to fix.
 *
 * Usage:
 *   npx tsx scripts/daily-enrich-pending.ts --limit 20
 *   npx tsx scripts/daily-enrich-pending.ts --dry-run
 *   npx tsx scripts/daily-enrich-pending.ts --force --limit 5
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { enrichPendingDeals } from '../src/lib/services/enrichment';

function numArg(args: string[], flag: string, fallback: number): number {
  const i = args.indexOf(flag);
  if (i < 0 || !args[i + 1]) return fallback;
  const n = parseInt(args[i + 1], 10);
  return Number.isNaN(n) ? fallback : n;
}

function printUsage() {
  console.log(`
Search for deal info on products whose deal outcome is still unknown.

Usage: npx tsx scripts/daily-enrich-pending.ts [options]

Options:
  --limit N          Products to process (default 10; the cron uses 20)
  --min-age N        Only retry products not enriched in the last N hours (default 24)
  --max-attempts N   Skip products already tried this many times (default 7)
  --force            Ignore --min-age
  --dry-run          List what would be processed, write nothing
  --help             Show this message
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printUsage();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limit = numArg(args, '--limit', 10);
  const minAgeHours = numArg(args, '--min-age', 24);
  const maxAttempts = numArg(args, '--max-attempts', 7);

  console.log('\n' + '━'.repeat(60));
  console.log('🦈 Daily Deal Info Search');
  console.log('━'.repeat(60));
  console.log(`   Limit: ${limit}`);
  console.log(`   Min age: ${minAgeHours} hours`);
  console.log(`   Max attempts: ${maxAttempts}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Force: ${force ? 'Yes' : 'No'}`);
  console.log('━'.repeat(60) + '\n');

  if (dryRun) {
    // Mirrors the selection in enrichPendingDeals() so the preview is honest.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
    );

    let query = supabase
      .from('products')
      .select('name, last_enriched_at, deal_search_attempts')
      .eq('deal_outcome', 'unknown')
      .order('last_enriched_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (!force) {
      const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString();
      query = query.or(`last_enriched_at.is.null,last_enriched_at.lt.${cutoff}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const eligible = (data || []).filter(p => (p.deal_search_attempts || 0) < maxAttempts);
    for (const p of eligible) {
      console.log(`   [DRY RUN] Would search: ${p.name} (${p.deal_search_attempts || 0} prior attempts)`);
    }
    console.log(`\n   ${eligible.length} product(s) would be processed.\n`);
    return;
  }

  const result = await enrichPendingDeals({ limit, minAgeHours, maxAttempts, force });

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Processed: ${result.processed}`);
  console.log(`   Updated: ${result.updated}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`   Failed: ${result.failed}`);
  console.log('━'.repeat(60) + '\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
