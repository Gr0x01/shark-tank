import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { searchTavily, combineSearchResultsCompact, TavilyResponse } from './ingestion/enrichment/shared/tavily-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for SEO page content
const SEOPageSectionSchema = z.object({
  heading: z.string(),
  content: z.string(),
});

const SEOPageContentSchema = z.object({
  slug: z.string(),
  title: z.string(),
  meta_description: z.string(),
  keywords: z.array(z.string()).optional(),
  generated_at: z.string(),
  version: z.number(),
  content: z.object({
    introduction: z.string(),
    sections: z.array(SEOPageSectionSchema).optional(),
  }),
  stats: z.record(z.any()).optional(),
});

type SEOPageContent = z.infer<typeof SEOPageContentSchema>;

// Page configurations
const SEO_PAGES = {
  'still-in-business': {
    type: 'filtered' as const,
    title: 'Shark Tank Products Still in Business in 2025',
    meta_description: 'Complete list of 279+ active Shark Tank companies still thriving today. Find out which products succeeded, where to buy them, and what made them successful.',
    keywords: [
      'shark tank products still in business',
      'shark tank success stories',
      'active shark tank companies',
      'shark tank products 2025',
      'successful shark tank businesses',
      'shark tank still open',
      'where to buy shark tank products'
    ],
    searchQueries: [
      'Shark Tank products still in business 2025',
      'most successful Shark Tank companies',
      'Shark Tank success rate statistics',
      'why Shark Tank products succeed'
    ],
    prompt: `Write an 800-1200 word SEO-optimized introduction for a page listing all active Shark Tank products.

REQUIRED CONTENT:
1. Opening paragraph: Hook about Shark Tank's impact, mention the success rate (use stats provided)
2. Success statistics: Include specific numbers about how many products are still active
3. What makes products succeed: Analyze common patterns (shark investment, product category, founder background, etc.)
4. Notable success stories: Mention 3-4 top performers like Scrub Daddy, Bombas, Ring (if relevant to stats)
5. Verification approach: Explain how we track and verify business status for accuracy

THEN create 3-4 sections with H2 headings like:
- "What Makes Shark Tank Products Succeed?"
- "The Numbers: Success Rates and Statistics"
- "Notable Success Stories"
- "How We Verify Business Status"

SEO REQUIREMENTS:
- Naturally include phrases: "shark tank products still in business", "success rate", "active companies"
- Use present tense, third person
- Be specific with numbers and dates
- Factual only - use the search results and stats provided
- Engaging, journalistic tone

Return ONLY valid JSON matching this schema:
{
  "introduction": "First 200-300 words introducing the topic...",
  "sections": [
    { "heading": "Section Title", "content": "Section content..." },
    ...
  ]
}`
  },
  'out-of-business': {
    type: 'filtered' as const,
    title: 'Shark Tank Products That Failed: What Happened?',
    meta_description: 'Explore the 238+ Shark Tank businesses that closed. Learn why they failed, what went wrong, and the lessons entrepreneurs can take away.',
    keywords: [
      'shark tank products that failed',
      'failed shark tank businesses',
      'shark tank failures',
      'why shark tank products fail',
      'shark tank closed businesses',
      'unsuccessful shark tank deals',
      'shark tank business failures'
    ],
    searchQueries: [
      'Shark Tank products that failed',
      'why Shark Tank businesses fail',
      'Shark Tank failure rate statistics',
      'lessons from failed Shark Tank companies'
    ],
    prompt: `Write an 800-1200 word SEO-optimized introduction for a page listing failed Shark Tank products.

REQUIRED CONTENT:
1. Opening: Not every Shark Tank product succeeds - set empathetic, educational tone
2. Failure statistics: Specific numbers about how many businesses closed (use stats provided)
3. Why products fail: Analyze common patterns (manufacturing issues, competition, poor execution, market timing)
4. Notable failures: Mention 2-3 well-known failures with lessons learned
5. Learning value: Frame failures as educational for entrepreneurs

THEN create 3-4 sections with H2 headings like:
- "Why Shark Tank Products Fail"
- "Common Patterns in Failed Businesses"
- "Notable Failures and What Went Wrong"
- "Lessons for Entrepreneurs"

SEO REQUIREMENTS:
- Naturally include: "shark tank products that failed", "why businesses fail", "failure rate"
- Educational, not sensational tone
- Specific examples and data from search results
- Present facts objectively
- Factual only - use search results and stats provided

Return ONLY valid JSON matching this schema:
{
  "introduction": "First 200-300 words...",
  "sections": [
    { "heading": "Section Title", "content": "Section content..." },
    ...
  ]
}`
  },
  'success-stories': {
    type: 'article' as const,
    title: 'Most Successful Shark Tank Products: The Biggest Winners',
    meta_description: 'Discover the most successful Shark Tank products of all time. From Scrub Daddy to Bombas, see which companies became massive hits and why.',
    keywords: [
      'most successful shark tank products',
      'biggest shark tank success stories',
      'shark tank winners',
      'best shark tank deals',
      'scrub daddy shark tank',
      'bombas shark tank',
      'ring shark tank'
    ],
    searchQueries: [
      'most successful Shark Tank products all time',
      'Scrub Daddy Bombas Ring Shark Tank success',
      'biggest Shark Tank winners revenue',
      'Shark Tank billion dollar companies'
    ],
    prompt: `Write a comprehensive 1500-2000 word article about the most successful Shark Tank products.

STRUCTURE:
1. Introduction (200-300 words): The phenomenon of Shark Tank success stories
2. Top 5-10 Success Stories: Dedicate a section to each major winner with:
   - Company background
   - The pitch and deal details
   - Post-show growth (revenue, sales, expansion)
   - What made them successful
3. Common Success Patterns: What do winners have in common?
4. Impact on Entrepreneurs: How these successes inspire others

Create 5-7 sections with H2 headings like:
- "The Shark Tank Success Phenomenon"
- "Scrub Daddy: From $209,000 Investment to $800M+ in Sales"
- "Bombas: Turning Socks into a Social Movement"
- "Ring: The Billion-Dollar Doorbell"
- "What the Winners Have in Common"
- "Lessons from Shark Tank's Biggest Hits"

SEO REQUIREMENTS:
- Include specific company names, revenue figures, deal amounts
- Natural internal link opportunities to product pages
- Engaging storytelling with data
- Use phrases: "most successful shark tank products", "biggest winners"
- Factual, well-researched content from search results

Return ONLY valid JSON matching this schema:
{
  "introduction": "Opening section...",
  "sections": [
    { "heading": "Section Title", "content": "Detailed section content..." },
    ...
  ]
}`
  },
  'how-to-apply': {
    type: 'article' as const,
    title: 'How to Get on Shark Tank: Complete Application Guide for 2025',
    meta_description: 'Step-by-step guide to applying for Shark Tank. Learn what the casting team looks for, how to prepare your pitch, and tips from successful entrepreneurs.',
    keywords: [
      'how to get on shark tank',
      'shark tank application',
      'apply for shark tank',
      'shark tank casting',
      'how to pitch on shark tank',
      'shark tank audition',
      'shark tank application process'
    ],
    searchQueries: [
      'how to apply for Shark Tank 2025',
      'Shark Tank casting process application',
      'what Shark Tank looks for in entrepreneurs',
      'tips for getting on Shark Tank'
    ],
    prompt: `Write a comprehensive 1500-2000 word guide on how to get on Shark Tank.

STRUCTURE:
1. Introduction (200-300 words): Overview of the opportunity and competition
2. Application Process: Step-by-step breakdown
3. What They Look For: Company stage, revenue, story, personality
4. Preparing Your Pitch: Numbers to know, pitch structure, common questions
5. After Applying: Timeline, auditions, what to expect
6. Tips from Successful Contestants: Advice from those who made it

Create 6-8 sections with H2 headings like:
- "The Shark Tank Application Process"
- "What the Casting Team Looks For"
- "Preparing Your Numbers and Valuation"
- "Crafting Your Pitch Story"
- "The Audition Process"
- "Common Mistakes to Avoid"
- "Tips from Successful Shark Tank Entrepreneurs"
- "What Happens After You're Selected"

SEO REQUIREMENTS:
- Actionable, step-by-step guidance
- Include specific requirements and tips
- Natural use of: "how to get on shark tank", "application process", "casting"
- Helpful, authoritative tone
- Based on official information and entrepreneur experiences from search results

Return ONLY valid JSON matching this schema:
{
  "introduction": "Opening section...",
  "sections": [
    { "heading": "Section Title", "content": "Detailed section content..." },
    ...
  ]
}`
  }
} as const;

