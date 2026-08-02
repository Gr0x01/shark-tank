/**
 * Backfill episode air dates from Wikipedia's per-season episode tables, then stamp
 * every product with the air date of the episode it pitched in.
 *
 * Why this exists: `products.air_date` was empty for the entire catalogue, so the Article
 * schema had no honest publication date and fell back to the database import date —
 * telling Google a Season 1 pitch was published in December 2025. Air dates are also the
 * only sensible `lastmod`/ordering signal for episode pages.
 *
 * Wikipedia's season articles are the source because they carry structured
 * {{Episode list}} templates with an OriginalAirDate per episode, which parse exactly
 * rather than being summarised by a model.
 *
 * Usage:
 * Re-runnable and idempotent — run it again after any catalogue backfill to pick up
 * newly added products.
 *
 * Usage:
 *   npx tsx scripts/backfill-air-dates.ts --dry-run
 *   npx tsx scripts/backfill-air-dates.ts
 *   npx tsx scripts/backfill-air-dates.ts --season 16
 *   npx tsx scripts/backfill-air-dates.ts --fill-episodes   # also resolve missing episode numbers
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'tankd.io air-date backfill (https://tankd.io)';

interface EpisodeAirDate {
  season: number;
  episode_number: number;
  air_date: string;
}

async function fetchSeasonWikitext(season: number): Promise<string | null> {
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(
    `Shark Tank season ${season}`
  )}&prop=wikitext&format=json&formatversion=2`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    console.error(`   ✖ Season ${season}: HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();
  return json?.parse?.wikitext ?? null;
}

/**
 * Pull (episode number, air date) out of the {{Episode list}} entries.
 *
 * `EpisodeNumber` is the series-wide count and `EpisodeNumber2` the within-season one;
 * seasons that never had a series-wide column use `EpisodeNumber` for the season number
 * instead, so prefer 2 and fall back.
 */
