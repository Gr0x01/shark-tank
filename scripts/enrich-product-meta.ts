import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { synthesize, configure } from './ingestion/enrichment/shared/synthesis-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Descriptions state a year only when the source material dates the fact. Rendering a
// current year over research done in an earlier one turned "as of {year}" into a claim
// the underlying narrative never supported.
// The title cap is per-product: a few product names are long enough that a hard 60
// would make the task impossible and burn every retry.
// Normalise curly apostrophes so "O'Leary" and "O’Leary" compare equal.
function normalize(text: string): string {
  return text.replace(/[’']/g, "'").toLowerCase();
}

function mentions(text: string, sharkName: string): boolean {
  return mentionsIn(normalize(text), sharkName);
}

// fullNameOnly guards against false positives when scanning for sharks who were NOT
// part of the deal: a founder surnamed Jones must not read as the shark Peter Jones.
// Surname matching is still right when checking that a real investor got credited.
function mentionsIn(haystack: string, sharkName: string, fullNameOnly = false): boolean {
  const full = normalize(sharkName);
  if (haystack.includes(full)) return true;
  if (fullNameOnly) return false;
  const last = full.split(' ').slice(1).join(' ');
  return last.length > 3 && new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack);
}

// Shark attribution is the one fact the model reliably gets wrong when the narrative
// text emphasises one investor, so it's enforced here rather than left to the prompt —
// a failure here makes synthesize() retry.
function metaSchema(titleMax: number, dealSharks: string[], allSharks: string[]) {
  return z.object({
    seo_title: z.string().min(15).max(titleMax),
    meta_description: z.string().min(110).max(158),
  }).superRefine((value, ctx) => {
    const text = `${value.seo_title} ${value.meta_description}`;

    const named = dealSharks.filter((s) => mentions(text, s));
    if (named.length > 0 && named.length < dealSharks.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Names only ${named.join(', ')} but the deal was with ${dealSharks.join(' and ')} — name all of them or none`,
      });
    }

    // Only enforceable when we actually know who invested. Plenty of products have no
    // shark linked — deals that fell through, and some genuine gaps — and there the
    // background text is the only source, so blocking every shark mention is wrong.
    if (dealSharks.length === 0) return;

    // Compare normalised: the same shark is spelled "O'Leary" in one table and
    // "O’Leary" in the other, and a raw includes() reads that as a different person.
    const dealSet = new Set(dealSharks.map(normalize));

    // Blank out the real investors before looking for anyone else, so a shark record
    // holding only a first name ("Daniel") doesn't match inside "Daniel Lubetzky".
    let remaining = normalize(text);
    for (const investor of dealSharks) {
      remaining = remaining.split(normalize(investor)).join(' ');
    }

    const wrong = allSharks.filter((s) => !dealSet.has(normalize(s)) && mentionsIn(remaining, s, true));
    if (wrong.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Credits ${wrong.join(', ')}, who did not invest in this product`,
      });
    }
  });
}

type ProductMeta = z.infer<ReturnType<typeof metaSchema>>;

// Overridable via --title-max for the handful of products where 60 characters can't
// hold the name plus anything worth saying.
let titleFloor = 60;

function titleCapFor(name: string): number {
  return Math.max(titleFloor, name.length + 20);
}

const META_PROMPT = `You write search-result copy for tankd.io, a database of every Shark Tank product. For one product you produce a page title and a meta description that make someone click.

Return ONLY valid JSON:
{
  "seo_title": "50-60 characters. Must contain the product name and the words 'Shark Tank'. Lead with the product name.",
  "meta_description": "145-158 characters. One or two sentences that answer what someone Googling this product actually wants to know."
}

WHAT MAKES THESE GOOD:
- Use a SPECIFIC fact from the source material — a revenue figure, a retailer, the founder's name, the shark who invested, what the company sells now, why it closed. The specific detail is the whole point; a description that would fit any other product is a failure.
- Answer the searcher's real question. For an active company: is it still around, and where do I buy it? For a closed one: what went wrong? For a no-deal company: did they make it anyway?
- Vary your sentence structure. Do not open every description the same way, and do not use a fixed formula.
- Write plainly and concretely. No hype words ("amazing", "incredible", "game-changing"), no marketing filler, no exclamation marks.

HARD RULES:
- Use ONLY facts given in the source material. Never invent revenue, dates, retailers, or outcomes. If the material is thin, write something accurate and modest rather than padding with invention.
- Shark attribution must be exact. If several sharks invested, name them all or write "the sharks" — never credit one shark for a deal that several made. If no shark is listed, do not name one.
- When investors are listed below, name only those sharks — never name another shark, not even to say they passed or made an offer. When NO investor is listed, you may name a shark the background text names, but describe what actually happened: an offer that fell through is not an investment, and "no deal" means nobody invested.
- The source material may be cut off mid-sentence. Stop at what it actually says; never finish the thought from your own knowledge.
- Never claim a fact is current "as of" a year the source material does not support. Use a year only when the source material states it (an air date, a closure year, the year a revenue figure was reported). Prefer describing what is true without dating it at all.
- The title must not exceed 60 characters. The description must not exceed 158 characters. Count carefully.
- Do not end the title with the site name — that is added elsewhere.`;

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  pitch_summary: string | null;
  description: string | null;
  season: number | null;
  episode_number: number | null;
  deal_outcome: string | null;
  status: string | null;
  asking_amount: number | null;
  asking_equity: number | null;
  deal_amount: number | null;
  deal_equity: number | null;
  founder_names: string[] | null;
  annual_revenue: number | null;
  lifetime_revenue: number | null;
  revenue_estimate: string | null;
  amazon_url: string | null;
  website_url: string | null;
  narrative_content: Record<string, string | null> | null;
  shark_names?: string[] | null;
}