type PageSlug = keyof typeof SEO_PAGES;

async function getProductStats() {
  const { data, error } = await supabase
    .from('products')
    .select('status, deal_outcome');

  if (error || !data) {
    console.error('Failed to fetch product stats:', error);
    return {
      total: 0,
      active: 0,
      outOfBusiness: 0,
      gotDeal: 0,
      noDeal: 0,
      successRate: '0.0',
      failureRate: '0.0',
      dealRate: '0.0',
    };
  }

  const total = data.length;
  if (total === 0) {
    return {
      total: 0,
      active: 0,
      outOfBusiness: 0,
      gotDeal: 0,
      noDeal: 0,
      successRate: '0.0',
      failureRate: '0.0',
      dealRate: '0.0',
    };
  }

  const active = data.filter(p => p.status === 'active').length;
  const outOfBusiness = data.filter(p => p.status === 'out_of_business').length;
  const gotDeal = data.filter(p => p.deal_outcome === 'deal').length;
  const noDeal = data.filter(p => p.deal_outcome === 'no_deal').length;

  const successRate = ((active / total) * 100).toFixed(1);
  const failureRate = ((outOfBusiness / total) * 100).toFixed(1);
  const dealRate = ((gotDeal / total) * 100).toFixed(1);

  return {
    total,
    active,
    outOfBusiness,
    gotDeal,
    noDeal,
    successRate,
    failureRate,
    dealRate,
  };
}

