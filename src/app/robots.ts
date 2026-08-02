import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      // Let answer engines discover and cite tankd.io without granting training use.
      {
        userAgent: [
          'OAI-SearchBot',
          'ChatGPT-User',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
          'Perplexity-User',
        ],
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      // Block crawlers used for model training or bulk dataset collection.
      {
        userAgent: [
          'GPTBot',
          'ClaudeBot',
          'anthropic-ai',
          'Claude-Web',
          'CCBot',
          'Google-Extended',
          'cohere-ai',
          'Omgilibot',
          'FacebookBot',
          'Diffbot',
          'Bytespider',
          'ImagesiftBot',
        ],
        disallow: ['/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
