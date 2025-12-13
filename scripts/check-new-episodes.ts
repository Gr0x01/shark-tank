/**
 * Check TVMaze API for Shark Tank episodes that aired recently
 * Returns episodes that aired in the last 48 hours and aren't in our database
 */

import { createClient } from '@supabase/supabase-js';

const TVMAZE_SHOW_ID = 329; // Shark Tank
const LOOKBACK_HOURS = 48;

interface TVMazeEpisode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number;
  summary: string | null;
}

interface MissingEpisode {
  season: number;
  episode: number;
  airDate: string;
  name: string;
  tvmazeUrl: string;
}

export async function checkForNewEpisodes(options: {
  lookbackHours?: number;
  dryRun?: boolean;
}): Promise<MissingEpisode[]> {
  const lookbackHours = options.lookbackHours || LOOKBACK_HOURS;

  console.log(`\n📺 Checking for new Shark Tank episodes...`);
  console.log(`   Lookback period: ${lookbackHours} hours\n`);

  // Fetch all episodes from TVMaze
  const response = await fetch(`https://api.tvmaze.com/shows/${TVMAZE_SHOW_ID}/episodes`);

  if (!response.ok) {
    throw new Error(`TVMaze API error: ${response.status} ${response.statusText}`);
  }

  const allEpisodes: TVMazeEpisode[] = await response.json();

  // Filter to recently aired episodes
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - lookbackHours);

  const recentEpisodes = allEpisodes.filter(ep => {
    if (!ep.airstamp) return false;
    const airDate = new Date(ep.airstamp);
    return airDate >= cutoffDate && airDate <= new Date();
  });

  console.log(`   Found ${recentEpisodes.length} episode(s) aired in last ${lookbackHours} hours:`);
  for (const ep of recentEpisodes) {
    console.log(`   - S${ep.season}E${ep.number}: "${ep.name}" (${ep.airdate})`);
  }

  if (recentEpisodes.length === 0) {
    console.log(`\n✓ No new episodes found`);
    return [];
  }

  if (options.dryRun) {
    console.log(`\n🔍 Dry run - would check database for these episodes`);
    return recentEpisodes.map(ep => ({
      season: ep.season,
      episode: ep.number,
      airDate: ep.airdate,
      name: ep.name,
      tvmazeUrl: ep.url,
    }));
  }

  // Check database for missing episodes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const missingEpisodes: MissingEpisode[] = [];

  for (const ep of recentEpisodes) {
    // Check if we have any products for this season/episode
    const { data: existingProducts, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('season', ep.season)
      .eq('episode', ep.number);

    if (error) {
      console.error(`   ⚠️  Database error checking S${ep.season}E${ep.number}:`, error.message);
      continue;
    }

    if (!existingProducts || existingProducts.length === 0) {
      console.log(`   ⚠️  Missing: S${ep.season}E${ep.number} - no products in database`);
      missingEpisodes.push({
        season: ep.season,
        episode: ep.number,
        airDate: ep.airdate,
        name: ep.name,
        tvmazeUrl: ep.url,
      });
    } else {
      console.log(`   ✓ S${ep.season}E${ep.number} - ${existingProducts.length} product(s) already in database`);
    }
  }

  if (missingEpisodes.length === 0) {
    console.log(`\n✓ All recent episodes already in database`);
  } else {
    console.log(`\n📋 Summary: ${missingEpisodes.length} episode(s) need products imported`);
  }

  return missingEpisodes;
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let lookbackHours: number | undefined;
  const lookbackIndex = args.indexOf('--lookback');
  if (lookbackIndex >= 0 && args[lookbackIndex + 1]) {
    lookbackHours = parseInt(args[lookbackIndex + 1], 10);
  }

  try {
    const missing = await checkForNewEpisodes({ lookbackHours, dryRun });

    if (missing.length > 0) {
      console.log(`\nNext step: Run scraper for each missing episode:`);
      for (const ep of missing) {
        console.log(`  npx tsx scripts/scrape-episode-products.ts --season ${ep.season} --episode ${ep.episode}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Error:`, err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
