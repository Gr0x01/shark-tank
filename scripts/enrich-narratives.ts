import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { searchTavily, combineSearchResultsCompact, TavilyResponse } from './ingestion/enrichment/shared/tavily-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';
import OpenAI from 'openai';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Narrative content schema
const NarrativeContentSchema = z.object({
  origin_story: z.string().nullable(),
  pitch_journey: z.string().nullable(),
  deal_dynamics: z.string().nullable(),
  after_tank: z.string().nullable(),
  current_status: z.string().nullable(),
  where_to_buy: z.string().nullable(),
});

type NarrativeContent = z.infer<typeof NarrativeContentSchema>;

const NARRATIVE_PROMPT = `You are a Shark Tank expert writer creating SEO-optimized product pages. Generate compelling, factual narrative content about the product.

Write in a journalistic, engaging style. Include specific details, numbers, and quotes when available. Each section should be a complete narrative paragraph (not bullet points).

Return ONLY valid JSON matching this schema:
{
  "origin_story": "150-250 words about the founder's background, what problem they discovered, and how they created their solution. Include their profession, location, and the 'aha moment' that led to the product. Make it personal and relatable. Naturally include the phrase '[Product Name] Shark Tank' somewhere in this section.",

  "pitch_journey": "150-200 words describing the pitch episode. Include the ask amount/equity, which sharks showed interest, key questions asked, memorable moments, and the overall dynamic in the tank. Reference the season and episode if known.",

  "deal_dynamics": "100-150 words about the deal negotiation (or why no deal happened). Include competing offers, counter-offers, and the final terms. For no-deal products, explain what went wrong - was it valuation, the sharks not believing in the product, or something else?",

  "after_tank": "150-200 words about what happened after the episode aired. Include the 'Shark Tank effect' on sales, growth milestones, product expansion, any challenges overcome, and major business developments. Use phrases like 'after Shark Tank' and 'since appearing on Shark Tank' naturally.",

  "current_status": "100-150 words about where the company is today. Include current revenue if known, number of products sold, retail partnerships, and overall business health. Be specific with dates and numbers. Include the phrase 'still in business' if the company is active, or explain closure if not.",

  "where_to_buy": "50-100 words about purchase options. Include official website, Amazon availability, retail store locations (Target, Walmart, etc.), and price range. Focus on helping readers find and buy the product."
}

CRITICAL GUIDELINES:
- Write for SEO: naturally include "[Product Name] Shark Tank", "after Shark Tank", "still in business" phrases
- Be factual: only include information supported by the search results
- Be specific: use actual numbers, dates, and names when available
- For sections with no information, return null (don't fabricate)
- Write in third person, present tense for current status
- Each section should stand alone as a readable paragraph
- NO bullet points - flowing narrative paragraphs only`;

interface ProductForNarrative {
  id: string;
  name: string;
  season: number | null;
  episode_number: number | null;
  deal_outcome: string | null;
  status: string | null;
  asking_amount: number | null;
  asking_equity: number | null;
  deal_amount: number | null;
  deal_equity: number | null;
  founder_names: string[] | null;
}

async function searchForNarrative(productName: string): Promise<{
  details: TavilyResponse;
  status: TavilyResponse;
  afterTank: TavilyResponse;
}> {
  // Run searches in parallel
  const [details, status, afterTank] = await Promise.all([
    searchTavily(`${productName} Shark Tank deal details founders pitch episode`, {
      entityType: 'product',
      entityName: productName,
      ttlDays: 90,
    }),
    searchTavily(`${productName} Shark Tank still in business 2024 2025 where to buy`, {
      entityType: 'product',
      entityName: productName,
      ttlDays: 30,
    }),
    searchTavily(`${productName} after Shark Tank update revenue growth sales success`, {
      entityType: 'product',
      entityName: productName,
      ttlDays: 30,
    }),
  ]);

  return { details, status, afterTank };
}

