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
  },
  'best-deals': {
    type: 'article' as const,
    title: 'Best Shark Tank Deals: Biggest Investments & Success Stories',
    meta_description: 'Discover the biggest Shark Tank investments and best deals ever made. From million-dollar valuations to equity stakes that created unicorns, see which deals paid off.',
    keywords: [
      'best shark tank deals',
      'biggest shark tank investments',
      'largest shark tank deals',
      'shark tank million dollar deals',
      'most valuable shark tank deals',
      'highest shark tank valuations',
      'top shark tank investments'
    ],
    searchQueries: [
      'biggest Shark Tank deals by investment amount',
      'largest Shark Tank investments all time',
      'most expensive Shark Tank deals',
      'Shark Tank highest valuations',
      'best Shark Tank deals revenue'
    ],
    prompt: `Write a comprehensive 1500-2000 word article about the best and biggest Shark Tank deals ever made.

STRUCTURE:
1. Introduction (200-300 words): Overview of Shark Tank's biggest investment moments
2. Top 10 Biggest Deals: For each deal include:
   - Company name and product
   - Investment amount and equity offered
   - Which shark(s) invested
   - Deal valuation
   - Post-show performance and current status
3. What Makes a "Best Deal": Criteria beyond just deal size (ROI, success, impact)
4. Notable Multi-Million Dollar Investments
5. Deals That Went On To Massive Success

Create 5-7 sections with H2 headings like:
- "The Biggest Shark Tank Investments of All Time"
- "Million-Dollar Deals That Created Unicorns"
- "Which Sharks Make the Biggest Investments?"
- "Ring: The Billion-Dollar Deal That Almost Didn't Happen"
- "What Separates Good Deals from Great Deals"
- "The ROI Champions: Small Investments, Huge Returns"

SEO REQUIREMENTS:
- Include specific investment amounts, valuations, and equity percentages
- Naturally use phrases: "best shark tank deals", "biggest investments", "largest deals"
- Highlight both deal size AND outcome/success
- Focus on data: numbers, percentages, revenue figures
- Factual content based on search results and actual deal details
- Create internal link opportunities to product pages

Return ONLY valid JSON matching this schema:
{
  "introduction": "Opening section about Shark Tank's biggest deals...",
  "sections": [
    { "heading": "Section Title", "content": "Detailed section with specific deals..." },
    ...
  ]
}`
  },
  'deals-under-100k': {
    type: 'filtered' as const,
    title: 'Small Shark Tank Deals Under $100K',
    meta_description: 'Browse Shark Tank investments under $100,000. Discover which small deals turned into big successes and which sharks back entrepreneurs at this level.',
    keywords: [
      'shark tank deals under 100k',
      'small shark tank investments',
      'shark tank under $100,000',
      'affordable shark tank deals'
    ],
    searchQueries: [
      'Shark Tank deals under $100,000',
      'small investments Shark Tank',
      'Shark Tank lowest investment deals'
    ],
    prompt: `Write an 800-1000 word introduction for a page listing Shark Tank deals under $100,000.

REQUIRED CONTENT:
1. Opening: Why small deals matter and success stories at this level
2. Statistics: How many deals fall in this range, success rates
3. Which sharks invest small: Analysis of shark investment patterns
4. Notable small deals that succeeded: 2-3 examples with outcomes
5. Value proposition: Why smaller investments can be smart

THEN create 3-4 sections with H2 headings like:
- "The Power of Small Investments"
- "Success Stories Under $100K"
- "Which Sharks Make Small Deals?"
- "Smart Bets: Equity vs. Investment Size"

SEO REQUIREMENTS:
- Include phrases: "deals under $100K", "small investments", "affordable"
- Focus on success stories and ROI potential
- Factual data from search results and stats

Return ONLY valid JSON.`
  },
  'deals-100k-to-500k': {
    type: 'filtered' as const,
    title: 'Shark Tank Deals $100K-$500K: The Sweet Spot',
    meta_description: 'Explore Shark Tank deals between $100K-$500K. This mid-range investment tier has produced some of the show\'s biggest success stories.',
    keywords: [
      'shark tank deals 100k to 500k',
      'mid-range shark tank investments',
      'shark tank $100,000 to $500,000',
      'shark tank medium deals'
    ],
    searchQueries: [
      'Shark Tank deals $100K to $500K',
      'mid-size Shark Tank investments',
      'Shark Tank average deal size'
    ],
    prompt: `Write an 800-1000 word introduction for Shark Tank deals in the $100K-$500K range.

REQUIRED CONTENT:
1. Opening: Why this is the "sweet spot" for Shark Tank deals
2. Statistics: Deal volume, success rates, shark participation
3. Notable successes: 3-4 major success stories in this range
4. Shark preferences: Which sharks favor this deal size and why
5. ROI analysis: Success patterns at this investment level

THEN create 3-4 sections with H2 headings like:
- "The Sweet Spot: Why $100K-$500K Works"
- "Major Success Stories in This Range"
- "Shark Investment Patterns"
- "What Makes These Deals Succeed"

SEO REQUIREMENTS:
- Include specific deal amounts and valuations
- Success stories with revenue data
- Natural use of "$100K-$500K", "mid-range"

Return ONLY valid JSON.`
  },
  'deals-over-500k': {
    type: 'filtered' as const,
    title: 'Shark Tank Mega Deals Over $500K: The Biggest Bets',
    meta_description: 'Discover the biggest Shark Tank investments over $500,000. See which mega deals paid off and which sharks make the largest bets.',
    keywords: [
      'shark tank deals over 500k',
      'biggest shark tank investments',
      'shark tank mega deals',
      'shark tank over $500,000',
      'largest shark tank deals'
    ],
    searchQueries: [
      'Shark Tank deals over $500,000',
      'biggest Shark Tank investments',
      'largest Shark Tank deals ever'
    ],
    prompt: `Write an 800-1000 word introduction for Shark Tank mega deals over $500,000.

REQUIRED CONTENT:
1. Opening: The rarity and significance of mega deals
2. Statistics: How many deals exceed $500K, success rates
3. The big players: Which sharks make these bets (Cuban, Herjavec analysis)
4. Biggest deals breakdown: Top 5-10 deals with outcomes
5. Risk and reward: What justifies these massive investments

THEN create 3-4 sections with H2 headings like:
- "The Million-Dollar Club: Biggest Deals Ever"
- "Which Sharks Make Mega Investments?"
- "Do Big Deals = Big Success?"
- "Notable Mega Deals and Their Outcomes"

SEO REQUIREMENTS:
- Specific investment amounts, valuations, revenue figures
- Focus on the biggest deals and their outcomes
- Natural use of "mega deals", "over $500K", "largest"

Return ONLY valid JSON.`
  },

  'about': {
    type: 'article' as const,
    title: 'About tankd.io: Your Spoiler-Free Shark Tank Product Database',
    meta_description: 'Learn about tankd.io - the comprehensive, spoiler-free database of every Shark Tank product. Built by a solo developer who hates spoilers as much as you do.',
    keywords: [
      'about tankd.io',
      'shark tank product database',
      'spoiler free shark tank',
      'shark tank episode lookup'
    ],
    searchQueries: [
      'why people search for shark tank products',
      'shark tank spoiler problem online',
      'shark tank product tracking websites'
    ],
    prompt: `Write a friendly, casual, personal 800-1000 word About page for tankd.io.

TONE: Light, casual, friendly - like talking to a friend who shares your frustration.

KEY MESSAGE: This site exists because the founder HATES being mid-episode, wanting to buy something, and trying to dodge spoilers online when not watching live.

REQUIRED CONTENT:
1. Opening: The spoiler problem - "I hate being mid episode, looking for something to buy and trying to duck spoilers online if I don't watch it live"
2. The Solution: What tankd.io provides - comprehensive product info WITHOUT episode outcome spoilers
3. Solo Developer Story: Built by one person who loves Shark Tank and wanted a better way
4. Mission/Vision: Make it easy to find and buy Shark Tank products without ruining your viewing experience
5. What Makes Us Different: Spoiler-free design, real-time business status, comprehensive coverage
6. Personal Touch: This isn't a corporate site, it's a passion project

STRUCTURE - Create 3-4 sections with H2 headings like:
- "The Spoiler Problem" or "Why I Built This"
- "What tankd.io Does Differently"
- "The Mission: Spoiler-Free Shopping"
- "What's Next" or "Future Plans"

STYLE:
- First person ("I") when talking about the founder/development
- Conversational, authentic voice
- Show personality - this is a solo dev passion project
- Be relatable - we all hate spoilers
- Keep it real - acknowledge this is an MVP, not perfect

Return ONLY valid JSON matching this schema:
{
  "introduction": "Personal, engaging opening about the spoiler problem...",
  "sections": [
    { "heading": "Section Title", "content": "Friendly, authentic content..." },
    ...
  ]
}`
  },

  'privacy': {
    type: 'article' as const,
    title: 'Privacy Policy - tankd.io',
    meta_description: 'Privacy policy for tankd.io. Learn how we handle your data, our use of analytics (Plausible and Google Analytics), and affiliate cookies.',
    keywords: [
      'tankd.io privacy policy',
      'privacy policy',
      'data collection',
      'analytics privacy'
    ],
    searchQueries: [
      'privacy policy template analytics affiliate cookies US',
      'Plausible Analytics privacy policy',
      'Google Analytics privacy policy requirements US',
      'Amazon Associates affiliate disclosure privacy FTC'
    ],
    prompt: `Write a clear, readable privacy policy for tankd.io (a Shark Tank product database website FOR US USERS).

IMPORTANT CONTEXT: This is a US-focused site about US Shark Tank with US Amazon affiliate links. Target audience is United States users. DO NOT mention GDPR (that's EU). Focus on US privacy practices and FTC requirements.

REQUIREMENTS - Must cover:
1. State this site is designed for US users
2. What data we collect (minimal - just analytics)
3. Plausible Analytics (privacy-focused, no cookies, no personal tracking)
4. Google Analytics (GA4) - standard analytics tracking with cookies
5. Affiliate cookies (Amazon Associates, ShareASale, etc.) - FTC disclosure
6. No user accounts or personal data collection
7. How we use the data (site improvement, traffic analysis)
8. Third-party services and their privacy policies
9. User rights (mention CCPA for California but note thresholds don't apply)
10. Contact information

TONE: Clear, straightforward, human-readable (not just legal jargon)
- Explain in plain English what each thing does
- Be transparent and honest
- Keep it concise but comprehensive
- Use "we" and "you" language

STRUCTURE - Create 5-7 sections with H2 headings like:
- "Information We Collect"
- "Analytics and Tracking"
- "Affiliate Links and Cookies"
- "How We Use Your Information"
- "Third-Party Services"
- "Your Privacy Rights" (mention CCPA exists but doesn't apply to small sites)
- "Changes to This Policy"
- "Contact Us"

Each section should be 100-200 words, clear and specific.

Return ONLY valid JSON matching this schema:
{
  "introduction": "Brief intro explaining our commitment to privacy and that this is for US users...",
  "sections": [
    { "heading": "Section Title", "content": "Clear explanation..." },
    ...
  ]
}`
  },

  'terms': {
    type: 'article' as const,
    title: 'Terms of Service - tankd.io',
    meta_description: 'Terms of Service for tankd.io. Understand the terms governing use of our site, affiliate links, disclaimers, and limitations.',
    keywords: [
      'tankd.io terms of service',
      'terms of use',
      'website terms',
      'legal terms'
    ],
    searchQueries: [
      'terms of service template affiliate website',
      'website terms of use disclaimer',
      'affiliate disclosure legal requirements',
      'website liability disclaimer'
    ],
    prompt: `Write clear, reasonable Terms of Service for tankd.io (Shark Tank product database with affiliate links).

REQUIREMENTS - Must cover:
1. Acceptance of terms
2. Use of the site (what's allowed, what's not)
3. Affiliate links disclosure (Amazon Associates, etc.)
4. Content accuracy disclaimer (we do our best but can't guarantee 100% accuracy)
5. No warranties - site provided "as is"
6. Limitation of liability
7. Not affiliated with ABC/Sony/Shark Tank officially
8. Product information may change
9. Intellectual property (our content vs. trademarks)
10. Changes to terms
11. Contact information

TONE: Professional but reasonable and clear
- Protect the site legally without being aggressive
- Use plain English where possible
- Be fair and transparent
- Not overly restrictive

STRUCTURE - Create 6-8 sections with H2 headings like:
- "Acceptance of Terms"
- "Use of This Site"
- "Affiliate Links and Disclosure"
- "Content Accuracy and Disclaimers"
- "Limitation of Liability"
- "Intellectual Property"
- "Changes to These Terms"
- "Contact Us"

Each section should be clear and specific (100-250 words).

Return ONLY valid JSON matching this schema:
{
  "introduction": "Brief intro to the terms...",
  "sections": [
    { "heading": "Section Title", "content": "Clear terms content..." },
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

async function getDealsData(slug: PageSlug) {
  // Only fetch deal data for deal filtering pages
  if (!['deals-under-100k', 'deals-100k-to-500k', 'deals-over-500k', 'best-deals'].includes(slug)) {
    return null;
  }

  // Define filters based on page slug
  const filters: {
    dealOutcome: string;
    dealAmountMin?: number;
    dealAmountMax?: number;
    limit: number;
  } = {
    dealOutcome: 'deal',
    limit: 20  // Top 20 deals for each category
  };

  if (slug === 'deals-under-100k') {
    filters.dealAmountMax = 99999;  // Exclusive: < $100K
  } else if (slug === 'deals-100k-to-500k') {
    filters.dealAmountMin = 100000;  // Inclusive: >= $100K
    filters.dealAmountMax = 499999;  // Exclusive: < $500K
  } else if (slug === 'deals-over-500k') {
    filters.dealAmountMin = 500000;  // Inclusive: >= $500K
  }
  // For 'best-deals', no filters (top 20 overall)

  let query = supabase
    .from('products_with_sharks')
    .select(`
      id,
      name,
      company_name,
      deal_amount,
      deal_equity,
      deal_valuation,
      shark_names
    `)
    .eq('deal_outcome', filters.dealOutcome)
    .not('deal_amount', 'is', null)
    .order('deal_amount', { ascending: false });

  if (filters.dealAmountMin) {
    query = query.gte('deal_amount', filters.dealAmountMin);
  }
  if (filters.dealAmountMax) {
    query = query.lte('deal_amount', filters.dealAmountMax);
  }

  query = query.limit(filters.limit);

  const { data, error } = await query;

  if (error || !data) {
    console.error(`Failed to fetch deal data for ${slug}:`, error);
    return null;
  }

  // Format deal data for the prompt
  return data.map(d => ({
    name: d.name || d.company_name,
    amount: d.deal_amount ? `$${d.deal_amount.toLocaleString()}` : 'Unknown',
    equity: d.deal_equity ? `${d.deal_equity}%` : 'Unknown',
    valuation: d.deal_valuation ? `$${d.deal_valuation.toLocaleString()}` : 'Unknown',
    sharks: Array.isArray(d.shark_names) && d.shark_names.length > 0
      ? d.shark_names.join(', ')
      : 'Unknown'
  }));
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
  stats: Awaited<ReturnType<typeof getProductStats>>,
  dealsData: Awaited<ReturnType<typeof getDealsData>>
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

  // Format deals data for the prompt
  const dealsContext = dealsData ? [
    `\n=== ACTUAL DEALS FROM OUR DATABASE ===`,
    `Use ONLY these deals in your content. These are the exact products users will see on the page.`,
    ``,
    JSON.stringify(dealsData, null, 2),
    ``,
    `Write factually about these specific deals. Use exact amounts, shark names, and equity percentages.`,
    `You can reference product names knowing users can click through to see full details.`,
  ].join('\n') : '';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: config.prompt },
        {
          role: 'user',
          content: `Page: ${config.title}\n\nStatistics:\n${statsContext}${dealsContext}\n\nSearch Results:\n${combinedContent}`
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

  // Get deal data (for deal filtering pages)
  console.log('      Fetching deal data...');
  const dealsData = await getDealsData(slug);
  if (dealsData) {
    if (dealsData.length === 0) {
      console.log(`      ⚠️  No deals found in database for ${slug}`);
    } else {
      console.log(`      ✅ Loaded ${dealsData.length} deals from database`);
    }
  }

  // Search
  const searchResults = await searchForPage(slug);

  // Generate
  console.log('      Generating content (gpt-4.1-mini Flex - may take up to 5 min)...');
  const content = await generatePageContent(slug, searchResults, stats, dealsData);

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
