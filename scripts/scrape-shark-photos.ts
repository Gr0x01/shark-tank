import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = 'shark-photos';
const TIMEOUT_MS = 15000;

interface Shark {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
}

async function searchTavilyImages(sharkName: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${sharkName} Shark Tank investor headshot photo`,
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

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
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

async function scrapeSharkPhoto(shark: Shark): Promise<boolean> {
  const images = await searchTavilyImages(shark.name);

  for (const imageUrl of images) {
    try {
      const imageData = await downloadImage(imageUrl);
      if (!imageData) continue;

      const publicUrl = await uploadToStorage(shark.slug, imageData.buffer, imageData.contentType);
      if (!publicUrl) continue;

      const { error } = await supabase
        .from('sharks')
        .update({ photo_url: publicUrl })
        .eq('id', shark.id);

      if (error) continue;

      return true;
    } catch {
      continue;
    }
  }

  return false;
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📸 Shark Photo Scraper');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const bucketReady = await ensureBucketExists();
  if (!bucketReady) {
    console.error('❌ Could not create storage bucket');
    return;
  }

  const { data: sharks, error } = await supabase
    .from('sharks')
    .select('id, name, slug, photo_url')
    .is('photo_url', null)
    .order('is_guest_shark')
    .order('name');

  if (error) {
    console.error(`❌ Failed to fetch sharks: ${error.message}`);
    return;
  }

  console.log(`   Found ${sharks?.length || 0} sharks without photos\n`);

  if (!sharks || sharks.length === 0) {
    console.log('   Nothing to do!\n');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const shark of sharks) {
    const result = await scrapeSharkPhoto(shark);
    if (result) {
      success++;
      console.log(`   ✅ ${shark.name}`);
    } else {
      failed++;
      console.log(`   ❌ ${shark.name}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
