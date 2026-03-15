const INDEXNOW_KEY = '7b7efa2918524d59b14d971a617e79aa'
const SITE_URL = 'https://tankd.io'
const INDEXNOW_API = 'https://api.indexnow.org/indexnow'

/**
 * Submit a list of URLs to IndexNow for faster re-indexing by Bing, Yandex, etc.
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<{ success: boolean; count: number }> {
  if (urls.length === 0) return { success: true, count: 0 }

  const payload = {
    host: 'tankd.io',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  }

  try {
    const response = await fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (response.ok || response.status === 202) {
      console.log(`[IndexNow] Submitted ${urls.length} URL(s) successfully (status: ${response.status})`)
      return { success: true, count: urls.length }
    }

    const text = await response.text()
    console.error(`[IndexNow] Failed to submit: ${response.status} ${text}`)
    return { success: false, count: 0 }
  } catch (error) {
    console.error('[IndexNow] Network error:', error)
    return { success: false, count: 0 }
  }
}

/**
 * Build URLs for newly created episode products and submit to IndexNow.
 * Includes product pages + the episode and season listing pages.
 */
export async function submitNewEpisodeToIndexNow(
  productSlugs: string[],
  season: number,
  episode: number
): Promise<{ success: boolean; count: number }> {
  const urls = [
    // New product pages
    ...productSlugs.map(slug => `${SITE_URL}/products/${slug}`),
    // Episode page (new content)
    `${SITE_URL}/seasons/${season}/episodes/${episode}`,
    // Season page (updated with new episode)
    `${SITE_URL}/seasons/${season}`,
    // Listings that may show new products
    `${SITE_URL}/products`,
    `${SITE_URL}`,
  ]

  console.log(`[IndexNow] Submitting ${urls.length} URLs for S${season}E${episode}:`, urls)
  return submitUrlsToIndexNow(urls)
}
