import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const BUCKET_NAME = 'product-photos'
const TIMEOUT_MS = 15000

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  return createClient(url, key)
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
      },
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

function extractImageUrl(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html)

  let imageUrl = $('meta[property="og:image"]').attr('content')
    || $('meta[name="twitter:image"]').attr('content')
    || $('meta[property="og:image:url"]').attr('content')

  if (!imageUrl) {
    const selectors = [
      '.product-image img',
      '.hero img',
      '.product img',
      'article img',
      'main img',
      '.entry-content img',
      '#content img',
    ]

    for (const selector of selectors) {
      const img = $(selector).first()
      const src = img.attr('src') || img.attr('data-src')
      if (src && !src.includes('logo') && !src.includes('icon')) {
        imageUrl = src
        break
      }
    }
  }

  if (!imageUrl) return null

  if (imageUrl.startsWith('//')) {
    imageUrl = 'https:' + imageUrl
  } else if (imageUrl.startsWith('/')) {
    const base = new URL(baseUrl)
    imageUrl = `${base.protocol}//${base.host}${imageUrl}`
  } else if (!imageUrl.startsWith('http')) {
    const base = new URL(baseUrl)
    imageUrl = `${base.protocol}//${base.host}/${imageUrl}`
  }

  return imageUrl
}

async function downloadImage(imageUrl: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetchWithTimeout(imageUrl)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length < 1000) return null

    return { buffer, contentType }
  } catch {
    return null
  }
}

function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[contentType] || 'jpg'
}

async function uploadToStorage(
  slug: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const supabase = getAdminSupabase()
  const ext = getFileExtension(contentType)
  const filePath = `${slug}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.error(`[PhotoScraper] Upload failed for ${slug}: ${error.message}`)
    return null
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
  return data.publicUrl
}

async function searchTavilyImages(productName: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []

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
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.images || []
  } catch {
    return []
  }
}

/**
 * Scrape and upload a product photo. Tries:
 * 1. Product website (og:image, hero image)
 * 2. Tavily image search
 *
 * Returns the public URL if successful, null otherwise.
 */
export async function scrapeProductPhoto(options: {
  productId: string
  productName: string
  slug: string
  websiteUrl?: string | null
}): Promise<{ success: boolean; photoUrl?: string; source?: string }> {
  const { productId, productName, slug, websiteUrl } = options
  const supabase = getAdminSupabase()

  // Strategy 1: Try product website for og:image / hero image
  if (websiteUrl) {
    try {
      const response = await fetchWithTimeout(websiteUrl)
      if (response.ok) {
        const html = await response.text()
        const imageUrl = extractImageUrl(html, websiteUrl)
        if (imageUrl) {
          const imageData = await downloadImage(imageUrl)
          if (imageData) {
            const publicUrl = await uploadToStorage(slug, imageData.buffer, imageData.contentType)
            if (publicUrl) {
              await supabase.from('products').update({ photo_url: publicUrl }).eq('id', productId)
              return { success: true, photoUrl: publicUrl, source: 'website' }
            }
          }
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  // Strategy 2: Tavily image search
  const tavilyImages = await searchTavilyImages(productName)
  for (const imageUrl of tavilyImages) {
    try {
      const imageData = await downloadImage(imageUrl)
      if (!imageData) continue

      const publicUrl = await uploadToStorage(slug, imageData.buffer, imageData.contentType)
      if (!publicUrl) continue

      await supabase.from('products').update({ photo_url: publicUrl }).eq('id', productId)
      return { success: true, photoUrl: publicUrl, source: 'tavily' }
    } catch {
      continue
    }
  }

  return { success: false }
}
