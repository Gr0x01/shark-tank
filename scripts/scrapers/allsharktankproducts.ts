import { chromium, Browser, Page } from 'playwright';

export interface ScrapedProduct {
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

export interface ScrapeResult {
  products: ScrapedProduct[];
  scrapedAt: Date;
  errors: string[];
}

const BASE_URL = 'https://allsharktankproducts.com';

function getSeasonUrl(season: number): string {
  return `${BASE_URL}/sharktankproducts/season-${season}-products/`;
}

function parseAmount(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[$,]/g, '').trim();
  const match = cleaned.match(/([\d.]+)\s*(million|m|k|thousand)?/i);
  if (!match) return null;
  
  let value = parseFloat(match[1]);
  const suffix = match[2]?.toLowerCase();
  
  if (suffix === 'million' || suffix === 'm') {
    value *= 1_000_000;
  } else if (suffix === 'thousand' || suffix === 'k') {
    value *= 1_000;
  }
  
  return value;
}

function parseEquity(text: string): number | null {
  if (!text) return null;
  const match = text.match(/([\d.]+)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

function extractSharks(text: string): string[] {
  const sharkNames = [
    'Mark Cuban', 'Barbara Corcoran', 'Daymond John', 
    "Kevin O'Leary", 'Lori Greiner', 'Robert Herjavec',
    'Rohan Oza', 'Daniel Lubetzky', 'Sara Blakely', 
    'Bethenny Frankel', 'Ashton Kutcher', 'Alex Rodriguez',
    'Kendra Scott', 'Emma Grede', 'Tony Xu', 'Nirav Tolia',
    'Guest Shark', 'Chris Sacca', 'Troy Carter', 'Richard Branson'
  ];
  
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const shark of sharkNames) {
    if (lowerText.includes(shark.toLowerCase())) {
      found.push(shark);
    }
  }
  
  return found;
}

async function scrapeSeasonListings(page: Page, seasonUrl: string): Promise<string[]> {
  const productUrls: string[] = [];
  
  try {
    await page.goto(seasonUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const links = await page.$$eval(
      'h3.entry-title a[href*="shark-tank-products"]',
      els => els.map(el => el.getAttribute('href')).filter(Boolean) as string[]
    );
    
    productUrls.push(...links);
    
    let hasNextPage = true;
    while (hasNextPage) {
      const nextPageLink = await page.$('a.page.larger');
      if (nextPageLink) {
        await nextPageLink.click();
        await page.waitForLoadState('domcontentloaded');
        
        const moreLinks = await page.$$eval(
          'h3.entry-title a[href*="shark-tank-products"]',
          els => els.map(el => el.getAttribute('href')).filter(Boolean) as string[]
        );
        productUrls.push(...moreLinks);
      } else {
        hasNextPage = false;
      }
    }
  } catch (err) {
    console.log(`   ⚠️ Error scraping ${seasonUrl}: ${err}`);
  }
  
  return [...new Set(productUrls)];
}

async function scrapeProductDetails(page: Page, url: string): Promise<ScrapedProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const title = await page.$eval('h1.entry-title, h1.tdb-title-text', el => el.textContent?.trim() || '').catch(() => '');
    if (!title) return null;
    
    const content = await page.$eval('.td-post-content, article', el => el.textContent || '').catch(() => '');
    
    let season: number | null = null;
    let episode: number | null = null;
    
    const seasonMatch = content.match(/Season\s*(\d+)/i);
    if (seasonMatch) season = parseInt(seasonMatch[1], 10);
    
    const episodeMatch = content.match(/Episode\s*(\d+)/i);
    if (episodeMatch) episode = parseInt(episodeMatch[1], 10);
    
    const category = await page.$eval(
      'a.td-post-category, .tdb-category a',
      el => el.textContent?.trim() || null
    ).catch(() => null);
    
    let entrepreneur: string | null = null;
    const entrepreneurMatch = content.match(/Entrepreneur[s]?[:\s]+([A-Z][^,\n.]+)/i);
    if (entrepreneurMatch) entrepreneur = entrepreneurMatch[1].trim();
    
    let askingAmount: number | null = null;
    let askingEquity: number | null = null;
    const askMatch = content.match(/(?:sought|asked|asking|seeking)[^$]*\$([0-9,.]+[MmKk]?)[^%]*(?:for|at)\s*(\d+(?:\.\d+)?)\s*%/i);
    if (askMatch) {
      askingAmount = parseAmount(askMatch[1]);
      askingEquity = parseFloat(askMatch[2]);
    }
    
    let dealAmount: number | null = null;
    let dealEquity: number | null = null;
    let dealOutcome: 'deal' | 'no_deal' | 'unknown' = 'unknown';
    
    const dealMatch = content.match(/\$([0-9,.]+[MmKk]?)\s*(?:for|at)\s*(\d+(?:\.\d+)?)\s*%\s*(?:equity|stake)/i);
    if (dealMatch) {
      dealAmount = parseAmount(dealMatch[1]);
      dealEquity = parseFloat(dealMatch[2]);
      dealOutcome = 'deal';
    }
    
    if (content.toLowerCase().includes('no deal') || content.toLowerCase().includes('did not get a deal')) {
      dealOutcome = 'no_deal';
    }
    
    const sharks = extractSharks(content);
    if (sharks.length > 0 && dealOutcome === 'unknown') {
      dealOutcome = 'deal';
    }
    
    const imageUrl = await page.$eval(
      '.td-post-featured-image img, .tdb-featured-image img',
      el => el.getAttribute('src') || null
    ).catch(() => null);
    
    const description = await page.$eval(
      '.td-post-content p:first-of-type, article p:first-of-type',
      el => el.textContent?.trim().slice(0, 500) || null
    ).catch(() => null);
    
    return {
      name: title.replace(/Shark Tank/gi, '').replace(/Season \d+/gi, '').trim(),
      url,
      season,
      episode,
      category,
      entrepreneur,
      askingAmount,
      askingEquity,
      dealAmount,
      dealEquity,
      dealOutcome,
      sharks,
      description,
      imageUrl,
    };
  } catch (err) {
    console.log(`   ⚠️ Error scraping ${url}: ${err}`);
    return null;
  }
}

