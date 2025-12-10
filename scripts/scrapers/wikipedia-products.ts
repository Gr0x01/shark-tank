import { chromium, Browser, Page } from 'playwright';

export interface ScrapedProduct {
  name: string;
  season: number;
  episodeNumber: number;
  airDate: string | null;
  founders: string[];
  askingAmount: number | null;
  askingEquity: number | null;
  dealAmount: number | null;
  dealEquity: number | null;
  dealOutcome: 'deal' | 'no_deal' | 'deal_fell_through' | 'unknown';
  sharks: string[];
  description: string | null;
  sourceUrl: string;
}

export interface ScrapeResult {
  products: ScrapedProduct[];
  scrapedAt: Date;
  errors: string[];
}

const SHARK_NAME_MAP: Record<string, string> = {
  'mark cuban': 'Mark Cuban',
  'cuban': 'Mark Cuban',
  'barbara corcoran': 'Barbara Corcoran',
  'corcoran': 'Barbara Corcoran',
  'daymond john': 'Daymond John',
  'daymond': 'Daymond John',
  "kevin o'leary": "Kevin O'Leary",
  'kevin oleary': "Kevin O'Leary",
  'oleary': "Kevin O'Leary",
  "o'leary": "Kevin O'Leary",
  'mr. wonderful': "Kevin O'Leary",
  'lori greiner': 'Lori Greiner',
  'lori': 'Lori Greiner',
  'greiner': 'Lori Greiner',
  'robert herjavec': 'Robert Herjavec',
  'robert': 'Robert Herjavec',
  'herjavec': 'Robert Herjavec',
};

function normalizeSharkName(name: string): string {
  const lower = name.toLowerCase().trim();
  return SHARK_NAME_MAP[lower] || name.trim();
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

function parseDealOutcome(text: string): 'deal' | 'no_deal' | 'deal_fell_through' | 'unknown' {
  const lower = text.toLowerCase();
  if (lower.includes('no deal') || lower.includes('declined') || lower.includes('out')) {
    return 'no_deal';
  }
  if (lower.includes('fell through') || lower.includes('did not close')) {
    return 'deal_fell_through';
  }
  if (lower.includes('deal') || lower.includes('accepted') || lower.includes('invested')) {
    return 'deal';
  }
  return 'unknown';
}

async function scrapeSeasonPage(page: Page, season: number, url: string): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];
  
  console.log(`   Scraping season ${season}...`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.log(`   ⚠️  Failed to load season ${season} page`);
    return products;
  }
  
  const tables = await page.$$('table.wikitable');
  
  for (const table of tables) {
    const headerRow = await table.$('tr:first-child');
    if (!headerRow) continue;
    
    const headers = await headerRow.$$eval('th', ths => 
      ths.map(th => th.textContent?.toLowerCase().trim() || '')
    );
    
    const hasProductColumn = headers.some(h => 
      h.includes('product') || h.includes('company') || h.includes('business') || h.includes('entrepreneur')
    );
    
    if (!hasProductColumn) continue;
    
    const productColIndex = headers.findIndex(h => 
      h.includes('product') || h.includes('company') || h.includes('business')
    );
    const entrepreneurColIndex = headers.findIndex(h => h.includes('entrepreneur') || h.includes('pitcher'));
    const askColIndex = headers.findIndex(h => h.includes('ask') || h.includes('seeking'));
    const dealColIndex = headers.findIndex(h => h.includes('deal') || h.includes('result') || h.includes('outcome'));
    const sharkColIndex = headers.findIndex(h => h.includes('shark') || h.includes('investor'));
    const episodeColIndex = headers.findIndex(h => h.includes('episode') || h.includes('ep') || h.includes('#'));
    const airDateColIndex = headers.findIndex(h => h.includes('air') || h.includes('date'));
    
    const rows = await table.$$('tr:not(:first-child)');
    
    let currentEpisode = 1;
    let currentAirDate: string | null = null;
    
    for (const row of rows) {
      const cells = await row.$$('td');
      if (cells.length < 2) continue;
      
      const nameColIdx = productColIndex >= 0 ? productColIndex : 0;
      if (cells.length <= nameColIdx) continue;
      
      const rawName = await cells[nameColIdx].textContent();
      if (!rawName) continue;
      
      const name = rawName
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
      
      if (!name || name.length < 2) continue;
      if (/^(episode|season|product|company|total|notes)$/i.test(name)) continue;
      
      if (episodeColIndex >= 0 && cells.length > episodeColIndex) {
        const epText = await cells[episodeColIndex].textContent();
        const epMatch = epText?.match(/(\d+)/);
        if (epMatch) {
          currentEpisode = parseInt(epMatch[1], 10);
        }
      }
      
      if (airDateColIndex >= 0 && cells.length > airDateColIndex) {
        const dateText = await cells[airDateColIndex].textContent();
        if (dateText) {
          const cleaned = dateText.replace(/\[.*?\]/g, '').trim();
          if (cleaned.match(/\d/)) {
            currentAirDate = cleaned;
          }
        }
      }
      
      let founders: string[] = [];
      if (entrepreneurColIndex >= 0 && cells.length > entrepreneurColIndex) {
        const entrepreneurText = await cells[entrepreneurColIndex].textContent();
        if (entrepreneurText) {
          founders = entrepreneurText
            .replace(/\[.*?\]/g, '')
            .split(/[,&]/)
            .map(f => f.trim())
            .filter(f => f.length > 2 && !f.match(/^\d+$/));
        }
      }
      
      let askingAmount: number | null = null;
      let askingEquity: number | null = null;
      if (askColIndex >= 0 && cells.length > askColIndex) {
        const askText = await cells[askColIndex].textContent();
        if (askText) {
          askingAmount = parseAmount(askText);
          askingEquity = parseEquity(askText);
        }
      }
      
      let dealAmount: number | null = null;
      let dealEquity: number | null = null;
      let dealOutcome: 'deal' | 'no_deal' | 'deal_fell_through' | 'unknown' = 'unknown';
      if (dealColIndex >= 0 && cells.length > dealColIndex) {
        const dealText = await cells[dealColIndex].textContent();
        if (dealText) {
          dealOutcome = parseDealOutcome(dealText);
          if (dealOutcome === 'deal') {
            dealAmount = parseAmount(dealText);
            dealEquity = parseEquity(dealText);
          }
        }
      }
      
      let sharks: string[] = [];
      if (sharkColIndex >= 0 && cells.length > sharkColIndex) {
        const sharkText = await cells[sharkColIndex].textContent();
        if (sharkText) {
          sharks = sharkText
            .replace(/\[.*?\]/g, '')
            .split(/[,&]/)
            .map(s => normalizeSharkName(s))
            .filter(s => s.length > 2);
        }
      }
      
      products.push({
        name,
        season,
        episodeNumber: currentEpisode,
        airDate: currentAirDate,
        founders,
        askingAmount,
        askingEquity,
        dealAmount,
        dealEquity,
        dealOutcome,
        sharks,
        description: null,
        sourceUrl: url,
      });
    }
  }
  
  return products;
}

