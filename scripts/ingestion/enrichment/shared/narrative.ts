import { z } from 'zod';
import { searchTavily, combineSearchResultsCompact, TavilyResponse } from './tavily-client';
import { synthesize } from './synthesis-client';
import { TokenTracker } from './token-tracker';

// Narrative content schema
export const NarrativeContentSchema = z.object({
  origin_story: z.string().nullable(),
  pitch_journey: z.string().nullable(),
  deal_dynamics: z.string().nullable(),
  after_tank: z.string().nullable(),
  current_status: z.string().nullable(),
  where_to_buy: z.string().nullable(),
});

export type NarrativeContent = z.infer<typeof NarrativeContentSchema>;

export interface ProductForNarrative {
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

export async function searchForNarrative(productName: string): Promise<{
  details: TavilyResponse;
  status: TavilyResponse;
  afterTank: TavilyResponse;
}> {
  const year = new Date().getFullYear();
  const [details, status, afterTank] = await Promise.all([
    searchTavily(`${productName} Shark Tank deal details founders pitch episode`, {
      entityType: 'product',
      entityName: productName,
      ttlDays: 90,
    }),
    searchTavily(`${productName} Shark Tank still in business ${year - 1} ${year} where to buy`, {
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

export async function generateNarrative(
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

  const result = await synthesize(
    NARRATIVE_PROMPT,
    `${productContext}\n\nSearch Results:\n${combinedContent}`,
    NarrativeContentSchema,
    { maxTokens: 2500, temperature: 0.5 },
  );

  if (result.success && result.data) {
    tracker.trackUsage(result.usage);
    return result.data;
  }

  console.error(`      ❌ Narrative generation failed: ${result.error}`);
  return null;
}
