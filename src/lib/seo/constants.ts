export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'
export const SITE_NAME = 'tankd.io'

// Default OpenGraph image (1200x630)
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`
export const DEFAULT_OG_IMAGE_WIDTH = 1200
export const DEFAULT_OG_IMAGE_HEIGHT = 630

// Catalogue pagination. Shared because the sitemap has to generate the same page
// boundaries the directory renders — if these drift, the sitemap advertises URLs that
// paginate to nothing.
export const PRODUCTS_PER_PAGE = 48

// Schema.org Organization
export const SCHEMA_CONTEXT = 'https://schema.org'
export const SCHEMA_ORG_NAME = 'tankd.io'
export const SCHEMA_ORG_URL = SITE_URL
export const SCHEMA_ORG_LOGO = DEFAULT_OG_IMAGE
