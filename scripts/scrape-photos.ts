import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = 'product-photos';
const CONCURRENCY = 25;
const TIMEOUT_MS = 15000;

async function searchTavilyImages(productName: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY || process.env.TAVILY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${productName} Shark Tank product`,
        search_depth: 'basic',
        include_images: true,
        max_results: 5,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.images || [];
  } catch {
    return [];
  }
}

interface ScrapedProduct {
  name: string;
  url: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  photo_url: string | null;
}

let scrapedDataCache: Map<string, string> | null = null;

function loadScrapedData(): Map<string, string> {
  if (scrapedDataCache) return scrapedDataCache;
  
  const dataPath = path.join(__dirname, 'data', 'scraped-products.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  scrapedDataCache = new Map();
  for (const product of data.products as ScrapedProduct[]) {
    const normalizedName = product.name.toLowerCase().trim();
    scrapedDataCache.set(normalizedName, product.url);
  }
  
  return scrapedDataCache;
}

function getFallbackUrl(productName: string): string | null {
  const scraped = loadScrapedData();
  const normalized = productName.toLowerCase().trim();
  return scraped.get(normalized) || null;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function extractImageUrl(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  
  let imageUrl = $('meta[property="og:image"]').attr('content')
    || $('meta[name="twitter:image"]').attr('content')
    || $('meta[property="og:image:url"]').attr('content');
  
  if (!imageUrl) {
    const selectors = [
      '.product-image img',
      '.hero img',
      '.product img',
      'article img',
      'main img',
      '.entry-content img',
      '#content img',
    ];
    
    for (const selector of selectors) {
      const img = $(selector).first();
      const src = img.attr('src') || img.attr('data-src');
      if (src && !src.includes('logo') && !src.includes('icon')) {
        imageUrl = src;
        break;
      }
    }
  }
  
  if (!imageUrl) return null;
  
  if (imageUrl.startsWith('//')) {
    imageUrl = 'https:' + imageUrl;
  } else if (imageUrl.startsWith('/')) {
    const base = new URL(baseUrl);
    imageUrl = `${base.protocol}//${base.host}${imageUrl}`;
  } else if (!imageUrl.startsWith('http')) {
    const base = new URL(baseUrl);
    imageUrl = `${base.protocol}//${base.host}/${imageUrl}`;
  }
  
  return imageUrl;
}

async function downloadImage(imageUrl: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetchWithTimeout(imageUrl);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;
    
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) return null;
    
    return { buffer, contentType };
  } catch {
    return null;
  }
}

function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType] || 'jpg';
}

async function ensureBucketExists(): Promise<boolean> {
  const { data: buckets } = await supabase.storage.listBuckets();
  
  if (buckets?.some(b => b.name === BUCKET_NAME)) {
    return true;
  }
  
  const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });
  
  if (error) {
    console.error(`Failed to create bucket: ${error.message}`);
    return false;
  }
  
  console.log(`   Created bucket: ${BUCKET_NAME}`);
  return true;
}

async function uploadToStorage(
  slug: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const ext = getFileExtension(contentType);
  const filePath = `${slug}.${ext}`;
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });
  
  if (error) {
    console.error(`      Upload failed: ${error.message}`);
    return null;
  }
  
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

async function scrapeProductPhoto(product: Product): Promise<{ success: boolean; source?: string }> {
  const urlsToTry: { url: string; source: string }[] = [];
  
  if (product.website_url) {
    urlsToTry.push({ url: product.website_url, source: 'website' });
  }
  
  const fallbackUrl = getFallbackUrl(product.name);
  if (fallbackUrl) {
    urlsToTry.push({ url: fallbackUrl, source: 'allsharktank' });
  }
  
  for (const { url, source } of urlsToTry) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) continue;
      
      const html = await response.text();
      const imageUrl = extractImageUrl(html, url);
      if (!imageUrl) continue;
      
      const imageData = await downloadImage(imageUrl);
      if (!imageData) continue;
      
      const publicUrl = await uploadToStorage(product.slug, imageData.buffer, imageData.contentType);
      if (!publicUrl) continue;
      
      const { error } = await supabase
        .from('products')
        .update({ photo_url: publicUrl })
        .eq('id', product.id);
      
      if (error) {
        console.error(`      DB update failed: ${error.message}`);
        continue;
      }
      
      return { success: true, source };
    } catch {
      continue;
    }
  }
  
  const tavilyImages = await searchTavilyImages(product.name);
  for (const imageUrl of tavilyImages) {
    try {
      const imageData = await downloadImage(imageUrl);
      if (!imageData) continue;
      
      const publicUrl = await uploadToStorage(product.slug, imageData.buffer, imageData.contentType);
      if (!publicUrl) continue;
      
      const { error } = await supabase
        .from('products')
        .update({ photo_url: publicUrl })
        .eq('id', product.id);
      
      if (error) continue;
      
      return { success: true, source: 'tavily' };
    } catch {
      continue;
    }
  }
  
  return { success: false };
}

async function processProduct(product: Product): Promise<{
  name: string;
  success: boolean;
  source?: string;
}> {
  const result = await scrapeProductPhoto(product);
  return { name: product.name, ...result };
}

async function batchScrapePhotos(options: { limit?: number; dryRun?: boolean }) {
  console.log('\n' + '━'.repeat(60));
  console.log('📸 Product Photo Scraper');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  if (options.limit) console.log(`   Limit: ${options.limit}`);
  console.log('━'.repeat(60) + '\n');

  if (!options.dryRun) {
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      console.error('❌ Could not create storage bucket');
      return;
    }
  }

  let query = supabase
    .from('products')
    .select('id, name, slug, website_url, photo_url')
    .is('photo_url', null)
    .order('created_at', { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error(`❌ Failed to fetch products: ${error.message}`);
    return;
  }

  console.log(`   Found ${products?.length || 0} products without photos\n`);

  if (!products || products.length === 0) {
    console.log('   Nothing to do!\n');
    return;
  }

  if (options.dryRun) {
    console.log('   Dry run - would process:');
    for (const p of products.slice(0, 10)) {
      const fallback = getFallbackUrl(p.name);
      console.log(`   - ${p.name}`);
      console.log(`     website: ${p.website_url || 'none'}`);
      console.log(`     fallback: ${fallback || 'none'}`);
    }
    if (products.length > 10) {
      console.log(`   ... and ${products.length - 10} more`);
    }
    return;
  }

  let scraped = 0;
  let failed = 0;
  let processed = 0;
  const sourceCount: Record<string, number> = { website: 0, allsharktank: 0, tavily: 0 };

  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY);
    
    const results = await Promise.all(
      batch.map(product => processProduct(product))
    );

    for (const result of results) {
      processed++;
      if (result.success) {
        scraped++;
        sourceCount[result.source!]++;
        console.log(`   ✅ ${result.name} (${result.source})`);
      } else {
        failed++;
        console.log(`   ❌ ${result.name}`);
      }
    }

    console.log(`   [${processed}/${products.length}] batch complete\n`);
    
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Scraped: ${scraped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   From website: ${sourceCount.website}`);
  console.log(`   From allsharktank: ${sourceCount.allsharktank}`);
  console.log(`   From tavily: ${sourceCount.tavily}`);
  console.log('━'.repeat(60) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  let limit: number | undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }

  await batchScrapePhotos({ limit, dryRun });
}

main().catch(console.error);