export async function scrapeSharkTankWikipedia(options: {
  seasons?: number[];
  dryRun?: boolean;
}): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    products: [],
    scrapedAt: new Date(),
    errors: [],
  };
  
  const seasonsToScrape = options.seasons || Array.from({ length: 16 }, (_, i) => i + 1);
  
  console.log(`\n📺 Scraping Shark Tank Wikipedia`);
  console.log(`   Seasons: ${seasonsToScrape.join(', ')}`);
  console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}\n`);
  
  let browser: Browser | null = null;
  
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'SharkTankProductsBot/1.0 (https://github.com/Gr0x01/shark-tank)',
    });
    const page = await context.newPage();
    
    for (const season of seasonsToScrape) {
      const url = `https://en.wikipedia.org/wiki/Shark_Tank_(season_${season})`;
      
      try {
        const seasonProducts = await scrapeSeasonPage(page, season, url);
        result.products.push(...seasonProducts);
        console.log(`   ✅ Season ${season}: ${seasonProducts.length} products`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Season ${season}: ${msg}`);
        console.log(`   ❌ Season ${season}: ${msg}`);
      }
    }
    
    await context.close();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Browser error: ${msg}`);
    console.error(`❌ Browser error: ${msg}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  const uniqueProducts = deduplicateProducts(result.products);
  result.products = uniqueProducts;
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total products: ${result.products.length}`);
  console.log(`   Errors: ${result.errors.length}`);
  
  if (options.dryRun) {
    console.log(`\n🔍 Sample products (first 5):`);
    for (const product of result.products.slice(0, 5)) {
      console.log(`   - ${product.name} (S${product.season}E${product.episodeNumber})`);
      console.log(`     Founders: ${product.founders.join(', ') || 'Unknown'}`);
      console.log(`     Ask: $${product.askingAmount?.toLocaleString() || '?'} for ${product.askingEquity || '?'}%`);
      console.log(`     Outcome: ${product.dealOutcome}`);
      if (product.sharks.length > 0) {
        console.log(`     Sharks: ${product.sharks.join(', ')}`);
      }
    }
  }
  
  return result;
}

function deduplicateProducts(products: ScrapedProduct[]): ScrapedProduct[] {
  const seen = new Map<string, ScrapedProduct>();
  
  for (const product of products) {
    const key = `${product.name.toLowerCase()}-s${product.season}e${product.episodeNumber}`;
    if (!seen.has(key)) {
      seen.set(key, product);
    }
  }
  
  return Array.from(seen.values());
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  let seasons: number[] | undefined;
  const seasonIndex = args.indexOf('--season');
  if (seasonIndex >= 0 && args[seasonIndex + 1]) {
    seasons = [parseInt(args[seasonIndex + 1], 10)];
  }
  
  const limitIndex = args.indexOf('--limit');
  let limit: number | undefined;
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
    seasons = seasons || Array.from({ length: limit }, (_, i) => i + 1);
  }
  
  const result = await scrapeSharkTankWikipedia({ seasons, dryRun: dryRun });
  
  if (!dryRun) {
    console.log(`\n📝 Output JSON to stdout:`);
    console.log(JSON.stringify(result.products, null, 2));
  }
}

main().catch(console.error);
