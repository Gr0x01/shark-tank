/**
 * Sanitizes and validates search queries
 * Removes control characters, escapes ILIKE special chars, and enforces length limits
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[%_\\]/g, '\\$&') // Escape ILIKE special characters
    .trim()
    .slice(0, 100) // Max length for security
}

/**
 * Validates if a search query meets minimum requirements
 */
export function isValidSearchQuery(query: string | null | undefined): boolean {
  if (!query) return false
  const sanitized = sanitizeSearchQuery(query)
  return sanitized.length >= 2
}
