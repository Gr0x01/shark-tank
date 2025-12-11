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
