import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts an Amazon URL to an affiliate link by adding the Associates tag
 * @param url - The original Amazon URL (or null/undefined)
 * @returns The URL with affiliate tag appended, or the original value if not an Amazon URL
 */
export function addAmazonAffiliateTag(url: string | null | undefined): string | null | undefined {
  if (!url) return url

  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG
  if (!affiliateTag) {
    // No affiliate tag configured, return original URL
    return url
  }

  try {
    const urlObj = new URL(url)

    // Only process Amazon URLs
    if (!urlObj.hostname.includes('amazon.com') && !urlObj.hostname.includes('amzn.')) {
      return url
    }

    // Add or update the tag parameter
    urlObj.searchParams.set('tag', affiliateTag)

    return urlObj.toString()
  } catch {
    // Invalid URL, return as-is
    return url
  }
}

/**
 * Format a `date` column (YYYY-MM-DD) for display.
 *
 * `new Date('2012-10-26')` parses as UTC midnight, so rendering it in any timezone west
 * of UTC shows the previous day — Scrub Daddy aired Oct 26 and the page said Oct 25.
 * Forcing UTC keeps the rendered day equal to the stored day everywhere.
 */
export function formatAirDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
): string {
  return new Date(date).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })
}

/** Year of a `date` column, without the same off-by-one shift. */
export function airDateYear(date: string): number {
  return new Date(date).getUTCFullYear()
}
