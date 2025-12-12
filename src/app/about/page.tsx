import { Metadata } from 'next'
import { ArticlePage } from '@/components/seo/ArticlePage'
import { createBreadcrumbSchema, createArticleSchema, escapeJsonLd } from '@/lib/seo/schemas'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'

const PAGE_TITLE = 'About tankd.io'
const PAGE_DESCRIPTION = 'Learn about tankd.io - a spoiler-free directory of Shark Tank products built by a fan who hates getting spoiled while shopping.'

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | ${SITE_NAME}`,
  description: PAGE_DESCRIPTION,
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: SITE_NAME,
    images: [{
      url: DEFAULT_OG_IMAGE,
      width: 1200,
      height: 630,
      alt: PAGE_TITLE
    }],
    type: 'article'
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE]
  },
  alternates: {
    canonical: `${SITE_URL}/about`
  }
}

const introduction = `I hate spoilers. Specifically, I hate trying to buy a Shark Tank product mid-episode and immediately getting spoiled about whether they got a deal. The internet makes this basically impossible to avoid.

<p>So I built tankd.io.</p>`

const sections = [
  {
    heading: 'What It Does',
    content: `<p>Simple: you can browse nearly 600 Shark Tank products and see if the business is still active without spoilers about the episode outcome. No deal results, no pitch drama, just product info and current business status.</p>`
  },
  {
    heading: 'Why It Exists',
    content: `<p>I'm a Shark Tank fan who kept running into this problem. I'd see something cool on the show, google it, and boom—spoiled. After the tenth time this happened, I decided to just build what I wished existed.</p>`
  },
  {
    heading: "Who's Behind It",
    content: `<p>Just me. Solo developer, longtime fan of the show. This isn't some corporate database—it's a side project built by someone who actually watches the show and wants to shop without spoilers.</p>

<p>The site's not perfect (it's an MVP), but it works and I keep it updated. If you've ever been frustrated by the same thing, hopefully this helps.</p>`
  }
]

export default function AboutPage() {
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'About' }
  ])

  const articleSchema = createArticleSchema({
    headline: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/about`,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(articleSchema) }}
      />

      <ArticlePage
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        introduction={introduction}
        sections={sections}
      />
    </>
  )
}