async function searchForPage(slug: PageSlug): Promise<TavilyResponse[]> {
  const config = SEO_PAGES[slug];

  console.log(`      Searching ${config.searchQueries.length} queries...`);

  const results = await Promise.all(
    config.searchQueries.map(query =>
      searchTavily(query, {
        entityType: 'seo_page',
        entityName: slug,
        ttlDays: 90,
      })
    )
  );

  return results;
}

async function generatePageContent(
  slug: PageSlug,
  searchResults: TavilyResponse[],
  stats: Awaited<ReturnType<typeof getProductStats>>
): Promise<{ introduction: string; sections?: Array<{ heading: string; content: string }> } | null> {
  const tracker = TokenTracker.getInstance();
  const config = SEO_PAGES[slug];

  // Combine all search results
  const combinedContent = searchResults
    .map((result, i) => {
      return `=== SEARCH ${i + 1}: ${config.searchQueries[i]} ===\n${combineSearchResultsCompact(result.results, 4000)}`;
    })
    .join('\n\n');

  const statsContext = stats ? [
    `Total Products: ${stats.total}`,
    `Active: ${stats.active} (${stats.successRate}%)`,
    `Closed: ${stats.outOfBusiness} (${stats.failureRate}%)`,
    `Got Deals: ${stats.gotDeal} (${stats.dealRate}%)`,
    `No Deals: ${stats.noDeal}`,
  ].join('\n') : '';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: config.prompt },
        {
          role: 'user',
          content: `Page: ${config.title}\n\nStatistics:\n${statsContext}\n\nSearch Results:\n${combinedContent}`
        },
      ],
      max_tokens: 3500,
      temperature: 0.5,
    });

    const text = response.choices[0]?.message?.content || '';

    tracker.trackUsage({
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    });

    // Extract JSON from response
    let jsonText = text.trim();
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    } else {
      const startIndex = text.indexOf('{');
      if (startIndex === -1) {
        console.error('      ❌ No JSON found in response');
        return null;
      }
      jsonText = text.substring(startIndex);
    }

    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    console.error(`      ❌ Generation failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

async function enrichSEOPage(slug: PageSlug, dryRun: boolean): Promise<boolean> {
  const config = SEO_PAGES[slug];

  console.log(`\n   📄 ${config.title}`);
  console.log(`      Type: ${config.type}`);

  // Get stats
  console.log('      Fetching stats...');
  const stats = await getProductStats();

  // Search
  const searchResults = await searchForPage(slug);

  // Generate
  console.log('      Generating content (gpt-4.1-mini Flex - may take up to 5 min)...');
  const content = await generatePageContent(slug, searchResults, stats);

  if (!content) {
    return false;
  }

  console.log(`      ✅ Generated introduction + ${content.sections?.length || 0} sections`);

  if (dryRun) {
    console.log('\n      --- PREVIEW ---');
    console.log(`      Introduction: ${content.introduction.substring(0, 200)}...`);
    if (content.sections) {
      content.sections.forEach(section => {
        console.log(`\n      ## ${section.heading}`);
        console.log(`      ${section.content.substring(0, 150)}...`);
      });
    }
    return true;
  }

  // Build full content object
  const fullContent: SEOPageContent = {
    slug,
    title: config.title,
    meta_description: config.meta_description,
    keywords: config.keywords,
    generated_at: new Date().toISOString(),
    version: 1,
    content: {
      introduction: content.introduction,
      sections: content.sections,
    },
    stats: stats || undefined,
  };

  // Validate
  SEOPageContentSchema.parse(fullContent);

  // Save to JSON file
  const outputDir = path.join(process.cwd(), 'content', 'seo-pages');
  const outputPath = path.join(outputDir, `${slug}.json`);

  await fs.writeFile(outputPath, JSON.stringify(fullContent, null, 2), 'utf-8');

  console.log(`      💾 Saved to ${outputPath}`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');

  let pageSlugs: PageSlug[] = [];

  if (all) {
    pageSlugs = Object.keys(SEO_PAGES) as PageSlug[];
  } else {
    const pageIndex = args.indexOf('--page');
    if (pageIndex >= 0 && args[pageIndex + 1]) {
      const slug = args[pageIndex + 1] as PageSlug;
      if (SEO_PAGES[slug]) {
        pageSlugs = [slug];
      } else {
        console.error(`Unknown page: ${slug}`);
        console.error(`Available pages: ${Object.keys(SEO_PAGES).join(', ')}`);
        process.exit(1);
      }
    }
  }

  if (pageSlugs.length === 0) {
    console.error('Usage: npx tsx scripts/enrich-seo-pages.ts [--all | --page <slug>] [--dry-run]');
    console.error(`Available pages: ${Object.keys(SEO_PAGES).join(', ')}`);
    process.exit(1);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📄 SEO Pages Content Generation');
  console.log('━'.repeat(60));
  console.log(`   Pages: ${pageSlugs.join(', ')}`);
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Model: gpt-4.1-mini (Flex processing)`);
  console.log('━'.repeat(60));

  const tracker = TokenTracker.getInstance();
  let successCount = 0;

  for (const slug of pageSlugs) {
    const success = await enrichSEOPage(slug, dryRun);
    if (success) successCount++;

    // Rate limiting between pages
    if (pageSlugs.indexOf(slug) < pageSlugs.length - 1) {
      console.log('\n      ⏸️  Waiting 2s before next page...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Summary');
  console.log('━'.repeat(60));
  console.log(`   Successful: ${successCount}/${pageSlugs.length}`);
  console.log(`   Total tokens: ${tracker.totalUsage.total.toLocaleString()}`);
  console.log(`   Estimated cost: $${tracker.estimateCost('gpt-4.1-mini').toFixed(4)}`);
  console.log('━'.repeat(60) + '\n');

  if (!dryRun && successCount > 0) {
    console.log('✅ Content saved to content/seo-pages/');
    console.log('   You can now build the Next.js pages to display this content.\n');
  }
}

main().catch(console.error);
