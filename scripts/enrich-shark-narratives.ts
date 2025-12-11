/**
 * Shark Narrative Enrichment Script
 *
 * Generates rich editorial content for shark pages using web research + LLM synthesis.
 *
 * Usage:
 *   npx tsx scripts/enrich-shark-narratives.ts --shark "Mark Cuban"
 *   npx tsx scripts/enrich-shark-narratives.ts --limit 5
 *   npx tsx scripts/enrich-shark-narratives.ts --all
 *   npx tsx scripts/enrich-shark-narratives.ts --dry-run
 */

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
  apiKey: process.env.OPENAI_API_KEY!,
});

// Narrative structure schema
const SharkNarrativeSchema = z.object({
  biography: z.string().describe('Rich biography covering early life, background, path to success. 250-400 words. Engaging storytelling style.'),
  investment_philosophy: z.string().describe('Their investment approach, what they look for in businesses, key criteria. 200-300 words. Focus on insights not visible in stats.'),
  shark_tank_journey: z.string().describe('How they joined Shark Tank, evolution on the show, memorable moments. 200-300 words. Tell the story of their time on the show.'),
  notable_deals: z.string().describe('Highlight 2-3 key investments with stories behind them - why they invested, what happened. 250-350 words. Stories not stats.'),
  beyond_the_tank: z.string().describe('Current ventures, other business activities, media presence. 150-250 words. What they do beyond Shark Tank.')
});

type SharkNarrative = z.infer<typeof SharkNarrativeSchema>;

interface Shark {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  investment_style: string | null;
  narrative_content: Record<string, string> | null;
  narrative_version: number | null;
}