// Cut at a sentence boundary — a sentence chopped mid-clause invites the model to
// finish it from memory, which is how invented facts get in.
function trimToSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastStop = cut.lastIndexOf('. ');
  return lastStop > max * 0.4 ? cut.slice(0, lastStop + 1) : cut;
}

function money(n: number | null): string {
  if (!n) return '';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function buildContext(product: ProductRow, sharkNames: string[]): string {
  const n = product.narrative_content || {};

  return [
    `Product: ${product.name}`,
    product.tagline ? `Tagline: ${product.tagline}` : null,
    product.pitch_summary ? `Pitch: ${product.pitch_summary}` : null,
    product.description && !product.pitch_summary ? `Description: ${product.description}` : null,
    product.season ? `Season ${product.season}${product.episode_number ? `, Episode ${product.episode_number}` : ''}` : null,
    product.founder_names?.length ? `Founders: ${product.founder_names.join(', ')}` : null,
    `Deal outcome: ${product.deal_outcome || 'unknown'}`,
    product.asking_amount ? `Asked for ${money(product.asking_amount)} for ${product.asking_equity}%` : null,
    product.deal_amount ? `Deal: ${money(product.deal_amount)} for ${product.deal_equity}%` : null,
    sharks(sharkNames),
    `Business status: ${product.status || 'unknown'}`,
    product.annual_revenue ? `Annual revenue: ${money(product.annual_revenue)}` : null,
    product.lifetime_revenue ? `Lifetime revenue: ${money(product.lifetime_revenue)}` : null,
    product.revenue_estimate ? `Revenue estimate: ${product.revenue_estimate}` : null,
    product.amazon_url ? 'Sold on Amazon: yes' : null,
    product.website_url ? 'Has an official website: yes' : null,
    '',
    'Background:',
    // The narrative is the richest source of specifics; trimmed to keep the prompt cheap.
    n.origin_story ? `Origin: ${trimToSentence(n.origin_story, 600)}` : null,
    n.after_tank ? `After the show: ${trimToSentence(n.after_tank, 700)}` : null,
    n.current_status ? `Today: ${trimToSentence(n.current_status, 800)}` : null,
    n.where_to_buy ? `Where to buy: ${trimToSentence(n.where_to_buy, 500)}` : null,
  ].filter(Boolean).join('\n');
}

function sharks(names: string[]): string | null {
  if (!names.length) return 'No shark is recorded as an investor in this product.';
  if (names.length === 1) return `Shark who invested: ${names[0]}`;
  // Narratives often dwell on one investor, so spell out the requirement here as well
  // as in the system prompt — this is the fact the model most often gets wrong.
  return `Sharks who invested: ${names.join(' AND ')} — this was a joint deal. If you name any shark you must name all ${names.length}, or write "the sharks" instead.`;
}

async function generateMeta(
  product: ProductRow,
  sharkNames: string[],
  allSharks: string[]
): Promise<ProductMeta | null> {
  const titleMax = titleCapFor(product.name);

  // Spell out the arithmetic — the model overshoots the title budget far less often
  // when it is told how many characters the name already costs.
  const budget = `\n\nTITLE BUDGET for this product: the title must not exceed ${titleMax} characters. "${product.name}" is ${product.name.length} characters, and " Shark Tank" costs another 11, so you have about ${Math.max(8, titleMax - product.name.length - 11)} characters left for the rest. Count before you answer, and prefer a short hook over a clever long one.`;

  const result = await synthesize(
    `${META_PROMPT}${budget}`,
    buildContext(product, sharkNames),
    metaSchema(titleMax, sharkNames, allSharks),
    // Generous retries: hitting the character budget is fiddly and each attempt is
    // a fraction of a cent, so it's cheaper to retry than to hand-fix the misses.
    { maxTokens: 400, temperature: 0.8, retries: 8 }
  );

  if (result.success && result.data) {
    TokenTracker.getInstance().trackUsage(result.usage);
    return result.data;
  }

  console.error(`      ❌ Failed: ${result.error}`);
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  let limit: number | undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1], 10);
  }

  const titleMaxIndex = args.indexOf('--title-max');
  if (titleMaxIndex >= 0 && args[titleMaxIndex + 1]) {
    titleFloor = parseInt(args[titleMaxIndex + 1], 10);
  }

  let concurrency = 5;
  const concurrencyIndex = args.indexOf('--concurrency');
  if (concurrencyIndex >= 0 && args[concurrencyIndex + 1]) {
    concurrency = parseInt(args[concurrencyIndex + 1], 10);
  }

  const slugs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug' && args[i + 1]) {
      slugs.push(args[i + 1]);
      i++;
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('🏷️  Product Meta Enrichment (titles + descriptions)');
  console.log('━'.repeat(60));
  console.log(`   Dry run: ${dryRun ? 'Yes' : 'No'}`);
  console.log(`   Model: gpt-4.1-mini (Flex processing)`);
  if (slugs.length) console.log(`   Slugs: ${slugs.join(', ')}`);
  if (limit) console.log(`   Limit: ${limit}`);
  console.log('━'.repeat(60));

  configure({ model: 'gpt-4.1-mini' });

  let query = supabase
    .from('products_with_sharks')
    .select(
      'id, name, slug, tagline, pitch_summary, description, season, episode_number, deal_outcome, status, asking_amount, asking_equity, deal_amount, deal_equity, founder_names, annual_revenue, lifetime_revenue, revenue_estimate, amazon_url, website_url, narrative_content, narrative_version, shark_names'
    )
    .order('name');

  if (slugs.length > 0) {
    query = query.in('slug', slugs);
  } else {
    if (!force) {
      query = query.or('seo_title.is.null,meta_description.is.null');
      // Skip products whose narrative hasn't been generated yet. A product created by a
      // backfill lands with narrative_content = {} and narrative_version = 0 before its
      // narrative arrives — note {} is NOT null, so a null check does not catch this.
      // Without the guard, running mid-backfill writes thin copy from the structured
      // fields alone, and the product then has meta, so this script skips it forever
      // after. Re-runnable by design: run it again once narratives finish.
      query = query.gt('narrative_version', 0);
    }
    if (limit) query = query.limit(limit);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error(`❌ Failed to fetch products: ${error.message}`);
    process.exit(1);
  }

  // Products deliberately held back by the narrative guard. Reported so a run that looks
  // complete isn't mistaken for one — these need a re-run once their narratives land.
  const { count: awaitingNarrative } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .or('seo_title.is.null,meta_description.is.null')
    .eq('narrative_version', 0);

  if (!products || products.length === 0) {
    console.log('\n   No products to process.\n');
    if (awaitingNarrative) {
      console.log(`   ⏳ ${awaitingNarrative} waiting on their narrative — re-run after enrichment.\n`);
    }
    return;
  }

  console.log(`\n   Found ${products.length} products`);
  if (awaitingNarrative) {
    console.log(`   ⏳ Skipping ${awaitingNarrative} whose narrative hasn't generated yet — re-run later.`);
  }
  console.log('');

  const { data: sharkRows } = await supabase.from('sharks').select('name');
  const allSharks = (sharkRows || []).map((s: { name: string }) => s.name);

  let succeeded = 0;
  let failed = 0;
  let done = 0;
  const overLength: string[] = [];
  const failures: string[] = [];

  const rows = products as ProductRow[];
  let cursor = 0;

  async function processOne(product: ProductRow): Promise<void> {
    const meta = await generateMeta(product, product.shark_names || [], allSharks);
    done++;

    if (!meta) {
      failed++;
      failures.push(product.slug);
      console.log(`   [${done}/${rows.length}] ❌ ${product.name}`);
      return;
    }

    const titleLen = meta.seo_title.length;
    const descLen = meta.meta_description.length;

    if (titleLen > titleCapFor(product.name) || descLen > 158) {
      overLength.push(`${product.slug} (title ${titleLen}, desc ${descLen})`);
    }

    if (!dryRun) {
      const { error: saveError } = await supabase
        .from('products')
        .update({ seo_title: meta.seo_title, meta_description: meta.meta_description })
        .eq('id', product.id);

      if (saveError) {
        console.error(`   [${done}/${rows.length}] ❌ ${product.name}: ${saveError.message}`);
        failed++;
        failures.push(product.slug);
        return;
      }
    }

    succeeded++;
    console.log(`   [${done}/${rows.length}] ${product.name}`);
    console.log(`      T(${titleLen}): ${meta.seo_title}`);
    console.log(`      D(${descLen}): ${meta.meta_description}`);
  }

  async function worker(): Promise<void> {
    while (cursor < rows.length) {
      const product = rows[cursor++];
      await processOne(product);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker));

  const tracker = TokenTracker.getInstance();

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Summary');
  console.log('━'.repeat(60));
  console.log(`   Successful: ${succeeded}`);
  console.log(`   Failed: ${failed}`);
  if (overLength.length) {
    console.log(`   Over ideal length (${overLength.length}): ${overLength.slice(0, 10).join('; ')}`);
  }
  if (failures.length) {
    console.log(`   Failed slugs: ${failures.join(' ')}`);
  }
  console.log(`   Est. Cost: $${tracker.estimateCost().toFixed(4)}`);
  console.log('━'.repeat(60) + '\n');
}

main().catch(console.error);