function parseSeason(season: number, wikitext: string): EpisodeAirDate[] {
  const out: EpisodeAirDate[] = [];
  // Two template forms are in use across the seasons — older articles call the Lua module
  // directly ({{#invoke:Episode list|sublist}}), newer ones use the wrapper
  // ({{Episode list/sublist}}). Season 17 is the wrapper form.
  const blocks = wikitext
    .split(/\{\{(?:#invoke:Episode list\|sublist|Episode list\/sublist)/)
    .slice(1);

  for (const block of blocks) {
    const airMatch = block.match(
      /\|\s*OriginalAirDate\s*=\s*\{\{[Ss]tart date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/
    );
    if (!airMatch) continue;

    const numMatch =
      block.match(/\|\s*EpisodeNumber2\s*=\s*(\d+)/) ??
      block.match(/\|\s*EpisodeNumber\s*=\s*(\d+)/);
    if (!numMatch) continue;

    const [, year, month, day] = airMatch;
    out.push({
      season,
      episode_number: Number(numMatch[1]),
      air_date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    });
  }

  // A season article that yields nothing is a parse failure, not an empty season —
  // surface it rather than silently contributing zero rows.
  if (out.length === 0) {
    console.error(`   ⚠ Season ${season}: no episodes parsed — page format may have changed`);
  }

  return out;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Fill `episode_number` for products that have a season but no episode, using the
 * reference catalogue as the index.
 *
 * Deliberately conservative: an exact normalised-name match that also agrees on the
 * season, and only when exactly one candidate qualifies. A wrong episode number here
 * becomes a wrong air date, which is the precise failure this whole task exists to
 * remove — so anything ambiguous is left alone and reported.
 *
 * The misses are mostly companies that rebranded after airing (Ring pitched as Doorbot,
 * Poppi as Mother Beverage); those need a human decision, not a fuzzier matcher.
 */
async function fillMissingEpisodeNumbers(dryRun: boolean): Promise<void> {
  const refPath = path.join(process.cwd(), 'scripts', 'data', 'reference-catalog.json');
  if (!fs.existsSync(refPath)) {
    console.log('   ⚠ No reference-catalog.json — skipping episode-number fill.');
    return;
  }

  const reference = JSON.parse(fs.readFileSync(refPath, 'utf-8')) as {
    season: number;
    episode: number;
    name: string;
  }[];

  const index = new Map<string, { season: number; episode: number }[]>();
  for (const entry of reference) {
    const key = normalizeName(entry.name);
    if (!index.has(key)) index.set(key, []);
    index.get(key)!.push({ season: entry.season, episode: entry.episode });
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, season, episode_number')
    .is('episode_number', null)
    .not('season', 'is', null);

  if (error) {
    console.error(`   ✖ Could not read products: ${error.message}`);
    return;
  }

  const rows = (products || []) as { id: string; name: string; season: number }[];
  const resolved: { id: string; name: string; season: number; episode: number }[] = [];
  const skipped: string[] = [];

  for (const product of rows) {
    const candidates = (index.get(normalizeName(product.name)) || []).filter(
      c => c.season === product.season
    );
    if (candidates.length === 1) {
      resolved.push({ ...product, episode: candidates[0].episode });
    } else {
      skipped.push(`${product.name} (S${product.season})`);
    }
  }

  console.log(`\n   Episode-number fill: ${resolved.length} resolved, ${skipped.length} skipped.`);
  for (const r of resolved) console.log(`      ${r.name} → S${r.season}E${r.episode}`);
  if (skipped.length) console.log(`      Skipped: ${skipped.join(', ')}`);

  if (dryRun || resolved.length === 0) return;

  for (const r of resolved) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ episode_number: r.episode })
      .eq('id', r.id);
    if (updateError) console.error(`      ✖ ${r.name}: ${updateError.message}`);
  }
  console.log(`   💾 Set episode_number on ${resolved.length} products.`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fillEpisodes = args.includes('--fill-episodes');
  const seasonArg = args.indexOf('--season');
  const seasons =
    seasonArg >= 0 && args[seasonArg + 1]
      ? [Number(args[seasonArg + 1])]
      : Array.from({ length: 17 }, (_, i) => i + 1);

  console.log('\n' + '━'.repeat(60));
  console.log('📅 Episode Air Date Backfill');
  console.log('━'.repeat(60));
  console.log(`   Seasons: ${seasons[0]}–${seasons[seasons.length - 1]}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log('━'.repeat(60) + '\n');

  const all: EpisodeAirDate[] = [];

  for (const season of seasons) {
    const wikitext = await fetchSeasonWikitext(season);
    if (!wikitext) continue;

    const episodes = parseSeason(season, wikitext);
    all.push(...episodes);
    console.log(
      `   Season ${String(season).padStart(2)}: ${String(episodes.length).padStart(2)} episodes` +
        (episodes.length ? `  ${episodes[0].air_date} → ${episodes[episodes.length - 1].air_date}` : '')
    );

    // Wikipedia asks for serial requests from unauthenticated clients.
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n   Parsed ${all.length} episodes total.`);

  if (all.length === 0) {
    console.error('   Nothing parsed — aborting without writing.');
    process.exit(1);
  }

  // Independent of the episode table, and runs first so anything it resolves picks up an
  // air date in the same pass.
  if (fillEpisodes) await fillMissingEpisodeNumbers(dryRun);

  if (dryRun) {
    console.log('\n   --- DRY RUN, nothing written ---');
    const { data: products } = await supabase
      .from('products')
      .select('season, episode_number')
      .not('season', 'is', null)
      .not('episode_number', 'is', null);

    const known = new Set(all.map(e => `${e.season}-${e.episode_number}`));
    const rows = (products || []) as { season: number; episode_number: number }[];
    const matched = rows.filter(p => known.has(`${p.season}-${p.episode_number}`));
    const unmatched = rows.filter(p => !known.has(`${p.season}-${p.episode_number}`));

    console.log(`   Products that would get an air date: ${matched.length}`);
    console.log(`   Products with no matching episode:   ${unmatched.length}`);
    if (unmatched.length) {
      const sample = [...new Set(unmatched.map(p => `S${p.season}E${p.episode_number}`))].slice(0, 15);
      console.log(`   Unmatched episodes (sample): ${sample.join(', ')}`);
    }
    return;
  }

  // Upsert episode rows. Conflict target matches the (season, episode_number) unique key.
  let written = 0;
  for (let i = 0; i < all.length; i += 100) {
    const chunk = all.slice(i, i + 100);
    const { error } = await supabase
      .from('episodes')
      .upsert(chunk, { onConflict: 'season,episode_number' });

    if (error) {
      console.error(`   ✖ Episode upsert failed: ${error.message}`);
      process.exit(1);
    }
    written += chunk.length;
  }
  console.log(`   💾 Upserted ${written} episode rows.`);

  // Stamp products from their episode, one statement per episode. Neither narrative
  // trigger watches air_date, so this cannot cascade into regenerations.
  let stamped = 0;
  let failed = 0;

  for (const ep of all) {
    const { data, error } = await supabase
      .from('products')
      .update({ air_date: ep.air_date })
      .eq('season', ep.season)
      .eq('episode_number', ep.episode_number)
      .select('id');

    if (error) {
      console.error(`   ✖ S${ep.season}E${ep.episode_number}: ${error.message}`);
      failed++;
      continue;
    }
    stamped += data?.length ?? 0;
  }

  console.log(`   💾 Stamped ${stamped} products with an air date.`);
  if (failed) console.log(`   ⚠ ${failed} episode updates failed.`);

  const { count: remaining } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .is('air_date', null)
    .not('season', 'is', null)
    .not('episode_number', 'is', null);

  if (remaining) {
    console.log(`   ⚠ ${remaining} products with a season/episode still have no air date.`);
    console.log('      Their episode number has no match in the Wikipedia tables — check for');
    console.log('      products recorded against an episode that does not exist.');
  }

  console.log('\n✅ Done.\n');
}

main().catch(console.error);
