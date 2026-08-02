/**
 * Backfill historical pitches we never ingested, using the diffed gap list in
 * scripts/data/missing-products.json (name + season + episode).
 *
 * Unlike backfill-episodes.ts, this does NOT use Tavily discovery and does not
 * skip episodes that already hold products — seasons 1-16 have partial coverage,
 * so every episode would otherwise be skipped.
 *
 * Usage:
 *   npx tsx scripts/backfill-catalog.ts --season 16 --dry-run
 *   npx tsx scripts/backfill-catalog.ts --season 16
 *   npx tsx scripts/backfill-catalog.ts --season 16 --limit 5
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createAndEnrichProduct, normalizeSharkName } from '../src/lib/services/enrichment';

interface MissingProduct {
  season: number;
  episode: number;
  name: string;
  url: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);

/**
 * Slug dedupe alone is not enough: we store descriptive names ("Morrison Outdoors
 * Sleeping Bags") where the reference uses the short brand ("Morrison Outdoors"),
 * so an exact-slug check would happily create a second record for the same pitch.
 */
function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(inc|llc|the)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

function isDuplicate(candidate: string, existing: string[]): string | null {
  const c = normalize(candidate);
  if (c.length < 3) return null;
  for (const e of existing) {
    const n = normalize(e);
    if (!n) continue;
    if (c === n) return e;
    if (c.length >= 6 && n.includes(c)) return e;
    if (n.length >= 6 && c.includes(n)) return e;
  }
  return null;
}

async function getOrCreateEpisode(season: number, episode: number): Promise<string> {
  const { data: existing } = await supabase
    .from('episodes')
    .select('id')
    .eq('season', season)
    .eq('episode_number', episode)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('episodes')
    .insert({ season, episode_number: episode, title: `Season ${season}, Episode ${episode}` })
    .select('id')
    .single();

  if (error || !created) throw new Error(`Failed to create S${season}E${episode}: ${error?.message}`);
  return created.id;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const seasonArg = args.indexOf('--season');
  const limitArg = args.indexOf('--limit');

  if (seasonArg === -1) {
    console.error('Usage: npx tsx scripts/backfill-catalog.ts --season <n> [--limit <n>] [--dry-run]');
    process.exit(1);
  }

  const concurrencyArg = args.indexOf('--concurrency');
  const season = parseInt(args[seasonArg + 1], 10);
  const limit = limitArg === -1 ? Infinity : parseInt(args[limitArg + 1], 10);
  const concurrency = concurrencyArg === -1 ? 5 : parseInt(args[concurrencyArg + 1], 10);

  const gapPath = path.join(__dirname, 'data', 'missing-products.json');
  const all: MissingProduct[] = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
  let targets = all.filter(p => p.season === season).sort((a, b) => a.episode - b.episode);

  // Re-check against live data — the gap file is a snapshot and a previous partial
  // run may already have created some of these.
  const { data: existingRows } = await supabase
    .from('products')
    .select('name, company_name, slug')
    .eq('season', season);

  const existingNames = (existingRows || []).flatMap(r =>
    [r.name, r.company_name, r.slug?.replace(/-/g, ' ')].filter(Boolean) as string[]
  );

  const skipped: string[] = [];
  targets = targets.filter(p => {
    const dupe = isDuplicate(p.name, existingNames);
    if (dupe) {
      skipped.push(`${p.name} → already have "${dupe}"`);
      return false;
    }
    return true;
  });

  if (limit !== Infinity) targets = targets.slice(0, limit);

  console.log('\n' + '━'.repeat(60));
  console.log(`🦈 Backfilling Season ${season}`);
  console.log('━'.repeat(60));
  console.log(`   In gap list: ${all.filter(p => p.season === season).length}`);
  console.log(`   Already present (fuzzy match): ${skipped.length}`);
  console.log(`   To create: ${targets.length}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}\n`);

  if (skipped.length) {
    console.log('Skipping as duplicates:');
    for (const s of skipped) console.log(`   ⏭️  ${s}`);
    console.log('');
  }

  if (dryRun) {
    for (const p of targets) console.log(`   ✓ Would create: ${p.name} (S${p.season}E${p.episode})`);
    console.log(`\n   ${targets.length} product(s) would be created and enriched.\n`);
    return;
  }

  const { data: sharks } = await supabase.from('sharks').select('id, slug, name');
  const sharkIds = new Map<string, string>();
  for (const shark of sharks || []) {
    sharkIds.set(shark.slug, shark.id);
    sharkIds.set(normalizeSharkName(shark.name), shark.id);
  }

  // Create every episode row up front, serially — doing it inside the worker pool
  // would let two workers insert the same S/E row at once.
  const episodeIds = new Map<number, string>();
  for (const ep of [...new Set(targets.map(p => p.episode))].sort((a, b) => a - b)) {
    episodeIds.set(ep, await getOrCreateEpisode(season, ep));
  }
  console.log(`📺 ${episodeIds.size} episode record(s) ready\n`);

  let created = 0;
  let enriched = 0;
  let failed = 0;
  let done = 0;
  let next = 0;

  // Each product is ~35s of waiting on Tavily + OpenAI, so run a pool of them.
  async function worker() {
    while (next < targets.length) {
      const i = next++;
      const p = targets[i];
      try {
        const result = await createAndEnrichProduct(
          p.name,
          p.season,
          p.episode,
          episodeIds.get(p.episode)!,
          sharkIds,
          supabase
        );
        if (result.created) created++;
        if (result.enriched) enriched++;
      } catch (err) {
        failed++;
        console.error(`   ❌ ${p.name}: ${err instanceof Error ? err.message : err}`);
      }
      done++;
      console.log(`[${done}/${targets.length}] S${p.season}E${p.episode} — ${p.name}`);
    }
  }

  const startedAt = Date.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
  const mins = ((Date.now() - startedAt) / 60000).toFixed(1);

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Backfill Complete');
  console.log(`   Created: ${created}`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Took: ${mins} min (${concurrency}x)`);
  console.log('━'.repeat(60));
  console.log('\nNext, to fill search titles + descriptions:');
  console.log('   npx tsx scripts/enrich-product-meta.ts\n');
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
