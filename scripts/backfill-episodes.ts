/**
 * Backfill missing episodes by calling the production importMissingEpisode pipeline.
 *
 * Usage:
 *   npx tsx scripts/backfill-episodes.ts 17:3 17:14 17:15 17:16 17:17
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { importMissingEpisode } from '../src/lib/services/enrichment';
import { submitNewEpisodeToIndexNow } from '../src/lib/services/indexnow';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/backfill-episodes.ts <season:episode> [<season:episode>...]');
    process.exit(1);
  }

  const episodes = args.map(a => {
    const [s, e] = a.split(':').map(n => parseInt(n, 10));
    if (!s || !e) throw new Error(`Invalid season:episode format: ${a}`);
    return { season: s, episode: e };
  });

  console.log(`\n🔄 Backfilling ${episodes.length} episode(s):`);
  for (const { season, episode } of episodes) {
    console.log(`   - S${season}E${episode}`);
  }

  let totalCreated = 0;
  let totalEnriched = 0;

  for (const { season, episode } of episodes) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📺 S${season}E${episode}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      const result = await importMissingEpisode(season, episode);
      totalCreated += result.productsCreated;
      totalEnriched += result.productsEnriched;

      if (result.productsCreated > 0) {
        const slugs = result.productNames.map(slugify);
        await submitNewEpisodeToIndexNow(slugs, result.season, result.episode);
        console.log(`   ✓ Submitted ${slugs.length} URL(s) to IndexNow`);
      }
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Backfill Complete`);
  console.log(`   Episodes: ${episodes.length}`);
  console.log(`   Products created: ${totalCreated}`);
  console.log(`   Products enriched: ${totalEnriched}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