async function generateNarrative(
  product: ProductForNarrative,
  searchResults: { details: TavilyResponse; status: TavilyResponse; afterTank: TavilyResponse }
): Promise<NarrativeContent | null> {
  const tracker = TokenTracker.getInstance();

  const combinedContent = [
    '=== PITCH & DEAL DETAILS ===',
    combineSearchResultsCompact(searchResults.details.results, 4000),
    '',
    '=== CURRENT STATUS & WHERE TO BUY ===',
    combineSearchResultsCompact(searchResults.status.results, 4000),
    '',
    '=== AFTER SHARK TANK UPDATES ===',
    combineSearchResultsCompact(searchResults.afterTank.results, 4000),
  ].join('\n');

  const productContext = [
    `Product: ${product.name}`,
    product.season ? `Season: ${product.season}` : null,
    product.episode_number ? `Episode: ${product.episode_number}` : null,
    product.deal_outcome ? `Deal Outcome: ${product.deal_outcome}` : null,
    product.status ? `Current Status: ${product.status}` : null,
    product.asking_amount ? `Asking: $${product.asking_amount.toLocaleString()} for ${product.asking_equity}%` : null,
    product.deal_amount ? `Deal: $${product.deal_amount.toLocaleString()} for ${product.deal_equity}%` : null,
    product.founder_names?.length ? `Founders: ${product.founder_names.join(', ')}` : null,
  ].filter(Boolean).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: NARRATIVE_PROMPT },
        { role: 'user', content: `${productContext}\n\nSearch Results:\n${combinedContent}` },
      ],
      max_tokens: 2500,
      temperature: 0.5,
    });

    const text = response.choices[0]?.message?.content || '';

    tracker.trackUsage({
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    });

    // Extract JSON from response - handle markdown code blocks
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
    return NarrativeContentSchema.parse(parsed);
  } catch (error) {
    console.error(`      ❌ Generation failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

async function enrichProductNarrative(
  product: ProductForNarrative,
  dryRun: boolean
): Promise<{ success: boolean; narrative?: NarrativeContent }> {
  console.log(`\n   📝 ${product.name}`);
  console.log(`      Status: ${product.status} | Outcome: ${product.deal_outcome}`);

  // Search
  console.log('      Searching...');
  const searchResults = await searchForNarrative(product.name);

  // Generate
  console.log('      Generating narrative (Flex processing - may take up to 5 min)...');
  const narrative = await generateNarrative(product, searchResults);

  if (!narrative) {
    return { success: false };
  }

  // Log summary
  const sections = Object.entries(narrative).filter(([, v]) => v !== null);
  console.log(`      ✅ Generated ${sections.length}/6 sections`);

  if (dryRun) {
    console.log('\n      --- PREVIEW ---');
    for (const [key, value] of sections) {
      const preview = value ? value.substring(0, 150) + '...' : 'null';
      console.log(`      ${key}: ${preview}`);
    }
    return { success: true, narrative };
  }

  // Save to database
  const { error } = await supabase
    .from('products')
    .update({
      narrative_content: narrative,
      narrative_version: 1,
      narrative_generated_at: new Date().toISOString(),
    })
    .eq('id', product.id);

  if (error) {
    console.error(`      ❌ Save failed: ${error.message}`);
    return { success: false };
  }

  console.log('      💾 Saved to database');
  return { success: true, narrative };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outputJson = args.includes('--json');

  // Get specific products by name
  const productNames: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--product' && args[i + 1]) {
      productNames.push(args[i + 1]);
      i++;
    }
  }

  let limit: number | undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📖 Narrative Content Enrichment');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Model: gpt-4.1-mini (Flex processing)`);
  if (productNames.length) console.log(`   Products: ${productNames.join(', ')}`);
  if (limit) console.log(`   Limit: ${limit}`);
  console.log('━'.repeat(60));

  // Build query
  let query = supabase
    .from('products')
    .select('id, name, season, episode_number, deal_outcome, status, asking_amount, asking_equity, deal_amount, deal_equity, founder_names');

  if (productNames.length > 0) {
    query = query.in('name', productNames);
  } else {
    // Default: get products without narrative content
    query = query.or('narrative_version.is.null,narrative_version.eq.0');
    if (limit) {
      query = query.limit(limit);
    }
  }

  const { data: products, error } = await query;

  if (error) {
    console.error(`❌ Failed to fetch products: ${error.message}`);
    return;
  }

  if (!products || products.length === 0) {
    console.log('\n   No products to process.\n');
    return;
  }

  console.log(`\n   Found ${products.length} products to enrich\n`);

  const tracker = TokenTracker.getInstance();
  const results: { name: string; success: boolean; narrative?: NarrativeContent }[] = [];

  for (const product of products) {
    const result = await enrichProductNarrative(product, dryRun);
    results.push({ name: product.name, ...result });
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Summary');
  console.log('━'.repeat(60));
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Est. Cost: $${tracker.estimateCost().toFixed(4)}`);
  console.log('━'.repeat(60) + '\n');

  // Output JSON if requested
  if (outputJson) {
    const jsonOutput = results.map(r => ({
      name: r.name,
      success: r.success,
      narrative: r.narrative,
    }));
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(jsonOutput, null, 2));
  }
}

main().catch(console.error);