async function enrichSharkNarrative(shark: Shark, dryRun: boolean = false): Promise<SharkNarrative | null> {
  const tracker = TokenTracker.getInstance();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Enriching: ${shark.name}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Web search for research (parallel for speed)
  console.log('🔍 Searching for shark information...');

  let bio: TavilyResponse, philosophy: TavilyResponse, deals: TavilyResponse, ventures: TavilyResponse;
  try {
    [bio, philosophy, deals, ventures] = await Promise.all([
      searchTavily(`${shark.name} biography early life background career`, {
        entityType: 'shark',
        entityName: shark.name,
        maxResults: 5,
      }),
      searchTavily(`${shark.name} Shark Tank investment philosophy strategy approach`, {
        entityType: 'shark',
        entityName: shark.name,
        maxResults: 5,
      }),
      searchTavily(`${shark.name} Shark Tank best deals notable investments success stories`, {
        entityType: 'shark',
        entityName: shark.name,
        maxResults: 5,
      }),
      searchTavily(`${shark.name} business ventures companies current projects`, {
        entityType: 'shark',
        entityName: shark.name,
        maxResults: 5,
      }),
    ]);
  } catch (error) {
    console.error('❌ Search failed:', error);
    return null;
  }

  const allResults = [
    ...bio.results.map(r => r.content),
    ...philosophy.results.map(r => r.content),
    ...deals.results.map(r => r.content),
    ...ventures.results.map(r => r.content),
  ];

  if (allResults.length === 0) {
    console.error('❌ No research results found');
    return null;
  }

  console.log(`✓ Found ${allResults.length} research sources`);

  // 2. Synthesize narrative using OpenAI
  console.log('🤖 Generating narrative content...');

  const systemPrompt = `You are a skilled editorial writer creating rich, engaging content for shark investor profile pages.

Your writing should:
- Tell stories and provide context, not just list facts
- Be engaging and editorial in style, like a magazine profile
- Focus on insights and narratives that complement (not repeat) the stats already on the page
- Use specific examples and anecdotes
- Be well-structured with natural paragraph breaks
- Avoid overly promotional or superlative language ("legendary," "amazing," etc.)

The page already displays these stats prominently:
- Total deals count
- Total invested amount
- Active companies count
- Success rate percentage
- Co-investor relationships
- Portfolio breakdown by category/status

Your narratives should provide the human stories, context, and insights BEHIND those numbers.

Return ONLY valid JSON matching the requested schema. No markdown, no explanations, just the JSON object.`;

  const userPrompt = `Create rich editorial narrative content for ${shark.name}'s Shark Tank profile page.

Current basic info:
- Bio: ${shark.bio || 'None'}
- Investment Style: ${shark.investment_style || 'Not specified'}

Research sources:
${allResults.join('\n\n---\n\n')}

Generate 5 narrative sections:

1. **biography** (250-400 words)
   - Early life, background, path to business success
   - Tell the story of how they became who they are
   - Focus on formative experiences and key turning points

2. **investment_philosophy** (200-300 words)
   - What they look for in investments
   - Their approach and criteria
   - What makes them say yes or no
   - Provide insights not visible in the stats

3. **shark_tank_journey** (200-300 words)
   - How and when they joined Shark Tank
   - Their evolution on the show
   - Memorable moments or shifts in approach
   - Their role in the "tank dynamic"

4. **notable_deals** (250-350 words)
   - Tell the STORIES behind 2-3 key investments
   - Why they invested, what they saw
   - What happened with those companies
   - Use specific examples with context, not just stats

5. **beyond_the_tank** (150-250 words)
   - Current business ventures
   - Other media/book/speaking activities
   - What they're focused on now
   - Their broader impact

Write in a clean editorial magazine style. Use natural paragraph breaks. Be specific and engaging.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.5,
    });

    const text = response.choices[0]?.message?.content || '';

    // Track token usage
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
    }

    const parsed = JSON.parse(jsonText);
    const validated = SharkNarrativeSchema.parse(parsed);

    console.log('\n✓ Generated narrative content:');
    console.log(`  - Biography: ${validated.biography.length} chars`);
    console.log(`  - Investment Philosophy: ${validated.investment_philosophy.length} chars`);
    console.log(`  - Shark Tank Journey: ${validated.shark_tank_journey.length} chars`);
    console.log(`  - Notable Deals: ${validated.notable_deals.length} chars`);
    console.log(`  - Beyond the Tank: ${validated.beyond_the_tank.length} chars`);

    // 3. Save to database
    if (!dryRun) {
      console.log('\n💾 Saving to database...');
      const { error } = await supabase
        .from('sharks')
        .update({
          narrative_content: validated,
          narrative_version: 1,
          narrative_generated_at: new Date().toISOString(),
        })
        .eq('id', shark.id);

      if (error) {
        console.error('❌ Database error:', error);
        return null;
      }

      console.log('✓ Saved to database');
    } else {
      console.log('\n[DRY RUN] Would save to database');
    }

    return validated;
  } catch (error) {
    console.error('❌ Synthesis failed:', error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flags = {
    shark: args.find(a => a.startsWith('--shark='))?.split('=')[1] ||
           (args.includes('--shark') ? args[args.indexOf('--shark') + 1] : null),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ||
           (args.includes('--limit') ? args[args.indexOf('--limit') + 1] : '0')),
    all: args.includes('--all'),
    dryRun: args.includes('--dry-run'),
  };

  console.log('🦈 Shark Narrative Enrichment');
  console.log('============================\n');

  // Fetch sharks to enrich
  let query = supabase
    .from('sharks')
    .select('id, name, slug, bio, investment_style, narrative_content, narrative_version')
    .order('name');

  if (flags.shark) {
    query = query.or(`name.ilike.%${flags.shark}%,slug.eq.${flags.shark}`);
  } else if (!flags.all) {
    // Default: only sharks without narratives
    query = query.or('narrative_version.is.null,narrative_version.eq.0');
  }

  if (flags.limit > 0) {
    query = query.limit(flags.limit);
  }

  const { data: sharks, error } = await query;

  if (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }

  if (!sharks || sharks.length === 0) {
    console.log('No sharks found matching criteria.');
    process.exit(0);
  }

  console.log(`Found ${sharks.length} shark(s) to enrich`);
  if (flags.dryRun) {
    console.log('🧪 DRY RUN MODE - no database writes\n');
  }

  // Process each shark
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < sharks.length; i++) {
    const shark = sharks[i] as Shark;
    const result = await enrichSharkNarrative(shark, flags.dryRun);

    if (result) {
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting between sharks
    if (i < sharks.length - 1) {
      console.log('\n⏳ Waiting 2s before next shark...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  const tracker = TokenTracker.getInstance();
  const totalUsage = tracker.getTotalUsage();
  console.log('\n' + '='.repeat(60));
  console.log('📊 Enrichment Summary');
  console.log('='.repeat(60));
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Total: ${sharks.length}`);
  console.log(`\n💰 Token Usage:`);
  console.log(`   Total Tokens: ${totalUsage.total.toLocaleString()}`);
  console.log(`   Est. Cost: $${tracker.estimateCost().toFixed(4)}`);
}

main().catch(console.error);
