/**
 * Scrape product names from allsharktankproducts.com for a specific episode
 * Used by auto-episode-workflow to find new products after episodes air
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'https://allsharktankproducts.com';

interface EpisodeProduct {
  name: string;
  url: string;
  season: number;
  episode: number;
}

function getSeasonUrl(season: number): string {
  return `${BASE_URL}/sharktankproducts/season-${season}-products/`;
}

async function scrapeEpisodeProducts(options: {
  season: number;
  episode: number;
  timeout?: number;
}): Promise<EpisodeProduct[]> {
  const { season, episode, timeout = 60000 } = options;
  const products: EpisodeProduct[] = [];

  console.log(`\n🦈 Scraping allsharktankproducts.com for S${season}E${episode}...`);

  let browser: Browser | null = null;
  let cleanedUp = false;

  const cleanup = async () => {
    if (!cleanedUp && browser) {
      cleanedUp = true;
      await browser.close().catch(() => {});
    }
  };

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    const seasonUrl = getSeasonUrl(season);
    console.log(`   Loading: ${seasonUrl}`);

    await page.goto(seasonUrl, { waitUntil: 'domcontentloaded', timeout });

    // Find all product links on the season page
    const productLinks = await page.$$eval(
      'h3.entry-title a[href*="shark-tank-products"], h2.entry-title a[href*="shark-tank-products"]',
      els => els.map(el => ({
        text: el.textContent?.trim() || '',
        url: el.getAttribute('href') || '',
      }))
    );

    console.log(`   Found ${productLinks.length} product links on season page`);

    // Filter links that might contain our episode number
    // Competitor site uses various formats: "Episode X", "EP X", etc.
    const episodePattern = new RegExp(`episode[\\s-]?${episode}\\b|ep[\\s-]?${episode}\\b|e${episode}\\b`, 'i');

    const matchingLinks = productLinks.filter(link =>
      episodePattern.test(link.text) || episodePattern.test(link.url)
    );

    console.log(`   ${matchingLinks.length} link(s) match episode ${episode} pattern`);

    if (matchingLinks.length === 0) {
      // Try visiting each product page to check episode number (slower fallback)
      console.log(`   Fallback: Checking each product page for episode number...`);

      let checked = 0;
      for (const link of productLinks.slice(0, 30)) { // Limit to first 30 to avoid timeout
        try {
          await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 10000 });

          const content = await page.$eval('.td-post-content, article', el => el.textContent || '').catch(() => '');

          // Look for "Episode X" in content
          const episodeMatch = content.match(/Episode\s*(\d+)/i);
          if (episodeMatch && parseInt(episodeMatch[1], 10) === episode) {
            const title = await page.$eval('h1.entry-title, h1.tdb-title-text', el => el.textContent?.trim() || '').catch(() => '');
            if (title) {
              products.push({
                name: title.replace(/Shark Tank/gi, '').replace(/Season \d+/gi, '').trim(),
                url: link.url,
                season,
                episode,
              });
            }
          }

          checked++;
          if (checked % 5 === 0) {
            console.log(`   Checked ${checked}/${productLinks.length} products...`);
          }
        } catch (err) {
          // Skip products that fail to load
          continue;
        }
      }
    } else {
      // Extract product names from matching links
      for (const link of matchingLinks) {
        try {
          await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 10000 });

          const title = await page.$eval('h1.entry-title, h1.tdb-title-text', el => el.textContent?.trim() || '').catch(() => '');

          if (title) {
            const cleanName = title
              .replace(/Shark Tank/gi, '')
              .replace(/Season \d+/gi, '')
              .replace(/Episode \d+/gi, '')
              .trim();

            products.push({
              name: cleanName,
              url: link.url,
              season,
              episode,
            });
          }
        } catch (err) {
          console.log(`   ⚠️  Failed to scrape: ${link.url}`);
          continue;
        }
      }
    }

    await context.close();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Error: ${msg}`);
    await cleanup();
    throw err;
  } finally {
    await cleanup();
  }

  console.log(`\n📊 Found ${products.length} product(s) for S${season}E${episode}:`);
  for (const product of products) {
    console.log(`   - ${product.name}`);
  }

  return products;
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  let season: number | undefined;
  const seasonIndex = args.indexOf('--season');
  if (seasonIndex >= 0 && args[seasonIndex + 1]) {
    season = parseInt(args[seasonIndex + 1], 10);
  }

  let episode: number | undefined;
  const episodeIndex = args.indexOf('--episode');
  if (episodeIndex >= 0 && args[episodeIndex + 1]) {
    episode = parseInt(args[episodeIndex + 1], 10);
  }

  if (!season || !episode) {
    console.error('\n❌ Usage: npx tsx scripts/scrape-episode-products.ts --season <num> --episode <num>');
    process.exit(1);
  }

  try {
    const products = await scrapeEpisodeProducts({ season, episode });

    if (products.length > 0) {
      console.log(`\nNext step: Import these products to database:`);
      console.log(`  npx tsx scripts/auto-episode-workflow.ts --season ${season} --episode ${episode}`);
    } else {
      console.log(`\n⚠️  No products found. Episode may not be on competitor site yet.`);
      console.log(`   Try again later or check manually: ${getSeasonUrl(season)}`);
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

export { scrapeEpisodeProducts, EpisodeProduct };
