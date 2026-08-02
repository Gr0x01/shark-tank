/**
 * Render-time token substitution for generated copy.
 *
 * Editorial prose and product metadata are written once but describe a catalogue that
 * keeps growing, so they store tokens instead of literal figures. Baking a number into
 * a sentence means it starts lying the next time a product is added — and the stat tiles
 * beside it, which read live from the database, immediately contradict it.
 *
 * Percentages are derived here rather than stored so they can never disagree with the
 * counts they sit next to.
 */

export interface ContentStats {
  total: number
  active: number
  outOfBusiness: number
  gotDeal: number
  noDeal: number
}

/** Tokens the generator may emit. Anything not listed here is left untouched. */
export const CONTENT_TOKENS = [
  'total',
  'active',
  'closed',
  'deals',
  'noDeals',
  'activePct',
  'closedPct',
  'dealPct',
] as const

const STAT_TOKEN_PATTERN = new RegExp(`\\{(${CONTENT_TOKENS.join('|')})\\}`)

/** True when text cites a catalogue figure, so live stats need fetching. */
export function hasStatTokens(text: string): boolean {
  return STAT_TOKEN_PATTERN.test(text)
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return '0'
  return ((part / whole) * 100).toFixed(1)
}

function buildValues(stats: ContentStats): Record<string, string> {
  return {
    total: stats.total.toLocaleString(),
    active: stats.active.toLocaleString(),
    closed: stats.outOfBusiness.toLocaleString(),
    deals: stats.gotDeal.toLocaleString(),
    noDeals: stats.noDeal.toLocaleString(),
    activePct: percent(stats.active, stats.total),
    closedPct: percent(stats.outOfBusiness, stats.total),
    dealPct: percent(stats.gotDeal, stats.total),
  }
}

/**
 * Replace `{token}` placeholders in generated text.
 *
 * `{year}` always resolves. Stat tokens resolve only when `stats` is supplied; without
 * it they are left in place rather than rendered as a wrong number or an empty gap,
 * which makes a missed wiring obvious in review instead of silently shipping.
 */
export function substituteTokens(text: string, stats?: ContentStats): string {
  let result = text.replace(/\{year\}/g, String(new Date().getFullYear()))

  if (stats) {
    const values = buildValues(stats)
    result = result.replace(/\{(\w+)\}/g, (match, token: string) =>
      token in values ? values[token] : match
    )
  }

  return result
}
