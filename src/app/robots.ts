import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/_next/'],
      },
      // Block AI scrapers from training on our content
      {
        userAgent: [
          'GPTBot',           // OpenAI
          'ChatGPT-User',     // OpenAI ChatGPT
          'CCBot',            // Common Crawl (used by many AI companies)
          'anthropic-ai',     // Anthropic
          'Claude-Web',       // Anthropic Claude
          'Google-Extended',  // Google Bard/Gemini training
          'cohere-ai',        // Cohere
          'Omgilibot',        // Omgili (AI training)
          'FacebookBot',      // Meta AI training
          'Diffbot',          // Diffbot
          'Bytespider',       // ByteDance (TikTok)
          'ImagesiftBot',     // Image AI training
        ],
        disallow: ['/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