export async function scrapeAllSharkTankProducts(options: {
  seasons?: number[];
  limit?: number;
  dryRun?: boolean;
}): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    products: [],
    scrapedAt: new Date(),
    errors: [],
  };
  
  const seasons = options.seasons || Array.from({ length: 17 }, (_, i) => i + 1);
  
  console.log('\n🦈 Scraping allsharktankproducts.com');
  console.log(`   Seasons: ${seasons.join(', ')}`);
  console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}\n`);
  
  let browser: Browser | null = null;
  
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    const page = await context.newPage();
    
    let allProductUrls: string[] = [];
    
    for (const seasonNum of seasons) {
      const seasonUrl = getSeasonUrl(seasonNum);
      console.log(`   📺 Season ${seasonNum}...`);
      
      const urls = await scrapeSeasonListings(page, seasonUrl);
      console.log(`      Found ${urls.length} products`);
      allProductUrls.push(...urls);
    }
    
    allProductUrls = [...new Set(allProductUrls)];
    console.log(`\n   Total unique product URLs: ${allProductUrls.length}`);
    
    if (options.limit) {
      allProductUrls = allProductUrls.slice(0, options.limit);
      console.log(`   Limited to: ${allProductUrls.length}`);
    }
    
    if (options.dryRun) {
      console.log('\n📝 Dry run - sample URLs:');
      for (const url of allProductUrls.slice(0, 10)) {
        console.log(`   ${url}`);
      }
      return result;
    }
    
    console.log('\n   Scraping product details...\n');
    
    let processed = 0;
    for (const url of allProductUrls) {
      const product = await scrapeProductDetails(page, url);
      if (product) {
        result.products.push(product);
      }
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`   [${processed}/${allProductUrls.length}] ${result.products.length} products scraped`);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    await context.close();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    console.error(`❌ Error: ${msg}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Products scraped: ${result.products.length}`);
  console.log(`   Errors: ${result.errors.length}`);
  
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  let seasons: number[] | undefined;
  const seasonIndex = args.indexOf('--season');
  if (seasonIndex >= 0 && args[seasonIndex + 1]) {
    seasons = [parseInt(args[seasonIndex + 1], 10)];
  }
  
  const seasonsLimitIndex = args.indexOf('--seasons');
  if (seasonsLimitIndex >= 0 && args[seasonsLimitIndex + 1]) {
    const num = parseInt(args[seasonsLimitIndex + 1], 10);
    seasons = Array.from({ length: num }, (_, i) => i + 1);
  }
  
  let limit: number | undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }
  
  const result = await scrapeAllSharkTankProducts({ seasons, limit, dryRun });
  
  if (!dryRun && result.products.length > 0) {
    console.log('\n📝 Sample products:');
    for (const product of result.products.slice(0, 5)) {
      console.log(`\n   ${product.name}`);
      console.log(`      Season ${product.season}, Episode ${product.episode}`);
      console.log(`      Category: ${product.category}`);
      console.log(`      Outcome: ${product.dealOutcome}`);
      if (product.sharks.length > 0) {
        console.log(`      Sharks: ${product.sharks.join(', ')}`);
      }
    }
  }
}

main().catch(console.error);
